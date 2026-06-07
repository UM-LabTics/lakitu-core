"use client";

import Card from "@/components/Card";
import Selectable from "@/components/Selectable";
import { getParkingLots } from "@/lib/api/parkingLots";
import { useEffect, useState } from "react";

interface ParkingLot {
  id: string;
  name: string;
}

interface ParkingLotSelectorProps {
  selectedLot: string | null;
  onSelect: (lotId: string | null) => void;
}

export default function ParkingLotSelector({
  selectedLot,
  onSelect,
}: ParkingLotSelectorProps) {
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchParkingLots() {
      try {
        const lots = await getParkingLots();
        setParkingLots(lots);
      } catch (error) {
        setError("Error fetching parking lots from the server. Please try again.");
        console.error("Error fetching parking lots:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchParkingLots();
  }, []);

  return (
    <Card title="Select a parking lot" className="w-4/5 sm:w-1/3 h-2/3 sm:min-w-[475px]">
      <div className="w-full h-full flex-col text-center -translate-y-4 justify-baseline items-center overflow-y-scroll py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {loading && <p>Loading parking lots...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading &&
          !error &&
          parkingLots.map((lot) => (
            <Selectable
              key={lot.id}
              selected={selectedLot === lot.id}
              onClick={() => onSelect(selectedLot === lot.id ? null : lot.id)}
              className="w-full mb-4"
            >
              {lot.name}
            </Selectable>
          ))}
      </div>

      <div className="h-1 -translate-y-4 rounded-xl w-full bg-primary-light" />
    </Card>
  );
}