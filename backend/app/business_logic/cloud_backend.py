import json
import logging
import os
from pathlib import Path
import redis.asyncio as redis
from datetime import timezone

from app.models import ParkingLotState, SpotState, StateUpdateEvent

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.persistence import persistence
from app.api.websockets.manager import manager

logger = logging.getLogger(__name__)
ENVIRONMENT = os.getenv("ENVIRONMENT", "production").lower()

# ---------------------------------------------------------------------------
# CloudBackend
# ---------------------------------------------------------------------------

class CloudBackend:
    """ Encapsula la lógica de interacción con Redis, redirecciona peticiones y delega la comunicación con RDS y S3 a persistence. """

    def __init__(self, redis_client: redis.Redis, persistence):
        self.redis_client = redis_client
        self.persistence = persistence

    async def _update_redis_state(self, state: ParkingLotState):
        """ Intenta actualizar el estado en Redis, si falla lo loguea pero no lanza excepción."""
        try:
            parking_id = state.parking_id
            if not parking_id:
                logger.error("State update missing 'parking_id', cannot update Redis.")
                return
            
            key = f"parking_lot:{parking_id}:state"
            await self.redis_client.set(key, state.model_dump_json(), ex=600) # expira en 10 minutos, hardcodeado por ahora, variable de entorno después
            logger.debug(f"Succesfully updated Redis state for {parking_id}: {state}")
        except redis.RedisError as e:
            logger.error(f"Failed to update Redis state for {parking_id}: {e}")

    async def process_event(self, event: StateUpdateEvent):
        """ Procesa un evento de actualización de estado, actualizando Redis y delegando la persistencia. """
        logger.info(f"Processing state update event for parking_id={event.parking_id} at {event.timestamp.isoformat()} with {event.occupancy_pct}% occupancy.")
        
        # Parsear el evento a ParkingLotState para Redis
        parking_lot_state = ParkingLotState(
            parking_id=event.parking_id,
            parking_name=event.parking_name,
            timestamp=event.timestamp.astimezone(timezone.utc),  # asegurarnos que esté en UTC
            spots=[SpotState(spot_id=spot.spot_id, status=spot.status) for spot in event.spots]
        )

        # Enviar el estado actualizado a través del websocket
        await manager.broadcast(parking_lot_state.parking_id, parking_lot_state.model_dump(mode="json"))
        
        # Actualizar el estado en Redis.
        await self._update_redis_state(parking_lot_state)

        # Delegar la persistencia a persistence.py, que se encargará de guardar en RDS y S3.
        await self.persistence.save_event(event)

    async def get_current_state(self, parking_id: str) -> ParkingLotState | None:
        """ Intenta obtener el estado actual de un parking lot desde Redis. Si falla, devuelve None.""" # Después hagamos que si falla intente con persistence en la DB
        try:
            key = f"parking_lot:{parking_id}:state"
            state_json = await self.redis_client.get(key)
            if state_json is None:
                logger.info(f"No current state found in Redis for parking_id={parking_id}.")
                return None
            return ParkingLotState.model_validate_json(state_json)
        except redis.RedisError as e:
            logger.error(f"Failed to get current state from Redis for parking_id={parking_id}: {e}")
            return None