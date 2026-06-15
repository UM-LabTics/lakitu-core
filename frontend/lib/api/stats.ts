"use server";
import { cookies } from "next/headers";

const API_URL = `${process.env.BACKEND_INTERNAL_URL ?? "http://backend:8000"}/api/stats`;

export async function getDailyOccupancy(parking_id:string,day:string) {
    const url = `${API_URL}/dailyOccupancy?parkingId=${encodeURIComponent(parking_id)}&day=${encodeURIComponent(day)}`;
    console.log(url)
    const token = (await cookies()).get("session_token")?.value
    const response = await fetch(url,{method:"GET",headers:{Authorization:`Bearer ${token}`}})
    if (!response.ok) {
        throw new Error(`error ${response.status} ${response.statusText} while fetching daily occupancy.`);
    }
    const stats = await response.json();
    console.log(stats);

    return stats;
}