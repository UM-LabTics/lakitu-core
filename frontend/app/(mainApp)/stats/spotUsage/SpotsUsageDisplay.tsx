"use client";
import type { SpotsUsageResult } from "@/lib/api/stats";
import DetailedParkingDisplay from "@/components/DetailedParkingDisplay";

interface SpotsTimeDisplayProps {
    data: SpotsUsageResult;
    parkingName: string;
    fromDate: string; // "YYYY-MM-DD"
    toDate: string;   // "YYYY-MM-DD"
}

export default function SpotsTimeDisplay({
    data,
    parkingName,
    fromDate,
    toDate,
}: SpotsTimeDisplayProps) {
    const msPerDay    = 24 * 60 * 60 * 1000;
    const days        = Math.round((new Date(toDate).getTime() - new Date(fromDate).getTime()) / msPerDay) + 1;
    const totalSeconds = days * 24 * 3600;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const totalTime = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

    const subheading = `Average spot usage: ${data.avgTime}hrs out of ${totalTime}hrs (${data.avgPercentage})`;

    const formattedSpots: Record<string, string> = Object.fromEntries(
        Object.entries(data.spotsUsage).map(([spotId, time]) => {
            const displayTime =
                Number(time.split(":")[0]) + Math.round(Number(time.split(":")[1]) / 30) / 2;
            return [spotId, `${displayTime}hrs`];
        })
    );

    return (
        <DetailedParkingDisplay
            title={parkingName}
            subheading={subheading}
            spots={formattedSpots}
            emptyMessage="No usage data found for this period."
        />
    );
}