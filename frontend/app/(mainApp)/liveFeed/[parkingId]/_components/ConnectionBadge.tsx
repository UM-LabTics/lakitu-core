"use client";

type SocketStatus = "connecting" | "open" | "closed" | "error" | "max-attempts-reached";

export function ConnectionBadge({ connectionStatus }: { connectionStatus: SocketStatus }) {
  const labels: Record<SocketStatus, string> = {
    "connecting": "Connecting...",
    "open":       "Connected",
    "closed":     "Disconnected — reconnecting...",
    "error":      "Connection error",
    "max-attempts-reached": "Max connection attempts reached. Unable to connect.",
  };

  return <p>Status: {labels[connectionStatus]}</p>;
}