type ParkingMessageType = "STATE_UPDATE" | "INITIAL_STATE";
type SpotStatus = 0 | 1;

interface ParkingSpot {
  spot_id: string;
  status: SpotStatus;
}

interface ParkingState {
  type: ParkingMessageType;
  parking_id: string;
  parking_name: string;
  timestamp: string; // ISO 8601 UTC string
  spots: ParkingSpot[];
}

export type { ParkingState };