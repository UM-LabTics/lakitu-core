from sqlalchemy import (
    MetaData, Table, Column,
    Integer, String, DateTime, ForeignKey, Text
)

metadata = MetaData()

parking_lot = Table(
    "parking_lot", metadata,
    Column("id", String, primary_key=True),
    Column("name", String, nullable=False),
    Column("total_spots", Integer, nullable=False),
)

spot = Table(
    "spot", metadata,
    Column("id", String, primary_key=True),
    Column("parking_id", String, ForeignKey("parking_lot.id"), nullable=False),
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
    Column("spot_id", String, ForeignKey("spot.id"), primary_key=True),
    Column("parking_id", String, ForeignKey("parking_lot.id"), primary_key=True),
    Column("new_state", Integer, nullable=False),
)