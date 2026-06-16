"use client";
import { useState, useEffect } from "react";
import Card from "@/components/Card";
import { getParkingLots } from "@/lib/api/parkingLots";
import type { SpotsRotationsResult } from "@/lib/api/stats";
import SpotsRotationsDisplay from "./SpotsRotationsDisplay";
import { getSpotsRotations } from "@/lib/api/stats";
import Select from "@/components/Select";
import Input from "@/components/Input";

interface ParkingLot {
    id: string;
    name: string;
}

export default function SpotsRotationsPage() {
    const [error, setError]                       = useState<string | null>(null);
    const [loadingLots, setLoadingLots]           = useState(true);
    const [loadingRotations, setLoadingRotations] = useState(false);
    const [parkingLots, setParkingLots]           = useState<ParkingLot[]>([]);
    const [selectedLotId, setSelectedLotId]       = useState("");
    const [selectedLotName, setSelectedLotName]   = useState("");
    const [fromDate, setFromDate]                 = useState("");
    const [toDate, setToDate]                     = useState("");
    const [rotationsData, setRotationsData]       = useState<SpotsRotationsResult | null>(null);

    useEffect(() => {
        getParkingLots()
            .then(setParkingLots)
            .catch(() => setError("Error fetching parking lots from the server. Please try again."))
            .finally(() => setLoadingLots(false));
    }, []);

    useEffect(() => {
        if (!selectedLotId || !fromDate || !toDate) return;
        if (fromDate > toDate) {
            setError("The start date cannot be later than the end date.");
            return;
        }
        setError(null);
        setRotationsData(null);
        setLoadingRotations(true);
        getSpotsRotations(selectedLotId, fromDate, toDate)
            .then(setRotationsData)
            .catch(() => setError("Error fetching spot rotation data. Please try again."))
            .finally(() => setLoadingRotations(false));
    }, [selectedLotId, fromDate, toDate]);

    const placeholder =
        !selectedLotId          ? "Select a parking lot to begin."
        : !fromDate || !toDate  ? "Select a date range to view spot rotations."
        : loadingRotations      ? "Loading rotation data…"
        : null;

    return (
        <div className="flex flex-col items-center justify-start h-full w-full pb-8 gap-8">

            {error && (
                <p className="w-full text-sm md:text-base lg:text-lg xl:text-xl text-red-600 text-center">
                    {error}
                </p>
            )}

            <div className="flex w-full h-fit gap-4 items-end">
                <Select
                    disabled={loadingLots || parkingLots.length === 0}
                    placeholder={
                        loadingLots
                            ? "Loading your parking lots…"
                            : parkingLots.length === 0
                            ? "Oops! You don't have access to any lot."
                            : "Select a parking lot"
                    }
                    options={parkingLots.map((lot) => ({ label: lot.name, value: lot.id }))}
                    onChange={(id) => {
                        setSelectedLotId(id);
                        setSelectedLotName(parkingLots.find((l) => l.id === id)?.name ?? "");
                        setRotationsData(null);
                    }}
                />

                <div className="flex flex-col gap-1 flex-1">
                    <span className="text-xs text-primary-light pl-1 select-none">From</span>
                    <Input variant="date" value={fromDate} onChange={setFromDate} />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                    <span className="text-xs text-primary-light pl-1 select-none">To</span>
                    <Input variant="date" value={toDate} onChange={setToDate} />
                </div>
            </div>

            <div className="flex-1 min-h-0 w-full">
                {placeholder ? (
                    <Card variant="light" className="h-full w-full">
                        <div className="flex items-center justify-center h-full text-primary text-md md:text-lg lg:text-xl xl:text-2xl">
                            {placeholder}
                        </div>
                    </Card>
                ) : rotationsData ? (
                    <SpotsRotationsDisplay
                        data={rotationsData}
                        parkingName={selectedLotName}
                    />
                ) : null}
            </div>

        </div>
    );
}