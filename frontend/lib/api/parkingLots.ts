"use server";
import { cookies } from "next/headers";

const API_URL = process.env.BACKEND_INTERNAL_URL ?? "http://backend:8000";

export async function getParkingLots() {
    const url = `${API_URL}/getParkings`;
    const token = (await cookies()).get("session_token")?.value
    const response = await fetch(url,{method:"GET",headers:{Authorization:`Bearer ${token}`}})
    if (!response.ok) {
        throw new Error(`error while fetching parking lots: ${response.status}`);
    }

    return await response.json();}
