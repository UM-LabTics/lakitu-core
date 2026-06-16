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

export async function takePhoto(parking_id: string): Promise<string> {
    const url = `${API_URL}/takePhoto?parkingId=${parking_id}`;
    const token = (await cookies()).get("session_token")?.value;

    const response = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
        throw new Error(`Error while establishing a connection to the camera: ${response.status}`);
    }

    const data = await response.json();
    console.log("====================================")
    console.log(data)

    const base64 = data[0].snapshot;
    if (!base64) {
        throw new Error("No snapshot returned from device.");
    }

    return `data:image/jpeg;base64,${base64}`;
}