import logging
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import insert, select, and_, func, update
from sqlalchemy.ext.asyncio import AsyncEngine

from app.models import StateUpdateEvent
from app.persistence.tables import event, event_spot, spot, parking_lot, user, has_access

import asyncio
import base64
import boto3
from app.settings import settings

logger = logging.getLogger(__name__)


class Persistence:
    def __init__(self, engine: AsyncEngine):
        self.engine = engine

    async def _upload_snapshot_to_s3(self, event_id: int, snapshot_b64: str) -> str | None:
        """Uploads base64 snapshot to S3, returns the S3 key or None if it fails."""
        try:
            loop = asyncio.get_running_loop()
            image_bytes = base64.b64decode(snapshot_b64)
            s3_key = f"events/{event_id}/photo.jpg"

            s3 = boto3.client(
                "s3",
                region_name=settings.aws_default_region,
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
            )

            await loop.run_in_executor(
                None,
                lambda: s3.put_object(
                    Bucket=settings.s3_bucket_name,
                    Key=s3_key,
                    Body=image_bytes,
                    ContentType="image/jpeg",
                )
            )
            logger.info(f"Uploaded snapshot to S3: {s3_key}")
            return s3_key

        except Exception as e:
            logger.error(f"Failed to upload snapshot to S3: {e}")
            return None

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
                        image_url=None,  # we insert it as None at first and then update it after the s3 upload so if it fails, the event row still gets saved to the db
                    ).returning(event.c.id)
                )
                event_id = result.scalar_one()

                # Upload snapshot to S3 and update image_url
                image_url = None
                if state_update.snapshot:
                    image_url = await self._upload_snapshot_to_s3(event_id, state_update.snapshot)
                    if image_url:
                        await conn.execute(
                            event.update()
                            .where(event.c.id == event_id)
                            .values(image_url=image_url)
                        )

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
        state = {spot_id: -1 for spot_id in spot_ids}  # -1 for the spots with no data

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
        
    async def add_user(self, email: str, hashed_password: str, name: str) -> int | None:
        """Adds a new user to the database. Returns the new user ID or None if it fails."""
        try:
            async with self.engine.begin() as conn:
                result = await conn.execute(
                    insert(user).values(
                        email=email,
                        hashed_password=hashed_password,
                        name=name
                    ).returning(user.c.id)
                )
                user_id = result.scalar_one()
                return user_id
        except Exception as e:
            logger.error(f"Failed to add user: {e}")
            return None
        
    async def get_user_by_email(self, email: str) -> dict | None:
        """Fetches a user by email. Returns a dict with user data or None if not found."""
        try:
            async with self.engine.connect() as conn:
                result = await conn.execute(
                    select(user).where(user.c.email == email)
                )
                row = result.mappings().first()
                return dict(row) if row else None
        except Exception as e:
            logger.error(f"Failed to get user by email: {e}")
            return None