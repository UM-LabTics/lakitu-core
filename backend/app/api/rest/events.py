from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from datetime import date, datetime, timezone
from typing import Optional

from app.api.websockets.manager import manager
from app.persistence.instance import persistence

router = APIRouter(prefix="/api")


class BroadcastRequest(BaseModel):
    parking_id: str
    message: dict


@router.post("/debug/broadcast")
async def debug_broadcast(payload: BroadcastRequest):
    await manager.broadcast(payload.parking_id, payload.message)
    return {"broadcasted": True, "parking_id": payload.parking_id}


@router.get("/events")
async def get_events(
    parking_id: str = Query(...),
    from_date: date = Query(..., alias="from"),
    to_date: Optional[date] = Query(default=None, alias="to"),
    limit: int = Query(default=20),
    page: int = Query(default=1),
):
    from_dt = datetime(from_date.year, from_date.month, from_date.day, tzinfo=timezone.utc)

    # if no to_date, return state at a single moment
    if to_date is None:
        result = await persistence.get_state_at(
            parking_id=parking_id,
            moment=from_dt,
        )
        return result

    # if to_date provided, validate and return states between
    to_dt = datetime(to_date.year, to_date.month, to_date.day, 23, 59, 59, tzinfo=timezone.utc)

    if from_date > to_date:
        raise HTTPException(status_code=422, detail="'from' must be before or equal to 'to'")

    result = await persistence.get_states_between(
        parking_id=parking_id,
        from_dt=from_dt,
        to_dt=to_dt,
        limit=limit,
        page=page,
    )
    return result

