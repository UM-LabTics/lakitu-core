"use client";

import { use } from "react";
import { useParkingSocket } from "@/lib/hooks/useParkingSocket";
import { ParkingDisplay } from "@/components/ParkingDisplay";

interface Props {
  params: Promise<{ parkingId: string }>;
}

export default function ParkingFeedPage({ params }: Props) {
  const { parkingId } = use(params);
  const { connectionStatus, latestState } = useParkingSocket(parkingId);

  return (
    <div className="flex flex-col justify-baseline items-center w-full min-h-full">
      <ParkingDisplay latestState={latestState} connectionStatus={connectionStatus} />
    </div>
  );
}