import type { ParkingStateSnapshot, StatesResponse } from "@/lib/types/parking";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function getStateAt(
  parkingId: string,
  from: string,
): Promise<ParkingStateSnapshot> {
  const url = `${API_URL}/api/events?parking_id=${parkingId}&from=${from}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Error: ${response.status}`);
  return response.json();
}

export async function getStatesBetween(
  parkingId: string,
  from: string,
  to: string,
  limit: number = 20,
  page: number = 1,
): Promise<StatesResponse> {
  const url = `${API_URL}/api/events?parking_id=${parkingId}&from=${from}&to=${to}&limit=${limit}&page=${page}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Error: ${response.status}`);
  return response.json();
}