"use client";

import { useParkingSocket } from "@/lib/hooks/useParkingSocket";
import { ConnectionBadge } from "./ConnectionBadge";

export function ParkingFeed({ parkingId }: { parkingId: string }) {
  const { connectionStatus, latestState } = useParkingSocket(parkingId);

  const freeSpots  = latestState?.spots.filter(s => s.status === 0) ?? [];
  const takenSpots = latestState?.spots.filter(s => s.status === 1) ?? [];

  return (
    <div>
      <ConnectionBadge connectionStatus={connectionStatus} />

      {!latestState ? (
        <p>Waiting for first update...</p>
      ) : (
        <>
          <p className="text-2xl font-bold">Parking lot: {latestState.parking_name} ({latestState.parking_id})</p>
          <p>Last update: {latestState.timestamp}</p>
          <p>Message type: {latestState.type}</p>
          <p className="text-green-600">Free spots ({freeSpots.length}): {freeSpots.map(s => s.spot_id).join(", ")}</p>
          <p className="text-red-800">Taken spots ({takenSpots.length}): {takenSpots.map(s => s.spot_id).join(", ")}</p>
        </>
      )}
    </div>
  );
}