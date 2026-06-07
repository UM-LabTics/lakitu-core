"use client";

import {getDailyOccupancy} from "@/lib/api/stats"
import { use, useEffect, useState } from "react";
import { useAuth } from "@/app/auth-provider";
import { useParkingSocket } from "@/lib/hooks/useParkingSocket";

import ParkingDisplay from "@/components/ParkingDisplay";
import PicoHours from "@/components/PicoHours";
import AdminButton from "@/components/AdminButton";

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

  const {isAdmin} = useAuth();

  return (
    <div className="flex justify-baseline items-center w-full min-h-full">
      <ParkingDisplay latestState={latestState} connectionStatus={connectionStatus} />
      <div className="hidden sm:flex flex-col justify-start items-start pl-4 xl:pl-8 w-2/3 h-full">
        <div className="w-3/4 xl:w-1/2 h-17/20 flex flex-col">
          <PicoHours stats={dailyOccupancy} parkingSize={12} />
          <div className={`${isAdmin ? 'h-1/3 w-full flex flex-col justify-center gap-4 items-center pt-2' : 'hidden'}`}>
            <AdminButton width="100%" height="auto" onClick={() => (window.location.href = "/stats")}>
              View Statistics
            </AdminButton>
            <AdminButton width="100%" height="auto" onClick={() => (alert("not implemented yet"))}>
              Take photo
            </AdminButton>
          </div>
        </div>
      </div>
    </div>
  );
}