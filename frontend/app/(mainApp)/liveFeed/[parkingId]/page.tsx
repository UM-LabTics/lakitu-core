"use client";

import {getDailyOccupancy} from "@/lib/api/stats"
import { use, useEffect, useState } from "react";
import { useParkingSocket } from "@/lib/hooks/useParkingSocket";

import ParkingDisplay from "@/components/ParkingDisplay";
import PicoHours from "@/components/PicoHours";

interface Props {
  params: Promise<{ parkingId: string }>;
}

export default function ParkingFeedPage({ params }: Props) {
  const { parkingId } = use(params);
  const { connectionStatus, latestState } = useParkingSocket(parkingId);
  const [dailyOccupancy,setDailyOccupancy] = useState({});
  useEffect(() => {
    async function fetchOccupancy() {
      try {
        const lots = await getDailyOccupancy();
        setDailyOccupancy(lots);
      } catch (error) {
        console.error("Error fetching parking lots:", error);
      }
    }

    fetchOccupancy();
  }, []);

  return (
    <div className="flex justify-baseline items-center w-full min-h-full">
      <ParkingDisplay latestState={latestState} connectionStatus={connectionStatus} />
      <div className="flex flex-col justify-start items-start pl-4 xl:pl-8 w-1/2 h-full">
        <div className="w-3/4 h-17/20">
          <PicoHours stats={dailyOccupancy} parkingSize={12} />
        </div>
      </div>
    </div>
  );
}