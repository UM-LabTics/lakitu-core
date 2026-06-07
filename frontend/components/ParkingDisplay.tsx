"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Card from "@/components/Card";
import Spinner from "@/components/LoadingSpinner";
import SpotDisplay from "@/components/SpotDisplay";

export type SocketStatus =
  | "connecting"
  | "open"
  | "closed"
  | "error"
  | "max-attempts-reached";

export type ParkingState = {
  parking_name: string;
  timestamp: string | number;
  spots: Array<{ spot_id: string; status: number }>;
};

interface ParkingDisplayProps {
  latestState:       ParkingState | null;
  connectionStatus?: SocketStatus;
}

const ROWS = 2;

function formatTimestamp(timestamp: string | number): string {
  const date = new Date(typeof timestamp === "number" ? timestamp * 1000 : timestamp);
  return date.toLocaleString("en-GB", {
    timeZone: "Etc/GMT+3",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

const NO_DATA_MESSAGES: Record<SocketStatus, string> = {
  connecting:             "Establishing connection…",
  open:                   "Connected — waiting for first update…",
  closed:                 "Connection lost — reconnecting…",
  error:                  "Connection error — retrying…",
  "max-attempts-reached": "Unable to connect to the parking lot.",
};

export default function ParkingDisplay({ latestState, connectionStatus }: ParkingDisplayProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [spotDims, setSpotDims] = useState<{ width: number; height: number } | null>(null);

  const computeSpotDims = useCallback(() => {
    const el = gridRef.current;
    if (!el || !latestState?.spots.length) return;

    const total          = latestState.spots.length;
    const maxSpotsPerRow = Math.ceil(total / ROWS);

    const style    = window.getComputedStyle(el);
    const rowGapPx = parseFloat(style.rowGap)    || 0;
    const colGapPx = parseFloat(style.columnGap) || 0;

    const availH = el.clientHeight - (ROWS - 1) * rowGapPx;
    let spotH    = availH / ROWS;
    let spotW    = spotH / 2;

    const maxRowW       = window.innerWidth * 0.667;
    const projectedRowW = maxSpotsPerRow * spotW + (maxSpotsPerRow - 1) * colGapPx;

    if (projectedRowW > maxRowW) {
      spotW = (maxRowW - (maxSpotsPerRow - 1) * colGapPx) / maxSpotsPerRow;
      spotH = spotW * 2;
    }

    setSpotDims((prev) => {
      if (prev && Math.abs(prev.width - spotW) < 0.5 && Math.abs(prev.height - spotH) < 0.5)
        return prev;
      return { width: spotW, height: spotH };
    });
  }, [latestState]);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    computeSpotDims();

    const ro = new ResizeObserver(computeSpotDims);
    ro.observe(el);
    window.addEventListener("resize", computeSpotDims);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", computeSpotDims);
    };
  }, [computeSpotDims]);

  const status = connectionStatus ?? "connecting";

  return (
    <div className="flex flex-col justify-start items-center sm:items-end w-full h-full">
      {!latestState ? (
        <Card title="Parking Lot" className="h-17/20 w-1/2">
          <div className="-translate-y-4">
              <p className="text-center text-primary text-base xl:text-xl">
                {NO_DATA_MESSAGES[status]}
              </p>
              <div className="w-full h-1 bg-primary-light rounded-xl" />
            </div>
          <div className="flex flex-col items-center justify-center gap-3 h-full">
            {status !== "max-attempts-reached" && <Spinner />}
          </div>
        </Card>
      ) : (
        <Card title={latestState.parking_name} className="min-h-17/20 items-center">
          <div className="flex flex-col h-full gap-2">
            <div className="-translate-y-4">
              <p className="text-center text-primary text-base xl:text-xl">
                Updated {formatTimestamp(latestState.timestamp)}
              </p>
              <div className="w-full h-1 bg-primary-light rounded-xl" />
            </div>

            {connectionStatus !== undefined && connectionStatus !== "open" && (
              <div className="w-full py-1.5 px-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-sm xl:text-base text-center">
                ⚠ Connection lost — showing last known state
              </div>
            )}

            <div
              ref={gridRef}
              className="flex flex-col gap-4 xl:gap-8 justify-center items-center flex-1"
            >
              {(() => {
                const total = latestState.spots.length;
                const base  = Math.floor(total / ROWS);
                const extra = total % ROWS;

                return [...Array(ROWS)].map((_, rowIndex) => {
                  const start = rowIndex * base + Math.min(rowIndex, extra);
                  const count = base + (rowIndex < extra ? 1 : 0);

                  return (
                    <div key={rowIndex} className="flex gap-4 xl:gap-8">
                      {latestState.spots.slice(start, start + count).map((spot) => (
                        <SpotDisplay
                          key={spot.spot_id}
                          occupied={spot.status === 1}
                          accessibility={parseInt(spot.spot_id.slice(5)) + 2 > total}
                          width={spotDims?.width}
                          height={spotDims?.height}
                        />
                      ))}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}