"use client";
import { useState, useEffect } from "react";
import Card from "@/components/Card";
import type { SpotsRotationsResult } from "@/lib/api/stats";
import SpotsRotationsDisplay from "./SpotsRotationsDisplay";
import { getSpotsRotations } from "@/lib/api/stats";
import { useStatsContext } from "../StatsContext";

export default function SpotsRotationsPage() {
  const { selectedLotId, selectedLotName, fromDate, toDate } = useStatsContext();

  const [error, setError] = useState<string | null>(null);
  const [loadingRotations, setLoadingRotations] = useState(false);
  const [rotationsData, setRotationsData] = useState<SpotsRotationsResult | null>(null);

  useEffect(() => {
    if (!selectedLotId || !fromDate || !toDate) {
      setRotationsData(null);
      return;
    }
    if (fromDate > toDate) {
      setError("The start date cannot be later than the end date.");
      return;
    }
    setError(null);
    setRotationsData(null);
    setLoadingRotations(true);
    getSpotsRotations(selectedLotId, fromDate, toDate)
      .then(setRotationsData)
      .catch(() => setError("Error fetching spot rotation data. Please try again."))
      .finally(() => setLoadingRotations(false));
  }, [selectedLotId, fromDate, toDate]);

  const placeholder = !selectedLotId
    ? "Select a parking lot to begin."
    : !fromDate || !toDate
    ? "Select a date range to view spot rotations."
    : loadingRotations
    ? "Loading rotation data…"
    : null;

  return (
    <div className="flex flex-col h-full w-full gap-4">
      {error && (
        <p className="w-full text-sm md:text-base lg:text-lg xl:text-xl text-red-600 text-center">
          {error}
        </p>
      )}
      <div className="flex-1 min-h-0 w-full">
        {placeholder ? (
          <Card variant="light" className="h-full w-full">
            <div className="flex items-center justify-center h-full text-primary text-md md:text-lg lg:text-xl xl:text-2xl">
              {placeholder}
            </div>
          </Card>
        ) : rotationsData ? (
          <SpotsRotationsDisplay
            data={rotationsData}
            parkingName={selectedLotName}
          />
        ) : null}
      </div>
    </div>
  );
}