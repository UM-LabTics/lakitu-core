"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";
import { getStatesBetween } from "@/lib/api/events";
import { Loader2 } from "lucide-react";
import { StatesResponse } from "@/lib/types/parking";
import { useRouter } from "next/navigation";

interface ParkingSpot {
  spot_id: string;
  status: number;
}

export interface ParkingState {
  free_spots: number;
  image_url: string | null;
  pi_timestamp: string; // ISO 8601, "2026-06-03T04:00:00+00:00"
  spots: ParkingSpot[];
}

interface Props {
  fromDatetime: string;
  toDatetime:   string;
  lotId:        string;
  lotName:      string; // forwarded into each state's URL for PastStateView
}

export const LIST_SESSION_KEY  = "pastQueryList";
export const STATE_SESSION_KEY = "pastQueryState";

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return [
    String(d.getUTCDate()).padStart(2, "0"),
    String(d.getUTCMonth() + 1).padStart(2, "0"),
    d.getUTCFullYear(),
  ].join("/");
}

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const date = [
    String(d.getUTCDate()).padStart(2, "0"),
    String(d.getUTCMonth() + 1).padStart(2, "0"),
    d.getUTCFullYear(),
  ].join("/");
  const time = [
    String(d.getUTCHours()).padStart(2, "0"),
    String(d.getUTCMinutes()).padStart(2, "0"),
  ].join(":");
  return `${date} ${time}`;
}

export default function PastQueriesList({ fromDatetime, toDatetime, lotId, lotName }: Props) {
  const [states, setStates]   = useState<ParkingState[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    // ── Fast path: data came straight from PastQuerier via sessionStorage ──
    try {
      const raw = sessionStorage.getItem(LIST_SESSION_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setStates(parsed as ParkingState[]);
          setLoading(false);
          return;
        }
      }
    } catch {
      // sessionStorage unavailable or JSON malformed — fall through to fetch
    }

    // ── Fallback: re-fetch using URL params (direct link / refresh / back) ──
    if (!fromDatetime || !toDatetime || !lotId) {
      setError("Missing query parameters. Please go back and search again.");
      setLoading(false);
      return;
    }

    getStatesBetween(lotId, fromDatetime, toDatetime)
      .then((data: StatesResponse) => {
        try {
          sessionStorage.setItem(LIST_SESSION_KEY, JSON.stringify(data.items));
        } catch { /* quota exceeded — non-fatal */ }
        setStates(data.items);
      })
      .catch(() =>
        setError("Failed to fetch states. Is the backend running?")
      )
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStateClick(state: ParkingState) {
    try {
      sessionStorage.setItem(STATE_SESSION_KEY, JSON.stringify(state));
    } catch { /* quota exceeded — non-fatal; state page will fall back to fetch */ }

    // Pass datetime + lotId + lotName so the state page can re-fetch on
    // refresh or direct link without depending on sessionStorage being present.
    const params = new URLSearchParams({
      datetime: state.pi_timestamp,
      lotId,
      lotName,
    });
    router.push(`/pastQueries/state?${params.toString()}`);
  }

  return (
    <Card title="Past States" className="min-w-1/3">
      <div className="flex flex-col w-full">
        <div className="-translate-y-4">
          <p className="text-center text-primary text-base xl:text-xl">
            {formatDate(fromDatetime)}&nbsp;&ndash;&nbsp;{formatDate(toDatetime)}
          </p>
          <div className="w-full h-1 bg-primary-light rounded-xl" />
        </div>

        {loading && (
          <div className="flex justify-center py-8" role="status" aria-label="Loading states…">
            <Loader2 className="size-8 animate-spin" />
          </div>
        )}

        {!loading && error && (
          <p role="alert" className="text-sm text-center text-red-600 py-4">
            {error}
          </p>
        )}

        {!loading && !error && states?.length === 0 && (
          <p className="text-base text-center py-4 text-primary">
            No records found for this date range.
          </p>
        )}

        {!loading && !error && states && states.length > 0 && (
          <div className="flex flex-col max-h-[40vh] overflow-y-auto -translate-y-4
            [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {states.map((state, i) => (
              <div
                key={`${state.pi_timestamp}-${i}`}
                role="button"
                tabIndex={0}
                onClick={() => handleStateClick(state)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleStateClick(state);
                }}
                className={[
                  "flex justify-between items-center",
                  "cursor-pointer select-none",
                  "px-2 py-2 rounded",
                  "hover:bg-primary-light/20 active:bg-primary-light/40",
                  "transition-colors duration-100",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                ].join(" ")}
              >
                <span className="text-base xl:text-lg text-secondary-dark tabular-nums">
                  {formatDateTime(state.pi_timestamp)}
                </span>
                <span className={`text-base xl:text-lg ${state.free_spots === 0 ? "text-occupied" : "text-secondary-dark"} tabular-nums`}>
                  {state.free_spots} free spot{state.free_spots !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="w-full h-1 bg-primary-light rounded-xl -translate-y-4" />
      </div>
    </Card>
  );
}