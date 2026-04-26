import json
from fastapi.testclient import TestClient
from app.main import app


def main() -> None:
    with TestClient(app) as client:
        # 1) WebSocket connection/register
        with client.websocket_connect("/ws/parking-1") as websocket:
            print("WebSocket connected")

            # 2) Broadcast message to connected clients
            payload = {
                "parking_id": "parking-1",
                "message": {"type": "smoke", "status": "ok"},
            }
            response = client.post("/api/debug/broadcast", json=payload)
            response.raise_for_status()
            print("Broadcast endpoint returned:", response.json())

            message = websocket.receive_json()
            print("WebSocket received broadcast:", json.dumps(message, indent=2, ensure_ascii=False))

        # 3) REST endpoint responds correctly
        rest_resp = client.get("/api/events?from=2024-01-01&to=2024-01-02")
        print("REST /api/events status:", rest_resp.status_code)
        print("REST /api/events response:", json.dumps(rest_resp.json(), indent=2, ensure_ascii=False))
        rest_resp.raise_for_status()

    print("Smoke test passed")


if __name__ == "__main__":
    main()
