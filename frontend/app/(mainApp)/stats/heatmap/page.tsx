"use client";
import { useState, useEffect } from "react";
import Card from "@/components/Card";
import SpotsHeatmap from "./SpotsHeatmap";
import type { SpotsUsageResult } from "@/lib/api/stats";
import { getSpotsUsage } from "@/lib/api/stats";
import { useStatsContext } from "../StatsContext";

export default function UsageHeatmapPage() {
  const { selectedLotId, selectedLotName, fromDate, toDate } = useStatsContext();

  const [error, setError] = useState<string | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [usageData, setUsageData] = useState<SpotsUsageResult | null>(null);

  useEffect(() => {
    if (!selectedLotId || !fromDate || !toDate) {
      setUsageData(null);
      return;
    }
    if (fromDate > toDate) {
      setError("The start date cannot be later than the end date.");
      return;
    }
    setError(null);
    setUsageData(null);
    setLoadingUsage(true);
    getSpotsUsage(selectedLotId, fromDate, toDate)
      .then(setUsageData)
      .catch(() => setError("Error fetching spot usage data. Please try again."))
      .finally(() => setLoadingUsage(false));
  }, [selectedLotId, fromDate, toDate]);

  const placeholder = !selectedLotId
    ? "Select a parking lot to begin."
    : !fromDate || !toDate
    ? "Select a date range to view a spot usage heatmap."
    : loadingUsage
    ? "Loading usage data…"
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
          <Card variant="dark" className="h-full w-full">
            <div className="flex items-center justify-center h-full text-primary-super-light text-md md:text-lg lg:text-xl xl:text-2xl">
              {placeholder}
            </div>
          </Card>
        ) : usageData ? (
          <SpotsHeatmap
            data={usageData}
            parkingName={selectedLotName}
            fromDate={fromDate}
            toDate={toDate}
          />
        ) : null}
      </div>
    </div>
  );
}