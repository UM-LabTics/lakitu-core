from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.api.websockets.manager import manager
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/ws/{parking_id}")
async def websocket_endpoint(websocket: WebSocket, parking_id: str):
    await manager.connect(parking_id, websocket)
    try:
        # Mandar estado actual al conectar
        from app.business_logic.cloud_backend import cloud_backend
        state = await cloud_backend.get_current_state(parking_id)
        if state:
            await websocket.send_json(state.model_dump(mode="json"))

        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(parking_id, websocket)
        logger.info(f"Client cleanly disconnected from parking {parking_id}")