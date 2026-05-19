import asyncio
import logging
from contextlib import asynccontextmanager
import os

from fastapi.middleware.cors import CORSMiddleware 
from fastapi import FastAPI
from redis.asyncio import Redis

from app.business_logic.cloud_backend import CloudBackend
from app.cloud_receptor.cloud_receptor import CloudReceptor
from app.persistence.instance import persistence
from app.settings import settings

from app.api.rest.events import router as rest_router 
from app.api.websockets.endpoints import router as ws_router
from app.api.websockets.manager import manager as websocket_manager
from app.api.rest.auth import router as auth_router


def setup_logging() -> None:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    logging.getLogger("botocore").setLevel(logging.WARNING)
    logging.getLogger("boto3").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()

    # Construir recursos externos
    redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
    await redis_client.ping() # El IDE me marca error porque no reconoce que ping es async... espero que sea eso

    # Construir cadena de dependencias
    cloud_backend = CloudBackend(redis_client, persistence)
    cloud_receptor = CloudReceptor(settings, cloud_backend)
    cloud_backend.set_websocket_broadcast_method(websocket_manager.broadcast)
    app.state.cloud_backend = cloud_backend

    # Empezar el polling de SQS
    await cloud_receptor.start()

    yield

    # Shutdown
    await cloud_receptor.stop()
    await redis_client.aclose()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),  # 👈
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(ws_router)
app.include_router(rest_router)
app.include_router(auth_router)