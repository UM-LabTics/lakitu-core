from datetime import datetime
from pydantic import BaseModel, Field


class SpotState(BaseModel):
    spot_id: str
    status: int = Field(..., ge=0, le=1)
    confidence: float = Field(..., ge=0.0, le=1.0)
    last_changed: datetime


class StateUpdateEvent(BaseModel):
    device_id: str
    parking_id: str
    parking_name: str
    timestamp: datetime
    seq: int
    snapshot: str           # base64
    total_spots: int
    free_spots: int
    spots: list[SpotState]

    @property
    def occupied_spots(self) -> int:
        return self.total_spots - self.free_spots

    @property
    def occupancy_pct(self) -> float:
        if self.total_spots == 0:
            return 0.0
        return round(self.occupied_spots / self.total_spots * 100, 1)