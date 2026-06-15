"use client";
import { useState, useEffect } from "react";
import Card from "@/components/Card";
import { getParkingLots } from "@/lib/api/parkingLots";
import OccupancyChart from "./OccupancyChart";
import { getDailyOccupancy } from "@/lib/api/stats";
import Select from "@/components/Select";
import Input from "@/components/Input";

interface ParkingLot {
  id: string;
  name: string;
}

type OccupancyData = Record<string, number | "N/D">;

function getTodayString(): string {
  const now = new Date();
  // Use local date parts to avoid UTC-shift mismatches
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
  const [error, setError] = useState<string | null>(null);
  const [loadingLots, setLoadingLots] = useState<boolean>(true);
  const [loadingOccupancy, setLoadingOccupancy] = useState<boolean>(false);
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [occupancy, setOccupancy] = useState<OccupancyData>({});
  const [parkingSize, setParkingSize] = useState<number>(0);

  // Fetch the list of parking lots once on mount
  useEffect(() => {
    async function fetchParkingLots() {
      try {
        const lots = await getParkingLots();
        setParkingLots(lots);
      } catch (err) {
        setError("Error fetching parking lots from the server. Please try again.");
        console.error("Error fetching parking lots:", err);
      } finally {
        setLoadingLots(false);
      }
    }
    fetchParkingLots();
  }, []);

  // Fetch occupancy whenever the selected lot or date changes
  useEffect(() => {
    // Don't fetch until both inputs are filled
    if (!selectedLotId || !selectedDate) return;

    async function fetchOccupancy() {
      setLoadingOccupancy(true);
      try {
        const { occupancy: rawOccupancy, size } = await getDailyOccupancy(
          selectedLotId,
          selectedDate!
        );

        // Today guardrail: stamp the current time as N/D so the chart
        // shows no data from now until end of day.
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
  }, [selectedLotId, selectedDate]); // re-runs whenever either selector changes

  // Derive a human-readable placeholder for the chart area
  const chartPlaceholder = (!selectedLotId && !selectedDate)
    ? "Select a parking lot and a date to view its occupancy graph."
    : (!selectedLotId && !!selectedDate)
    ? "Select a parking lot to view its occupancy."
    : (!selectedDate && !!selectedLotId)
    ? "Select a date to view occupancy."
    : loadingOccupancy
    ? "Loading occupancy data…"
    : null;

  return (
    <div className="flex flex-col items-center justify-start h-full w-full pb-8 gap-8">
      {error && (
        <p className="w-full text-sm md:text-base lg:text-lg xl:text-xl text-red-600 text-center">{error}</p>
      )}

      <div className="flex w-full h-fit gap-4">
        <Select
          height="auto"
          disabled={loadingLots || parkingLots.length === 0}
          placeholder={
            loadingLots
              ? "Loading your parking lots…"
              : parkingLots.length === 0
              ? "Oops! You don't have access to any lot."
              : "Select a parking lot"
          }
          options={parkingLots.map((lot) => ({
            label: lot.name,
            value: lot.id,
          }))}
          onChange={setSelectedLotId}
        />
        <Input variant="date" value={selectedDate} onChange={setSelectedDate} />
      </div>

      <Card variant="dark" className="h-4/5 w-full">
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