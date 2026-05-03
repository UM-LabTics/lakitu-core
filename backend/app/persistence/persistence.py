import logging
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import insert, select, and_, func
from sqlalchemy.ext.asyncio import AsyncEngine

from app.models import StateUpdateEvent
from app.persistence.tables import event, event_spot, spot, parking_lot

logger = logging.getLogger(__name__)


class Persistence:
    def __init__(self, engine: AsyncEngine):
        self.engine = engine

    async def save_event(self, state_update: StateUpdateEvent) -> int | None:
        """
        Saves a state update event to PostgreSQL.
        Only saves the spots that changed (as received from the Pi).
        Returns the new event id, or None if it failed.
        S3 image upload will be added later.
        """
        try:
            async with self.engine.begin() as conn: # opens a db connection and starts a transaction
                # Insert the event row
                result = await conn.execute(
                    insert(event).values(
                        timestamp=state_update.timestamp.astimezone(timezone.utc),
                        free_spots=state_update.free_spots,
                        image_url=None,  # S3 comes later
                    ).returning(event.c.id)
                )
                event_id = result.scalar_one()

                # Insert one event_spot row per spot that changed
                await conn.execute(
                    insert(event_spot),
                    [
                        {
                            "event_id": event_id,
                            "spot_id": s.spot_id,
                            "parking_id": state_update.parking_id,
                            "new_state": s.status,
                        }
                        for s in state_update.spots
                    ]
                )

                logger.info(f"Saved event {event_id} for parking {state_update.parking_id}")
                return event_id

        except Exception as e:
            logger.error(f"Failed to save event: {e}")
            return None

    async def _get_spot_ids(self, conn, parking_id: str) -> list[str]:
        """Returns all spot IDs for a parking lot."""
        rows = await conn.execute(
            select(spot.c.id).where(spot.c.parking_id == parking_id)
        )
        return [r[0] for r in rows]

    async def _get_state_at(self, conn, parking_id: str, moment: datetime) -> dict[str, int]:
        """
        For each spot in the parking lot, finds its most recent state
        at or before the given moment. Returns a dict of {spot_id: status}.
        Spots with no record before the moment are assumed free (0).
        """
        spot_ids = await self._get_spot_ids(conn, parking_id)
        state = {spot_id: 0 for spot_id in spot_ids}  # default all free

        for spot_id in spot_ids:
            # Find the most recent event_spot for this spot at or before moment
            row = await conn.execute(
                select(event_spot.c.new_state)
                .join(event, event.c.id == event_spot.c.event_id)
                .where(
                    and_(
                        event_spot.c.spot_id == spot_id,
                        event_spot.c.parking_id == parking_id,
                        event.c.timestamp <= moment,
                    )
                )
                .order_by(event.c.timestamp.desc())
                .limit(1)
            )
            result = row.scalar_one_or_none()
            if result is not None:
                state[spot_id] = result

        return state

    def _build_state_snapshot(
        self,
        parking_id: str,
        timestamp: datetime,
        free_spots: int,
        image_url: Optional[str],
        state: dict[str, int],
    ) -> dict:
        """Builds the response dict for a single state snapshot."""
        return {
            "pi_timestamp": timestamp.isoformat(),
            "free_spots": free_spots,
            "image_url": image_url,
            "spots": [
                {"spot_id": spot_id, "status": status}
                for spot_id, status in state.items()
            ],
        }

    async def get_state_at(
        self,
        parking_id: str,
        moment: datetime,
    ) -> dict:
        """
        Returns the full reconstructed state of the parking lot
        at a single moment in time.
        """
        try:
            async with self.engine.connect() as conn:
                state = await self._get_state_at(conn, parking_id, moment)
                free = sum(1 for s in state.values() if s == 0)
                return self._build_state_snapshot(
                    parking_id=parking_id,
                    timestamp=moment,
                    free_spots=free,
                    image_url=None,
                    state=state,
                )
        except Exception as e:
            logger.error(f"Failed to get state at {moment}: {e}")
            return {}

    async def get_states_between(
        self,
        parking_id: str,
        from_dt: datetime,
        to_dt: datetime,
        limit: int = 20,
        page: int = 1,
    ) -> dict:
        """
        Returns the reconstructed full state of the parking lot
        at each event timestamp between from_dt and to_dt.
        Starts from the base state at from_dt and applies changes forward.
        """
        offset = (page - 1) * limit

        try:
            async with self.engine.connect() as conn:
                # Step 1: get base state at from_dt
                running_state = await self._get_state_at(conn, parking_id, from_dt)

                # Step 2: get all events in range
                event_rows = await conn.execute(
                    select(event)
                    .join(event_spot, event.c.id == event_spot.c.event_id)
                    .where(
                        and_(
                            event_spot.c.parking_id == parking_id,
                            event.c.timestamp >= from_dt,
                            event.c.timestamp <= to_dt,
                        )
                    )
                    .distinct()
                    .order_by(event.c.timestamp.asc())
                )
                all_events = event_rows.mappings().all()
                total = len(all_events)

                # Step 3: paginate
                paginated_events = all_events[offset: offset + limit]

                # Step 4: for each event, apply its changes and build snapshot
                snapshots = []
                for ev in paginated_events:
                    # Get what changed in this event
                    changed_rows = await conn.execute(
                        select(event_spot.c.spot_id, event_spot.c.new_state)
                        .where(
                            and_(
                                event_spot.c.event_id == ev["id"],
                                event_spot.c.parking_id == parking_id,
                            )
                        )
                    )
                    changes = changed_rows.mappings().all()

                    # Apply changes to running state
                    for change in changes:
                        running_state[change["spot_id"]] = change["new_state"]

                    free = sum(1 for s in running_state.values() if s == 0)

                    snapshots.append(
                        self._build_state_snapshot(
                            parking_id=parking_id,
                            timestamp=ev["timestamp"],
                            free_spots=free,
                            image_url=ev["image_url"],
                            state=dict(running_state),
                        )
                    )

                return {"total_states": total, "states": snapshots}

        except Exception as e:
            logger.error(f"Failed to get states between {from_dt} and {to_dt}: {e}")
            return {"total_states": 0, "states": []}