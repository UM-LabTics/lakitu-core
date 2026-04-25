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
        setConnectionStatus("connecting");
        ws = new WebSocket(
        `${process.env.NEXT_PUBLIC_WS_URL}/${parkingId}`
        );
        ws.onopen    = () => { setConnectionStatus("open"); attempts = 0; };
        ws.onmessage = (e) => { 
            const data : ParkingState = JSON.parse(e.data);
            setLatestState(data) };
        ws.onerror   = ()  => setConnectionStatus("error");
        ws.onclose   = ()  => { setConnectionStatus("closed"); scheduleReconnect(); };
    }

    connect();

    return () => {
        clearTimeout(timer);
        ws?.close();
    };
    }, [parkingId]);

  return { connectionStatus, latestState };
}
