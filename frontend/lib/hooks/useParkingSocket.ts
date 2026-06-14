"use client";

import { useEffect, useState } from "react";
import type { ParkingState } from "../types/parking";

export function useParkingSocket(parkingId: string) {

  const [connectionStatus, setConnectionStatus] = useState<"connecting"|"open"|"closed"|"error"|"max-attempts-reached">("connecting");
  const [latestState, setLatestState] = useState<ParkingState | null>(null);
  
    useEffect(() => {
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    let ws: WebSocket;

    function scheduleReconnect() {
        console.warn(`WebSocket connection failed. Attempting to reconnect in ${Math.min(1000 * 2 ** attempts, 30_000) / 1000} seconds...`);
        const MAX_ATTEMPTS = 8;
        if (attempts >= MAX_ATTEMPTS) {
            setConnectionStatus("max-attempts-reached");
            return
        };
        const delay = Math.min(1000 * 2 ** attempts, 30_000); // Va esperando exponencialmente más, hasta un máximo de 30 segundos
        attempts++;
        timer = setTimeout(connect, delay);
    }

    function connect() {
        console.log(`Attempting to connect to WebSocket${attempts > 0 ? ` (attempt ${attempts + 1})` : ""}...`);
        setConnectionStatus("connecting");
        ws = new WebSocket(
        `${process.env.NEXT_PUBLIC_WS_URL}/${parkingId}`
        );
        ws.onopen    = () => { setConnectionStatus("open"); attempts = 0; };
        ws.onmessage = (e) => { 
            const data : ParkingState = JSON.parse(e.data);
            setLatestState(data) };
        ws.onerror   = ()  => {
            console.error("WebSocket error occurred.");
            setConnectionStatus("error");
        }; 
        ws.onclose   = (event)  => { 
            console.log(`WebSocket connection closed. Code ${event.code}, Reason: ${event.reason}`);
            console.log(`Clean? ${event.wasClean}`)
            setConnectionStatus("closed"); 
            scheduleReconnect(); 
        };
    }

    connect();

    return () => {
        clearTimeout(timer);
        ws?.close();
    };
    }, [parkingId]);

  return { connectionStatus, latestState };
}
