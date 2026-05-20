"""
Seed script for Mock Pi
Run from inside the backend container:

    python -m app.persistence.seed_mock

Make sure the .env file is present and DATABASE_URL points to RDS before running.
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import insert
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.persistence.tables import metadata, parking_lot, device, spot, event, event_spot, user, has_access
from app.settings import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


# ── Test data ────────────────────────────────────────────────────────────────

PARKING_LOT = {
    "id": "mock-01",
    "name": "Mock: Edificio Parque de Innovación LATU - Universidad de Montevideo",
    "total_spots": 12,
}

DEVICE = {
    "id": "mockDevice",
    "parking_id": "mock-01",
}

SPOTS = [
    {"id": f"spot_{i:02d}", "parking_id": "mock-01", "device_id": "mockDevice"}
    for i in range(1, 13)  # spot_01 through spot_12
]

USERS = [
    {
        "email": "admin@lakitu.com",
        "hashed_password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCMsFnUMkqXBG9.3dLlNZGu",  # "admin123"
        "name": "Admin User",
        "is_admin": 1,
    },
    {
        "email": "user@lakitu.com",
        "hashed_password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCMsFnUMkqXBG9.3dLlNZGu",  # "admin123"
        "name": "Regular User",
        "is_admin": 0,
    },
]


def make_events():
    now = datetime.now(timezone.utc)
    events = []

    def make_event(days_ago, hour, occupied_count):
        timestamp = now - timedelta(days=days_ago) + timedelta(hours=hour)
        # occupied_count out of 12 spots
        occupied = [f"spot_{i:02d}" for i in range(1, occupied_count + 1)]
        free     = [f"spot_{i:02d}" for i in range(occupied_count + 1, 13)]
        return {
            "timestamp": timestamp,
            "free_spots": 12 - occupied_count,
            "image_url": None,
            "spots": [
                {"spot_id": s, "parking_id": "mock-01", "device_id": "mockDevice", "new_state": 1}
                for s in occupied
            ] + [
                {"spot_id": s, "parking_id": "mock-01", "device_id": "mockDevice", "new_state": 0}
                for s in free
            ],
        }

    # 7 days ago
    events.append(make_event(days_ago=7, hour=8,  occupied_count=10))  # morning 
    events.append(make_event(days_ago=7, hour=12, occupied_count=8))   # midday
    events.append(make_event(days_ago=7, hour=16, occupied_count=11))  # afternoon 
    events.append(make_event(days_ago=7, hour=19, occupied_count=4))   # evening
    events.append(make_event(days_ago=7, hour=21, occupied_count=2))   # night 

    # 5 days ago
    events.append(make_event(days_ago=5, hour=8,  occupied_count=9))
    events.append(make_event(days_ago=5, hour=13, occupied_count=7))
    events.append(make_event(days_ago=5, hour=17, occupied_count=12))  
    events.append(make_event(days_ago=5, hour=20, occupied_count=3))
    events.append(make_event(days_ago=5, hour=22, occupied_count=1))   

    # 3 days ago
    events.append(make_event(days_ago=3, hour=9,  occupied_count=8))
    events.append(make_event(days_ago=3, hour=12, occupied_count=11))
    events.append(make_event(days_ago=3, hour=15, occupied_count=10))
    events.append(make_event(days_ago=3, hour=18, occupied_count=5))
    events.append(make_event(days_ago=3, hour=21, occupied_count=2))

    # 2 days ago
    events.append(make_event(days_ago=2, hour=8,  occupied_count=11))
    events.append(make_event(days_ago=2, hour=11, occupied_count=9))
    events.append(make_event(days_ago=2, hour=14, occupied_count=12))  
    events.append(make_event(days_ago=2, hour=17, occupied_count=7))
    events.append(make_event(days_ago=2, hour=20, occupied_count=3))
    events.append(make_event(days_ago=2, hour=22, occupied_count=1))

    # Yesterday
    events.append(make_event(days_ago=1, hour=8,  occupied_count=10))
    events.append(make_event(days_ago=1, hour=11, occupied_count=6))
    events.append(make_event(days_ago=1, hour=14, occupied_count=12))
    events.append(make_event(days_ago=1, hour=17, occupied_count=8))
    events.append(make_event(days_ago=1, hour=20, occupied_count=4))
    events.append(make_event(days_ago=1, hour=22, occupied_count=1))

    return events


# ── Main ─────────────────────────────────────────────────────────────────────

async def seed():
    logger.info("Connecting to database: %s", settings.database_url)
    engine = create_async_engine(settings.database_url, echo=False)

    async with engine.begin() as conn:
        #logger.info("Dropping all tables...")
        #await conn.run_sync(metadata.drop_all)
        logger.info("Creating tables...")
        await conn.run_sync(metadata.create_all)
        logger.info("Tables created successfully.")

        logger.info("Inserting parking lot...")
        await conn.execute(
            pg_insert(parking_lot)
            .values(PARKING_LOT)
            .on_conflict_do_nothing()
        )

        logger.info("Inserting device...")
        await conn.execute(
            pg_insert(device)
            .values(DEVICE)
            .on_conflict_do_nothing()
        )

        logger.info("Inserting %d spots...", len(SPOTS))
        await conn.execute(
            pg_insert(spot)
            .values(SPOTS)
            .on_conflict_do_nothing()
        )

        logger.info("Inserting users...")
        await conn.execute(
            pg_insert(user)
            .values(USERS)
            .on_conflict_do_nothing()
        )

        # Give both users access to mock-01
        logger.info("Inserting has_access...")
        # We need the user ids — fetch them first
        from sqlalchemy import select
        result = await conn.execute(select(user.c.id, user.c.email))
        users = result.mappings().all()
        for u in users:
            await conn.execute(
                pg_insert(has_access)
                .values({"user_id": u["id"], "parking_id": "mock-01"})
                .on_conflict_do_nothing()
            )

        logger.info("Inserting test events...")
        for ev_data in make_events():
            result = await conn.execute(
                insert(event)
                .values(
                    timestamp=ev_data["timestamp"],
                    free_spots=ev_data["free_spots"],
                    image_url=ev_data["image_url"],
                )
                .returning(event.c.id)
            )
            event_id = result.scalar_one()

            await conn.execute(
                insert(event_spot),
                [
                    {
                        "event_id": event_id,
                        "spot_id": s["spot_id"],
                        "parking_id": s["parking_id"],
                        "device_id": s["device_id"],
                        "new_state": s["new_state"],
                    }
                    for s in ev_data["spots"]
                ]
            )
            logger.info(
                "Inserted event %d at %s",
                event_id,
                ev_data["timestamp"].strftime("%Y-%m-%d %H:%M UTC"),
            )

    await engine.dispose()
    logger.info("Seed complete!")


if __name__ == "__main__":
    asyncio.run(seed())