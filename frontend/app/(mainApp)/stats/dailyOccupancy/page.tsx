"use client";
import { useState, useEffect } from "react";
import Card from "@/components/Card";
import OccupancyChart from "./OccupancyChart";
import { getDailyOccupancy } from "@/lib/api/stats";
import { useStatsContext } from "../StatsContext";

type OccupancyData = Record<string, number | "N/D">;

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getCurrentTimeString(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function DailyOccupancyPage() {
  // fromDate is the single date for this page
  const { selectedLotId, fromDate: selectedDate } = useStatsContext();

  const [error, setError] = useState<string | null>(null);
  const [loadingOccupancy, setLoadingOccupancy] = useState(false);
  const [occupancy, setOccupancy] = useState<OccupancyData>({});
  const [parkingSize, setParkingSize] = useState(0);

  useEffect(() => {
    if (!selectedLotId || !selectedDate) {
      setOccupancy({});
      return;
    }

    async function fetchOccupancy() {
      setLoadingOccupancy(true);
      setError(null);
      try {
        const { occupancy: rawOccupancy, size } = await getDailyOccupancy(
          selectedLotId,
          selectedDate
        );
        if (selectedDate === getTodayString()) {
          rawOccupancy[getCurrentTimeString()] = "N/D";
        }
        setOccupancy(rawOccupancy);
        setParkingSize(size);
      } catch (err) {
        console.error("Error fetching occupancy:", err);
        setError("Error fetching occupancy data. Please try again.");
      } finally {
        setLoadingOccupancy(false);
      }
    }

    fetchOccupancy();
  }, [selectedLotId, selectedDate]);

  const chartPlaceholder =
    !selectedLotId && !selectedDate
      ? "Select a parking lot and a date to view its occupancy graph."
      : !selectedLotId
      ? "Select a parking lot to view its occupancy."
      : !selectedDate
      ? "Select a date to view occupancy."
      : loadingOccupancy
      ? "Loading occupancy data…"
      : null;

  return (
    <div className="flex flex-col h-full w-full gap-4">
      {error && (
        <p className="w-full text-sm md:text-base lg:text-lg xl:text-xl text-red-600 text-center">
          {error}
        </p>
      )}
      <Card variant="dark" className="flex-1 min-h-0 w-full">
        {chartPlaceholder ? (
          <div className="flex items-center justify-center h-full text-primary-super-light text-md md:text-lg lg:text-xl xl:text-2xl">
            {chartPlaceholder}
          </div>
        ) : (
          <OccupancyChart size={parkingSize} occupancy={occupancy} />
        )}
      </Card>
    </div>
  );
}