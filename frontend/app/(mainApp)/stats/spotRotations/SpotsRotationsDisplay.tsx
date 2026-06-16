"use client";
import type { SpotsRotationsResult } from "@/lib/api/stats";
import DetailedParkingDisplay from "@/components/DetailedParkingDisplay";

interface SpotsRotationsDisplayProps {
    data: SpotsRotationsResult;
    parkingName: string;
}

export default function SpotsRotationsDisplay({
    data,
    parkingName,
}: SpotsRotationsDisplayProps) {
    const entries       = Object.entries(data.rotations);
    const numericValues = entries
        .map(([, v]) => Number(v))
        .filter((v) => !isNaN(v));

    const avgRotations =
        numericValues.length > 0
            ? (numericValues.reduce((a, b) => a + b, 0) / numericValues.length).toFixed(1)
            : "—";

    const subheading = `Average spot rotations: ${avgRotations}`;

    const formattedSpots: Record<string, string> = Object.fromEntries(
        entries.map(([spotId, value]) => [spotId, String(value)])
    );

    return (
        <DetailedParkingDisplay
            title={parkingName}
            subheading={subheading}
            spots={formattedSpots}
            emptyMessage="No rotation data found for this period."
        />
    );
}