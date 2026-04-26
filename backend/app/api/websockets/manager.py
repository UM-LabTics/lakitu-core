from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, parking_id: str, websocket: WebSocket):
        await websocket.accept()
        if parking_id not in self.active_connections:
            self.active_connections[parking_id] = []
        self.active_connections[parking_id].append(websocket)
        logger.info(f"Client connected to parking {parking_id}. Total: {len(self.active_connections[parking_id])}")

    def disconnect(self, parking_id: str, websocket: WebSocket):
        if parking_id in self.active_connections:
            self.active_connections[parking_id].remove(websocket)
            logger.info(f"Client disconnected from parking {parking_id}. Remaining: {len(self.active_connections[parking_id])}")

    async def broadcast(self, parking_id: str, message: dict):
        if parking_id not in self.active_connections:
            return
        
        dead_connections = []
        for websocket in self.active_connections[parking_id]:
            try:
                await websocket.send_json(message)
            except Exception:
                logger.warning(f"Failed to send to a client in parking {parking_id}, marking for removal")
                dead_connections.append(websocket)

        for dead in dead_connections:
            self.active_connections[parking_id].remove(dead)

manager = ConnectionManager()