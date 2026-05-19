"use client";

import { useState } from "react";
import { getStateAt, getStatesBetween } from "@/lib/api/events";
import type { ParkingSpot, ParkingStateSnapshot, StatesResponse } from "@/lib/types/parking";
import Input from "@/components/Input";

export default function PastQueries() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [results, setResults] = useState<StatesResponse | null>(null);
  const [singleState, setSingleState] = useState<ParkingStateSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!fromDate) {
      setError("Please select at least a from date.");
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);
    setSingleState(null);

    try {
    if (!toDate) {
      const data = await getStateAt("mock-01", fromDate);
      setSingleState(data as ParkingStateSnapshot);
    } else {
      const data = await getStatesBetween("mock-01", fromDate, toDate);
      setResults(data as StatesResponse);
    }
  } catch (err) {
    setError("Failed to fetch events. Is the backend running?");
  } finally {
    setLoading(false);
  }
}

  function renderSpots(spots: ParkingSpot[]) {
    const free = spots.filter((s) => s.status === 0).map((s) => s.spot_id).join(", ");
    const occupied = spots.filter((s) => s.status === 1).map((s) => s.spot_id).join(", ");
    const unknown = spots.filter((s) => s.status === -1).map((s)=> s.spot_id).join(", ");
    return (
      <>
        <p>Free: {free || "none"}</p>
        <p>Occupied: {occupied || "none"}</p>
        {unknown && <p>No data: {unknown}</p>}
      </>
    );
  }

  return (
    <div>
      <h1>Past Queries</h1>
      <p>Query historical parking lot states by date range.</p>

      <div>
        <p>From:</p>
        <Input
          variant="date"
          value={fromDate}
          onChange={(value) => setFromDate(value)}
        />
    </div>
    <div>
      <p>To (optional):</p>
      <Input
        variant="date"
        value={toDate}
        onChange={(value) => setToDate(value)}
      />
    </div>
    <button onClick={handleSearch} disabled={loading}>
      {loading ? "Loading..." : "Search"}
    </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Single state (no to_date) */}
      {singleState && (
        <div>
          <h2>State at {new Date(singleState.pi_timestamp).toLocaleString()}</h2>
          <p>Free spots: {singleState.free_spots}</p>
          {renderSpots(singleState.spots)}
        </div>
      )}

      {/* Multiple states (with to_date) */}
      {results && (
        <div>
          <p>Total states found: {results.total_states}</p>
          {results.states.map((snapshot, index) => (
            <div key={index} style={{ border: "1px solid gray", margin: "8px", padding: "8px" }}>
              <p>{new Date(snapshot.pi_timestamp).toLocaleString()}</p>
              <p>Free spots: {snapshot.free_spots}</p>
              {renderSpots(snapshot.spots)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}