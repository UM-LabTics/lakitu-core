"use client";

import { useState } from "react";
import ParkingLotSelector from "./ParkingLotSelector";
import Button from "@/components/Button";

export default function LiveFeed() {
  const [selectedLot, setSelectedLot] = useState<string | null>(null);


  return (
    <div className="flex flex-col justify-baseline items-center w-full h-full">
      <ParkingLotSelector
        selectedLot={selectedLot}
        onSelect={setSelectedLot}
      />

      <Button className="mt-8" disabled={!selectedLot} onClick={() => (window.location.href = `/liveFeed/${selectedLot}`)}>
        View Live Feed
      </Button>
    </div>
  );
}