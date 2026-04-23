import logging
from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from app.cloud_receptor.cloud_receptor import CloudReceptor, CloudReceptorSettings

def setup_logging() -> None:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    logging.getLogger("botocore").setLevel(logging.WARNING)
    logging.getLogger("boto3").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)


receptor = CloudReceptor(CloudReceptorSettings())

@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    await receptor.start()
    yield
    await receptor.stop()

app = FastAPI(lifespan=lifespan)