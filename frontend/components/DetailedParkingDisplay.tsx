"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import { AccessibilityIcon } from "lucide-react";
import Card from "@/components/Card";

const ROWS = 2;

interface ParkingSpotProps {
    label: string;
    accessibility: boolean;
    width?: number;
    height?: number;
}

function ParkingSpot({ label, accessibility, width, height }: ParkingSpotProps) {
    const iconSize = width !== undefined ? Math.round(width * 0.45) : 16;
    const fontSize = width !== undefined ? Math.max(8, Math.round(width * 0.26)) : 12;

    return (
        <div
            className="flex flex-col bg-primary-light justify-center items-center overflow-hidden gap-1"
            style={
                width !== undefined && height !== undefined
                    ? { width, height, borderRadius: width / 10 }
                    : { aspectRatio: "1 / 2" }
            }
        >
            {accessibility ? (
                <AccessibilityIcon size={iconSize} className="text-primary-super-light" />
            ) : (
                <div style={{ width: iconSize, height: iconSize }} />
            )}
            <span className="text-primary-super-light" style={{ fontSize }}>
                {label}
            </span>
        </div>
    );
}

export interface DetailedParkingDisplayProps {
    title: string;
    subheading: string;
    spots: Record<string, string>;
    emptyMessage?: string;
}

export default function DetailedParkingDisplay({
    title,
    subheading,
    spots: spotEntries,
    emptyMessage = "No data found for this period.",
}: DetailedParkingDisplayProps) {
    const gridRef = useRef<HTMLDivElement>(null);
    const [spotDims, setSpotDims] = useState<{ width: number; height: number } | null>(null);

    const spots = Object.entries(spotEntries);
    const total = spots.length;

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
                <Card title={title} variant="light" className="w-full h-full items-center">
                    <p className="text-center text-primary-light">{emptyMessage}</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col justify-start items-center w-full h-full">
            <Card title={title} variant="light" className="w-full h-full items-center">
                <div className="flex flex-col h-full w-full gap-2">

                    <div className="-translate-y-4 w-full">
                        <p className="text-center text-primary text-base xl:text-xl">
                            {subheading}
                        </p>
                        <div className="w-full h-1 bg-primary-light rounded-xl" />
                    </div>

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
                                        {spots.slice(start, start + count).map(([spotId, label]) => {
                                            const isAccessibility = parseInt(spotId.slice(5)) + 1 > total;
                                            return (
                                                <ParkingSpot
                                                    key={spotId}
                                                    label={label}
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

                </div>
            </Card>
        </div>
    );
}