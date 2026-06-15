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
        
        The first entry is always "00:00:00" with the base state at midnight, 
        which is N/D in case there is no data regarding the lot prior to the day chosen.
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
                        occupancy[(row["timestamp"] - timedelta(hours=3)).time().isoformat()] = parking_size - row["free_spots"]

                return {"occupancy": occupancy, "size": parking_size}

        except Exception as e:
            logger.error(f"Failed to get daily occupancy: {e}")
            return {"occupancy": {}, "size": -1, "error":str(e)}
        

    async def get_spots_usage(
            self,
            parking_id,
            from_date,
            to_date
    ) -> dict:
        try:
            tz_offset = timezone(timedelta(hours=-3))
            period_start = datetime.combine(from_date, time.min).replace(tzinfo=tz_offset)
            period_end   = datetime.combine(to_date,   time.max).replace(tzinfo=tz_offset)
            total_period_seconds = (period_end - period_start).total_seconds()

            def to_hhmmss(total_secs: float) -> str:
                total_secs = int(total_secs)
                return f"{total_secs // 3600:02d}:{(total_secs % 3600) // 60:02d}:{total_secs % 60:02d}"

            async with self.engine.connect() as conn:

                # 1. All spots in this parking lot
                spot_ids = [
                    row[0] for row in (
                        await conn.execute(
                            select(spot.c.id).where(spot.c.parking_id == parking_id)
                        )
                    ).fetchall()
                ]
                if not spot_ids:
                    return {"spotsUsage": {}, "avgTime": "00:00:00", "avgPercentage": "0%"}

                # 2. Initial state for every spot (last event before the period)
                initial_subq = (
                    select(
                        event_spot.c.spot_id,
                        event_spot.c.new_state,
                        func.row_number().over(
                            partition_by=event_spot.c.spot_id,
                            order_by=event.c.timestamp.desc()
                        ).label("rn")
                    )
                    .join(event, event.c.id == event_spot.c.event_id)
                    .where(
                        and_(
                            event_spot.c.parking_id == parking_id,
                            event.c.timestamp < period_start,
                        )
                    )
                ).subquery()

                initial_states: dict[str, int] = {
                    row["spot_id"]: row["new_state"]
                    for row in (
                        await conn.execute(
                            select(initial_subq.c.spot_id, initial_subq.c.new_state)
                            .where(initial_subq.c.rn == 1)
                        )
                    ).mappings().all()
                }

                # 3. All events for every spot in this lot during the period
                all_events = (
                    await conn.execute(
                        select(event_spot.c.spot_id, event_spot.c.new_state, event.c.timestamp)
                        .join(event, event.c.id == event_spot.c.event_id)
                        .where(
                            and_(
                                event_spot.c.parking_id == parking_id,
                                event.c.timestamp >= period_start,
                                event.c.timestamp <= period_end,
                            )
                        )
                        .order_by(event_spot.c.spot_id, event.c.timestamp.asc())
                    )
                ).mappings().all()

                events_by_spot: dict[str, list] = {sid: [] for sid in spot_ids}
                for evt in all_events:
                    if evt["spot_id"] in events_by_spot:
                        events_by_spot[evt["spot_id"]].append(evt)

                # 4. Walk each spot's timeline
                spots_usage: dict[str, str] = {}
                total_occupied_seconds = 0.0

                for spot_id in spot_ids:
                    events        = events_by_spot[spot_id]
                    initial_state = initial_states.get(spot_id)
                    occupied_secs = 0.0

                    # Start the clock at the period boundary if spot was already occupied
                    last_occupied_start = period_start if initial_state == 1 else None

                    for evt in events:
                        ts        = evt["timestamp"]   # tz-aware from the DB ✓
                        new_state = evt["new_state"]

                        if new_state == 1 and last_occupied_start is None:
                            last_occupied_start = ts
                        elif new_state == 0 and last_occupied_start is not None:
                            occupied_secs      += (ts - last_occupied_start).total_seconds()
                            last_occupied_start = None

                    # Still occupied when the period closes
                    if last_occupied_start is not None:
                        occupied_secs += (period_end - last_occupied_start).total_seconds()

                    spots_usage[spot_id]     = to_hhmmss(occupied_secs)
                    total_occupied_seconds  += occupied_secs

                # 5. Averages
                avg_seconds    = total_occupied_seconds / len(spot_ids)
                avg_percentage = (
                    f"{avg_seconds / total_period_seconds * 100:.1f}%"
                    if total_period_seconds > 0 else "0.0%"
                )

                return {
                    "spotsUsage":    spots_usage,
                    "avgTime":       to_hhmmss(avg_seconds),
                    "avgPercentage": avg_percentage,
                }

        except Exception as e:
            logger.error(f"Failed to get spots usage: {e}")
            return {"spotsUsage": {}, "avgTime": "00:00:00", "avgPercentage": "0%", "error": str(e)}