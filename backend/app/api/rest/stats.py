from fastapi import APIRouter, Query, HTTPException
from datetime import date

from app.persistence.stats_instance import stats

router = APIRouter(prefix="/api/stats")


@router.get("/dailyOccupancy")
async def get_daily_occupancy(
    parkingId: str = Query(...),
    day: date = Query(...),
):
    result = await stats.get_daily_occupancy(
        parking_id=parkingId,
        day=day,
    )
    if result["size"] == 0:
        raise HTTPException(status_code=404, detail="Parking lot not found")
    elif result["size"] == -1:
        raise HTTPException(status_code=500,detail=result["error"])
    return result


@router.get("/spotsUsage")
async def get_spot_usage(
    parkingId: str = Query(...),
    from_date: date = Query(...),
    to_date: date = Query(...)
):
    result = await stats.get_spots_usage(parking_id=parkingId,from_date=from_date,to_date=to_date)
    if result["spotsUsage"] == {}:
        raise HTTPException(status_code=404, detail="Parking lot not found")
    if "error" in result.keys():
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@router.get("/spotsRotations")
async def get_spot_rotations(
    parkingId: str = Query(...),
    from_date: date = Query(...),
    to_date: date = Query(...)
):
    result = await stats.get_spots_rotations(parking_id=parkingId,from_date=from_date,to_date=to_date)
    if result["spotsUsage"] == {}:
        raise HTTPException(status_code=404, detail="Parking lot not found")
    if "error" in result.keys():
        raise HTTPException(status_code=500, detail=result["error"])
    return result