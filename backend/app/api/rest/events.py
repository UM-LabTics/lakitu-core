from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
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
    from_dt: datetime = Query(..., alias="from"),
    to_dt: Optional[datetime] = Query(default=None, alias="to"),
    limit: int = Query(default=20),
    page: int = Query(default=1),
):
    # ensure UTC timezone
    from_dt = from_dt.replace(tzinfo=timezone.utc) if from_dt.tzinfo is None else from_dt

    # if no to_date, return state at a single moment
    if to_dt is None:
        result = await persistence.get_state_at(
            parking_id=parking_id,
            moment=from_dt,
        )
        return result

    # ensure UTC timezone for to_dt
    to_dt = to_dt.replace(tzinfo=timezone.utc) if to_dt.tzinfo is None else to_dt

    if from_dt > to_dt:
        raise HTTPException(status_code=422, detail="'from' must be before or equal to 'to'")

    result = await persistence.get_states_between(
        parking_id=parking_id,
        from_dt=from_dt,
        to_dt=to_dt,
        limit=limit,
        page=page,
    )
    return result

