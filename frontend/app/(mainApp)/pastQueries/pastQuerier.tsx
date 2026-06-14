"use client";

import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";
import Select from "@/components/Select";

import { getParkingLots } from "@/lib/api/parkingLots";
import { useState, useEffect } from "react";
import { getStateAt, getStatesBetween } from "@/lib/api/events";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface ParkingLot {
  id: string;
  name: string;
}

const LIST_SESSION_KEY  = "pastQueryList";   // array de ParkingState
const STATE_SESSION_KEY = "pastQueryState";  // ParkingState

function buildDatetime(date: string, time: string): string {
  const [h, m] = time.split(":").map(Number);
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCHours(h + 3, m, 0, 0);
  return base.toISOString();
}

export default function PastQuerier() {
  const [parkingLots, setParkingLots]     = useState<ParkingLot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>("");
  const [error, setError]                 = useState<string | null>(null);
  const [loadingLots, setLoadingLots]     = useState(true);
  const [showTo, setShowTo]               = useState(false);

  const [fromDate, setFromDate] = useState("");
  const [fromTime, setFromTime] = useState("00:00");
  const [toDate, setToDate]     = useState("");
  const [toTime, setToTime]     = useState("23:59");
  const [loading, setLoading]   = useState(false);

  const router = useRouter();

  useEffect(() => {
    async function fetchParkingLots() {
      try {
        const lots = await getParkingLots();
        setParkingLots(lots);
      } catch (err) {
        setError(
          "Error fetching parking lots from the server. Please try again."
        );
        console.error("Error fetching parking lots:", err);
      } finally {
        setLoadingLots(false);
      }
    }
    fetchParkingLots();
  }, []);

  function handleToggleTo() {
    if (showTo) {
      setToDate("");
      setToTime("23:59");
    }
    setShowTo((prev) => !prev);
  }

  async function handleSearch() {
    if (!selectedLotId) {
      setError("Please select a parking lot.");
      return;
    }
    if (!fromDate) {
      setError("Please select a 'From' date.");
      return;
    }
    if (showTo && !toDate) {
      setError(
        "Please select a 'To' date, or collapse the section to do a point-in-time query."
      );
      return;
    }
    if (showTo && toDate) {
      const fromDt = new Date(buildDatetime(fromDate, fromTime));
      const toDt   = new Date(buildDatetime(toDate, toTime));
      if (toDt <= fromDt) {
        setError("The 'To' datetime must be after the 'From' datetime.");
        return;
      }
    }

    setError(null);
    setLoading(true);

    // Resolve lot name once — used in URL params for both branches
    const lotName = parkingLots.find((l) => l.id === selectedLotId)?.name ?? "";

    try {
      if (!showTo || !toDate) {
        // ── Point-in-time query ──────────────────────────────────────────
        const dtIso = buildDatetime(fromDate, fromTime);
        const state = await getStateAt(selectedLotId, dtIso);
        sessionStorage.setItem(STATE_SESSION_KEY, JSON.stringify(state));

        // Bake datetime + lotId + lotName into URL so the state page can
        // re-fetch on refresh / direct link without needing sessionStorage.
        const params = new URLSearchParams({
          datetime: dtIso,
          lotId:    selectedLotId,
          lotName,
        });
        router.push(`/pastQueries/state?${params.toString()}`);
      } else {
        // ── Range query ──────────────────────────────────────────────────
        const fromIso = buildDatetime(fromDate, fromTime);
        const toIso   = buildDatetime(toDate, toTime);

        const states = await getStatesBetween(selectedLotId, fromIso, toIso);
        sessionStorage.setItem(LIST_SESSION_KEY, JSON.stringify(states));

        const params = new URLSearchParams({
          fromDatetime: fromIso,
          toDatetime:   toIso,
          lotId:        selectedLotId,
          lotName,
        });
        router.push(`/pastQueries/list?${params.toString()}`);
      }
    } catch (err) {
      console.error("Query error:", err);
      setError("Failed to fetch data. Is the backend running?");
      setLoading(false);
    }
  }

  const canSearch =
    !loading && !loadingLots && !!selectedLotId && !!fromDate && !!fromTime;

  return (
    <>
      {loading && (
        <div
          role="status"
          aria-label="Fetching parking data…"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/60 backdrop-blur-sm"
        >
          <Loader2 className="size-16 animate-spin text-white" />
          <p className="text-2xl font-semibold tracking-wide text-white">
            Fetching data…
          </p>
        </div>
      )}

      <Card title="What are you looking for?">
        <div className="flex flex-col w-full gap-2 lg:gap-4">

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

          <div className="flex gap-6 justify-between items-center">
            <h2>From:</h2>
            <div className="flex justify-end gap-2 lg:gap-4">
              <Input variant="date" value={fromDate} onChange={setFromDate} />
              <Input variant="time" value={fromTime} onChange={setFromTime} />
            </div>
          </div>

          <div className="group flex items-center w-full pr-3">
            <div className="h-1 flex-1 rounded-xl bg-primary-light transition-colors duration-150 group-hover:bg-primary" />
            <button type="button" className="cursor-pointer" onClick={handleToggleTo}>
              {showTo ? (
                <ChevronUp className="xl:size-8 transition-colors duration-150 group-hover:text-primary" />
              ) : (
                <ChevronDown className="xl:size-8 transition-colors duration-150 group-hover:text-primary" />
              )}
            </button>
          </div>

          {showTo && (
            <div className="flex gap-6 justify-between items-center">
              <h2>To:</h2>
              <div className="flex justify-end gap-2 lg:gap-4">
                <Input variant="date" value={toDate} onChange={setToDate} />
                <Input variant="time" value={toTime} onChange={setToTime} />
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-center text-red-500">
              {error}
            </p>
          )}

          <Button
            className="self-center"
            disabled={!canSearch}
            onClick={handleSearch}
          >
            Search
          </Button>

        </div>
      </Card>
    </>
  );
}