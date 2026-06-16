"use client";
import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { StatsProvider, useStatsContext } from "./StatsContext";
import Select from "@/components/Select";
import Input from "@/components/Input";
import AdminButtonGrid from "./StatsButtonGrid";

function StatsControls() {
  const pathname = usePathname();
  const isSingleDate = pathname?.includes("/dailyOccupancy") ?? false;

  const {
    parkingLots,
    loadingLots,
    lotsError,
    selectedLotId,
    setSelectedLot,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
  } = useStatsContext();

  return (
    <>
      {lotsError && (
        <p className="w-full text-sm md:text-base lg:text-lg xl:text-xl text-red-600 text-center">
          {lotsError}
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
          value={selectedLotId}
          onChange={(id) =>
            setSelectedLot(id, parkingLots.find((l) => l.id === id)?.name ?? "")
          }
        />

        {isSingleDate ? (
          <Input variant="date" value={fromDate} onChange={setFromDate} />
        ) : (
          <>
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-xs text-primary-light pl-1 select-none">From</span>
              <Input variant="date" value={fromDate} onChange={setFromDate} />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-xs text-primary-light pl-1 select-none">To</span>
              <Input variant="date" value={toDate} onChange={setToDate} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <StatsProvider>
      <div className="w-17/20 lg:w-3/4 xl:w-1/2 h-full flex flex-col items-center min-h-120 gap-8 pb-8">
        <StatsControls />
        <div className="flex-1 min-h-85 w-full">{children}</div>
        <AdminButtonGrid />
      </div>
    </StatsProvider>
  );
}