import type { ParkingStateSnapshot, StatesResponse } from "@/lib/types/parking";
import { authenticatedFetch } from "./aux";

// Va a haber que usar authenticatedFetch en lugar de fetch para incluir el token de autenticación en las solicitudes a la API, 
// pero por ahora lo dejamos así pq Santi no implementó la necesidad de tokens en el back.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function getStateAt(
  parkingId: string,
  from: string,  // ISO datetime string e.g. "2026-05-19T10:00:00"
): Promise<ParkingStateSnapshot> {
  const url = `${API_URL}/api/events?parking_id=${parkingId}&from=${encodeURIComponent(from)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Error: ${response.status}`);
  return response.json();
}

export async function getStatesBetween(
  parkingId: string,
  from: string,  // ISO datetime string
  to: string,    // ISO datetime string
  limit: number = 20,
  page: number = 1,
): Promise<StatesResponse> {
  const url = `${API_URL}/api/events?parking_id=${parkingId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=${limit}&page=${page}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Error: ${response.status}`);
  return response.json();
}