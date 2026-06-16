"use client";

import { getDailyOccupancy } from "@/lib/api/stats";
import { use, useEffect, useState } from "react";
import { useAuth } from "@/app/auth-provider";
import { useParkingSocket } from "@/lib/hooks/useParkingSocket";

import ParkingDisplay from "@/components/ParkingDisplay";
import PicoHours from "@/components/PicoHours";
import AdminButton from "@/components/AdminButton";
import PhotoCaptureModal from "@/components/PhotoCaptureModal";

interface Props {
  params: Promise<{ parkingId: string }>;
}

export default function ParkingFeedPage({ params }: Props) {
  const { parkingId } = use(params);
  const { connectionStatus, latestState } = useParkingSocket(parkingId);
  const [dailyOccupancy, setDailyOccupancy] = useState({});
  const [parkingSize, setParkingSize] = useState(0);
  const [photoOpen, setPhotoOpen] = useState(false);

  useEffect(() => {
    async function fetchOccupancy() {
      try {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        const day = date.toISOString().split("T")[0];
        const { occupancy, size } = await getDailyOccupancy(parkingId, day);
        setDailyOccupancy(occupancy);
        setParkingSize(size);
      } catch (error) {
        console.error("Error fetching parking lots:", error);
      }
    }
    fetchOccupancy();
  }, [parkingId]);

  const { isAdmin } = useAuth();

  return (
    <div className="flex justify-baseline items-center h-17/20 min-h-110 gap-2 pb-4 sm:gap-4 lg:gap-6 xl:gap-8">
      <ParkingDisplay latestState={latestState} connectionStatus={connectionStatus} />

      <div className="w-full h-full hidden sm:flex flex-col justify-start items-start max-w-[30vw]">
        <PicoHours stats={dailyOccupancy} parkingSize={parkingSize} />

        <div className={`${isAdmin ? "h-fit w-full flex flex-col justify-center gap-4 items-center pt-2" : "hidden"}`}>
          <AdminButton width="100%" height="auto" onClick={() => (window.location.href = "/stats")}>
            View Statistics
          </AdminButton>
          <AdminButton width="100%" height="auto" onClick={() => setPhotoOpen(true)}> {/* ← updated */}
            Take photo
          </AdminButton>
        </div>
      </div>

      {photoOpen && (
        <PhotoCaptureModal parkingId={parkingId} onClose={() => setPhotoOpen(false)} />
      )}
    </div>
  );
}