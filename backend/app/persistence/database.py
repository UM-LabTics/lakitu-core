# database  connection file

from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from app.settings import settings

def build_engine() -> AsyncEngine:
    return create_async_engine( 
        settings.database_url,
        echo=False, 
        pool_pre_ping=True, # checks the connection is alive before using it to avoid errores after inactivity
    )