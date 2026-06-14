from fastapi import APIRouter, Query, HTTPException
from datetime import date

from app.persistence.stats_instance import stats

router = APIRouter(prefix="/api/stats")


@router.get("/daily-occupancy")
async def get_daily_occupancy(
    parking_id: str = Query(...),
    day: date = Query(...),
):
    result = await stats.get_daily_occupancy(
        parking_id=parking_id,
        day=day,
    )
    if not result["occupancy"] and result["parking_size"] == 0:
        raise HTTPException(status_code=404, detail="Parking lot not found")
    return result