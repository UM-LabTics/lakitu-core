from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from datetime import date

from app.api.websockets.manager import manager

router = APIRouter(prefix="/api")


class BroadcastRequest(BaseModel):
    parking_id: str
    message: dict


@router.post("/debug/broadcast")
async def debug_broadcast(payload: BroadcastRequest):
    await manager.broadcast(payload.parking_id, payload.message)
    return {
        "broadcasted": True,
        "parking_id": payload.parking_id,
    }


@router.get("/events")
async def get_events(
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
):
    if from_date > to_date:
        raise HTTPException(status_code=422, detail="'from' must be before 'to'")

    # TODO: llamar a persistence cuando esté listo
    # events = await persistence.get_events(from_date, to_date)

    return {
        "from": from_date.isoformat(),
        "to": to_date.isoformat(),
        "events": [] 
    }