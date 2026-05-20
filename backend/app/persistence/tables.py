from sqlalchemy import (
    MetaData, Table, Column,
    Integer, String, DateTime, ForeignKey, Text, ForeignKeyConstraint
)

metadata = MetaData()

parking_lot = Table(
    "parking_lot", metadata,
    Column("id", String, primary_key=True),
    Column("name", String, nullable=False),
    Column("total_spots", Integer, nullable=False),
)

device = Table(
    "device", metadata,
    Column("id", String, primary_key=True),
    Column("parking_id", String, ForeignKey("parking_lot.id"), primary_key=True, nullable=False),
)

spot = Table(
    "spot", metadata,
    Column("id", String, primary_key=True),
    Column("parking_id", String, primary_key=True, nullable=False),
    Column("device_id", String, primary_key=True, nullable=False),
    ForeignKeyConstraint(
        ["device_id", "parking_id"],
        ["device.id", "device.parking_id"]
    ),
)

event = Table(
    "event", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("timestamp", DateTime(timezone=True), nullable=False),
    Column("free_spots", Integer, nullable=False),
    Column("image_url", Text, nullable=True),
)

event_spot = Table(
    "event_spot", metadata,
    Column("event_id", Integer, ForeignKey("event.id"), primary_key=True),
    Column("spot_id", String, primary_key=True),
    Column("parking_id", String, primary_key=True),
    Column("device_id", String, primary_key=True, nullable=False),
    Column("new_state", Integer, nullable=False),
    # Composite fk referencing spots composite primary key
    ForeignKeyConstraint(
        ["spot_id", "parking_id", "device_id"],
        ["spot.id", "spot.parking_id", "spot.device_id"]
    ),
)

user = Table(
    "user", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("email", String, nullable=False, unique=True),
    Column("hashed_password", String, nullable=False),
    Column("name", String, nullable=False),
    Column("is_admin", Integer, nullable=False, default=0)
)

has_access = Table(
    "has_access", metadata,
    Column("user_id", Integer, ForeignKey("user.id"), primary_key=True),
    Column("parking_id", String, ForeignKey("parking_lot.id"), primary_key=True)
)