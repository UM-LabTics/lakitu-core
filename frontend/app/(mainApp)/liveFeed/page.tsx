"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ParkingLotSelector from "./ParkingLotSelector";
import Button from "@/components/Button";

export default function LiveFeed() {
  const router = useRouter();
  const [selectedLot, setSelectedLot] = useState<string | null>(null);

  const handleViewFeed = () => {
    if (!selectedLot) return;
    router.push(`/liveFeed/${selectedLot}`);
  };

  return (
    <div className="flex flex-col justify-baseline items-center w-full h-full">
      <ParkingLotSelector
        selectedLot={selectedLot}
        onSelect={setSelectedLot}
      />

      <Button className="mt-8" disabled={!selectedLot} onClick={handleViewFeed}>
        View Live Feed
      </Button>
    </div>
  );
}