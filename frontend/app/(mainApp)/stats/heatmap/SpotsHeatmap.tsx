"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import { AccessibilityIcon } from "lucide-react";
import type { SpotsUsageResult } from "@/lib/api/stats";

import Card from "@/components/Card";


// ---------- Constants ----------

const ROWS = 2;

// Matches the palette already used in OccupancyChart's gradient
const COLOR_GREEN  = [146, 215, 122]; // #92D77A – least used
const COLOR_YELLOW = [248, 238, 180]; // #F8EEB4 – mid
const COLOR_RED    = [224,  80,  80]; // #E05050 – most used


interface SpotsHeatmapProps {
    data: SpotsUsageResult;
    parkingName: string;
    fromDate: string; // "YYYY-MM-DD"
    toDate: string;   // "YYYY-MM-DD"
}

// ---------- Helpers ----------

function timeToSeconds(t: string): number {
    const [h, m, s] = t.split(":").map(Number);
    return h * 3600 + m * 60 + (s ?? 0);
}

/** t = 0 → least used (green), t = 1 → most used (red) */
function interpolateColor(t: number): string {
    const from = t <= 0.5 ? COLOR_GREEN  : COLOR_YELLOW;
    const to   = t <= 0.5 ? COLOR_YELLOW : COLOR_RED;
    const u    = t <= 0.5 ? t * 2        : (t - 0.5) * 2;
    const [r, g, b] = from.map((c, i) => Math.round(c + u * (to[i] - c)));
    return `rgb(${r}, ${g}, ${b})`;
}


// ---------- HeatmapSpot ----------

interface HeatmapSpotProps {
    color: string;
    accessibility: boolean;
    width?: number;
    height?: number;
}

function HeatmapSpot({
    color,
    accessibility,
    width,
    height,
}: HeatmapSpotProps) {
    const iconSize = width !== undefined ? Math.round(width * 0.6) : 16;

    return (
        <div className={`flex justify-center items-center overflow-hidden`}
            style={
                width !== undefined && height !== undefined
                ? { width, height, borderRadius: width / 10, backgroundColor:color }
                : { aspectRatio: "1 / 2", backgroundColor:color }
            } >
        {accessibility && (
            <AccessibilityIcon
            size={iconSize}
            color={color.replace(/\d+/g, n => String(Math.floor(Number(n) * 0.5)))}
            />
        )}
        </div>
    );
}

// ---------- SpotsHeatmap ----------

export default function SpotsHeatmap({
    data,
    parkingName,
}: SpotsHeatmapProps) {
    const gridRef = useRef<HTMLDivElement>(null);
    const [spotDims, setSpotDims] = useState<{ width: number; height: number } | null>(null);

    const spots = Object.entries(data.spotsUsage);
    const total = spots.length;

    const usageSeconds = spots.map(([, t]) => timeToSeconds(t));
    const minUsage = Math.min(...usageSeconds);
    const maxUsage = Math.max(...usageSeconds);

    const computeSpotDims = useCallback(() => {
        const el = gridRef.current;
        if (!el || !total) return;

        const maxSpotsPerRow = Math.ceil(total / ROWS);
        const cs         = window.getComputedStyle(el);
        const rowGap     = parseFloat(cs.rowGap) || 0;
        const firstRow   = el.children[0] as HTMLElement | undefined;
        const colGap     = firstRow
            ? parseFloat(window.getComputedStyle(firstRow).columnGap) || 0
            : 0;

        const availH = el.clientHeight - (ROWS - 1) * rowGap;
        let spotH    = availH / ROWS;
        let spotW    = spotH / 2;

        const maxRowW       = el.clientWidth;
        const projectedRowW = maxSpotsPerRow * spotW + (maxSpotsPerRow - 1) * colGap;
        if (projectedRowW > maxRowW) {
            spotW = (maxRowW - (maxSpotsPerRow - 1) * colGap) / maxSpotsPerRow;
            spotH = spotW * 2;
        }

        setSpotDims((prev) => {
            if (prev && Math.abs(prev.width - spotW) < 0.5 && Math.abs(prev.height - spotH) < 0.5)
                return prev;
            return { width: spotW, height: spotH };
        });
    }, [total]);

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

    if (total === 0) {
        return (
            <div className="flex flex-col justify-start items-center w-full h-full">
                <Card title={parkingName} className="w-full h-full items-center">
                    <p className="text-center text-primary-light">No usage data found for this period.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col justify-start items-center w-full h-full">
            <Card title={parkingName} variant="dark" className="w-full h-full items-center">
                <div className="flex flex-col h-full w-full gap-2">

                    <div
                        ref={gridRef}
                        className="flex flex-col gap-2 xl:gap-4 justify-center items-center flex-1"
                    >
                        {(() => {
                            const base  = Math.floor(total / ROWS);
                            const extra = total % ROWS;
                            return Array.from({ length: ROWS }, (_, rowIndex) => {
                                const start = rowIndex * base + Math.min(rowIndex, extra);
                                const count = base + (rowIndex < extra ? 1 : 0);
                                return (
                                    <div key={rowIndex} className="flex gap-2 xl:gap-4">
                                        {spots.slice(start, start + count).map(([spotId, time]) => {
                                            const secs = timeToSeconds(time);
                                            const t    = maxUsage === minUsage
                                                ? 0.5
                                                : (secs - minUsage) / (maxUsage - minUsage);
                                            const isAccessibility = parseInt(spotId.slice(5)) + 2 > total;
                                            return (
                                                <HeatmapSpot
                                                    key={spotId}
                                                    color={interpolateColor(t)}
                                                    accessibility={isAccessibility}
                                                    width={spotDims?.width  ?? 52}
                                                    height={spotDims?.height ?? 104}
                                                />
                                            );
                                        })}
                                    </div>
                                );
                            });
                        })()}
                    </div>

                    <div className="flex items-center justify-center gap-3 flex-shrink-0">
                        <span className="text-xs lg:text-sm text-primary-super-light select-none">Least used</span>
                        <div
                            className="h-3 w-36 rounded-full flex-shrink-0"
                            style={{
                                background:
                                    "linear-gradient(to right, rgb(146,215,122), rgb(248,238,180), rgb(224,80,80))",
                            }}
                        />
                        <span className="text-xs lg:text-sm text-primary-super-light select-none">Most used</span>
                    </div>

                </div>
            </Card>
        </div>
    );
}