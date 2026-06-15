import logging
from datetime import date, datetime, timezone, time, timedelta

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncEngine

from app.persistence.tables import event, event_spot, spot, parking_lot
from app.persistence.instance import persistence

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
        - size: total number of spots in the parking lot
        
        The first entry is always "00:00:00" with the base state at midnight.
        Each subsequent entry corresponds to an event that changed the occupancy.
        """
        try:
            # Define the day boundaries in UTC
            day_start = datetime.combine(day, time.min).replace(tzinfo=timezone(timedelta(hours=-3)))
            day_end = datetime.combine(day, time.max).replace(tzinfo=timezone(timedelta(hours=-3)))

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
                
                initial_UNoccupancy = (await conn.execute(
                    select(event.c.free_spots)
                    .join(event_spot, event.c.id==event_spot.c.event_id)
                    .where(
                        and_(
                            event_spot.c.parking_id == parking_id,
                            event.c.timestamp <= day_start,
                        )
                    )
                    .order_by(event.c.timestamp.desc())
                    .limit(1)
                )).scalar_one_or_none()

                occupancy = {"00:00:00": "N/D" if initial_UNoccupancy is None else parking_size-initial_UNoccupancy}

                stats = (await conn.execute(
                    select(event.c.free_spots,event.c.timestamp)
                    .join(event_spot, event.c.id==event_spot.c.event_id)
                    .where(
                        and_(
                            event_spot.c.parking_id == parking_id,
                            event.c.timestamp <= day_end,
                            event.c.timestamp >= day_start
                        )
                    )
                    .order_by(event.c.timestamp.asc())
                ))
                occupancy_array = stats.mappings().all()
                if occupancy_array == []:
                    return {"occupancy":occupancy,"size":parking_size}
                else:
                    for row in occupancy_array:
                        occupancy[row["timestamp"].time().isoformat()] = parking_size - row["free_spots"]

                return {"occupancy": occupancy, "size": parking_size}

        except Exception as e:
            logger.error(f"Failed to get daily occupancy: {e}")
            return {"occupancy": {}, "size": -1, "error":str(e)}