from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.api.websockets.manager import manager
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/ws/{parking_id}")
async def websocket_endpoint(websocket: WebSocket, parking_id: str):
    await manager.connect(parking_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(parking_id, websocket)
        logger.info(f"Client cleanly disconnected from parking {parking_id}")