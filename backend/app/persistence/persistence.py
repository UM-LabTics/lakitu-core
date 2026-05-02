import logging
from datetime import date, datetime, timezone

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

    async def get_events(
        self,
        parking_id: str,
        from_date: date,
        to_date: date,
        limit: int = 20,
        page: int = 1,
    ) -> dict:
        """
        Returns historical events between from_date and to_date for a parking lot.
        Joins through event_spot to filter by parking_id.
        """
        from_dt = datetime(from_date.year, from_date.month, from_date.day, tzinfo=timezone.utc)
        to_dt = datetime(to_date.year, to_date.month, to_date.day, 23, 59, 59, tzinfo=timezone.utc)
        offset = (page - 1) * limit

        try:
            async with self.engine.connect() as conn:
                # We filter by parking_id through event_spot
                # First get the event ids that belong to this parking lot
                # within the date range
                event_ids_query = (
                    select(event.c.id)
                    .join(event_spot, event.c.id == event_spot.c.event_id)
                    .where(
                        and_(
                            event_spot.c.parking_id == parking_id,
                            event.c.timestamp >= from_dt,
                            event.c.timestamp <= to_dt,
                        )
                    )
                    .distinct()
                )

                # Count total matching events
                count_result = await conn.execute(
                    select(func.count()).select_from(
                        event_ids_query.subquery()
                    )
                )
                total = count_result.scalar_one()

                # Fetch the paginated events
                rows = await conn.execute(
                    select(event)
                    .where(event.c.id.in_(event_ids_query))
                    .order_by(event.c.timestamp.desc())
                    .limit(limit)
                    .offset(offset)
                )
                events_rows = rows.mappings().all()

                # For each event, fetch its spots
                result = []
                for ev in events_rows:
                    spots_rows = await conn.execute(
                        select(event_spot.c.spot_id, event_spot.c.new_state)
                        .where(event_spot.c.event_id == ev["id"])
                    )
                    spots_data = spots_rows.mappings().all()
                    result.append({
                        "id": ev["id"],
                        "pi_timestamp": ev["timestamp"].isoformat(),
                        "free_spots": ev["free_spots"],
                        "image_url": ev["image_url"],
                        "spots": [
                            {"spot_id": s["spot_id"], "status": s["new_state"]}
                            for s in spots_data
                        ],
                    })

                return {"total_events": total, "events": result}

        except Exception as e:
            logger.error(f"Failed to get events: {e}")
            return {"total_events": 0, "events": []}