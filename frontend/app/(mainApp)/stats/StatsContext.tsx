"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { getParkingLots } from "@/lib/api/parkingLots";

interface ParkingLot {
  id: string;
  name: string;
}

interface StatsContextValue {
  parkingLots: ParkingLot[];
  loadingLots: boolean;
  lotsError: string | null;
  selectedLotId: string;
  selectedLotName: string;
  setSelectedLot: (id: string, name: string) => void;
  fromDate: string;
  setFromDate: (d: string) => void;
  toDate: string;
  setToDate: (d: string) => void;
}

const StatsContext = createContext<StatsContextValue | null>(null);

export function StatsProvider({ children }: { children: ReactNode }) {
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [loadingLots, setLoadingLots] = useState(true);
  const [lotsError, setLotsError] = useState<string | null>(null);
  const [selectedLotId, setSelectedLotId] = useState("");
  const [selectedLotName, setSelectedLotName] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    getParkingLots()
      .then(setParkingLots)
      .catch(() =>
        setLotsError(
          "Error fetching parking lots from the server. Please try again."
        )
      )
      .finally(() => setLoadingLots(false));
  }, []);

  function setSelectedLot(id: string, name: string) {
    setSelectedLotId(id);
    setSelectedLotName(name);
  }

  return (
    <StatsContext.Provider
      value={{
        parkingLots,
        loadingLots,
        lotsError,
        selectedLotId,
        selectedLotName,
        setSelectedLot,
        fromDate,
        setFromDate,
        toDate,
        setToDate,
      }}
    >
      {children}
    </StatsContext.Provider>
  );
}

export function useStatsContext() {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error("useStatsContext must be used within a StatsProvider");
  return ctx;
}