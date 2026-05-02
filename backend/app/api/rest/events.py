from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from datetime import date
from app.api.websockets.manager import manager
from app.persistence.instance import persistence

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
    parking_id: str = Query(...),
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    limit: int = Query(default=20),
    page: int = Query(default=1),
):
    if from_date > to_date:
        raise HTTPException(status_code=422, detail="'from' must be before 'to'")

    result = await persistence.get_events(
        parking_id=parking_id,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
        page=page,
    )
    return result

