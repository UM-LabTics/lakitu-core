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
    <div className="flex justify-baseline items-center h-17/20 min-h-110 gap-2 pb-4 sm:gap-4 lg:gap-6 xl:gap-8">
      <ParkingDisplay latestState={latestState} connectionStatus={connectionStatus} />
        <div className={`w-full h-full hidden sm:flex flex-col justify-start items-start max-w-[30vw]`}>
          <PicoHours stats={dailyOccupancy} parkingSize={12} />
          <div className={`${isAdmin ? 'h-fit w-full flex flex-col justify-center gap-4 items-center pt-2' : 'hidden'}`}>
            <AdminButton width="100%" height="auto" onClick={() => (window.location.href = "/stats")}>
              View Statistics
            </AdminButton>
            <AdminButton width="100%" height="auto" onClick={() => (alert("not implemented yet"))}>
              Take photo
            </AdminButton>
          </div>
        </div>
    </div>
  );
}