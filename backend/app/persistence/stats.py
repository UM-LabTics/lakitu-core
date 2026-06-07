import logging
from datetime import date, datetime, timezone, time

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncEngine

from app.persistence.tables import event, event_spot, spot, parking_lot

logger = logging.getLogger(__name__)


class Stats:
    def __init__(self, engine: AsyncEngine):
        self.engine = engine

    async def get_daily_occupancy(
        self,
        parking_id: str,
        day: date,
    ) -> dict:
        """
        Given a parking_id and a day, returns:
        - occupancy: dict of {"HH:MM:SS": occupied_count, ...}
        - parking_size: total number of spots in the parking lot
        
        The first entry is always "00:00:00" with the base state at midnight.
        Each subsequent entry corresponds to an event that changed the occupancy.
        """
        try:
            # Define the day boundaries in UTC
            day_start = datetime.combine(day, time.min).replace(tzinfo=timezone.utc)
            day_end = datetime.combine(day, time.max).replace(tzinfo=timezone.utc)

            async with self.engine.connect() as conn:
                # Get parking size
                size_result = await conn.execute(
                    select(parking_lot.c.total_spots)
                    .where(parking_lot.c.id == parking_id)
                )
                parking_size = size_result.scalar_one_or_none()
                if parking_size is None:
                    logger.error(f"Parking lot {parking_id} not found")
                    return {"occupancy": {}, "parking_size": 0}

                # Get base state at midnight (start of day)
                # For each spot, find the most recent event_spot before day_start
                spot_ids_result = await conn.execute(
                    select(spot.c.id).where(spot.c.parking_id == parking_id)
                )
                spot_ids = [r[0] for r in spot_ids_result]

                # Build base state at midnight
                base_state: dict[str, int] = {}
                for spot_id in spot_ids:
                    row = await conn.execute(
                        select(event_spot.c.new_state)
                        .join(event, event.c.id == event_spot.c.event_id)
                        .where(
                            and_(
                                event_spot.c.spot_id == spot_id,
                                event_spot.c.parking_id == parking_id,
                                event.c.timestamp <= day_start,
                            )
                        )
                        .order_by(event.c.timestamp.desc())
                        .limit(1)
                    )
                    result = row.scalar_one_or_none()
                    base_state[spot_id] = result if result is not None else 0

                # Build occupancy dict starting with midnight base state
                running_state = dict(base_state)
                occupied_at_midnight = sum(1 for s in running_state.values() if s == 1)
                occupancy = {"00:00:00": occupied_at_midnight}

                # Get all events during the day ordered by timestamp
                events_result = await conn.execute(
                    select(event)
                    .join(event_spot, event.c.id == event_spot.c.event_id)
                    .where(
                        and_(
                            event_spot.c.parking_id == parking_id,
                            event.c.timestamp >= day_start,
                            event.c.timestamp <= day_end,
                        )
                    )
                    .distinct()
                    .order_by(event.c.timestamp.asc())
                )
                events = events_result.mappings().all()

                # For each event, apply changes and record occupied count
                for ev in events:
                    changed_rows = await conn.execute(
                        select(event_spot.c.spot_id, event_spot.c.new_state)
                        .where(
                            and_(
                                event_spot.c.event_id == ev["id"],
                                event_spot.c.parking_id == parking_id,
                            )
                        )
                    )
                    for change in changed_rows.mappings().all():
                        running_state[change["spot_id"]] = change["new_state"]

                    occupied = sum(1 for s in running_state.values() if s == 1)
                    time_key = ev["timestamp"].astimezone(timezone.utc).strftime("%H:%M:%S")
                    occupancy[time_key] = occupied

                return {
                    "occupancy": occupancy,
                    "parking_size": parking_size,
                }

        except Exception as e:
            logger.error(f"Failed to get daily occupancy: {e}")
            return {"occupancy": {}, "parking_size": 0}