"use client";

import { useState } from "react";

interface ParkingSpot {
  spot_id: string;
  status: 0 | 1;
}

interface ParkingStateSnapshot {
  pi_timestamp: string;
  free_spots: number;
  image_url: string | null;
  spots: ParkingSpot[];
}

interface StatesResponse {
  total_states: number;
  states: ParkingStateSnapshot[];
}

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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      let url = `${apiUrl}/api/events?parking_id=mock-01&from=${fromDate}`;
      if (toDate) url += `&to=${toDate}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Error: ${response.status}`);

      const data = await response.json();

      // If no to_date, backend returns a single state snapshot directly
      if (!toDate) {
        setSingleState(data as ParkingStateSnapshot);
      } else {
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
    return (
      <>
        <p>Free: {free || "none"}</p>
        <p>Occupied: {occupied || "none"}</p>
      </>
    );
  }

  return (
    <div>
      <h1>Past Queries</h1>
      <p>Query historical parking lot states by date range.</p>

      <div>
        <label>
          From:
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </label>
        <label>
          To (optional):
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </label>
        <button onClick={handleSearch} disabled={loading}>
          {loading ? "Loading..." : "Search"}
        </button>
      </div>

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