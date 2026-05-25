type ParkingMessageType = "STATE_UPDATE" | "INITIAL_STATE";
type SpotStatus = -1 | 0 | 1;

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

interface ParkingStateSnapshot {
  pi_timestamp: string;
  free_spots: number;
  image_url: string | null;
  spots: ParkingSpot[];
}

interface StatesResponse {
  total: number;
  items: ParkingStateSnapshot[];
}

export type { ParkingState, ParkingSpot, ParkingStateSnapshot, StatesResponse };