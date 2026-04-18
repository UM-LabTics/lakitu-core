import base64
import datetime
import io
import json
import os
import threading
import time
import uuid
from pathlib import Path
from awscrt import mqtt5
from awsiot import mqtt5_client_builder
from PIL import Image

# ── Configuración ────────────────────────────────────────────────────────────────

IOT_ENDPOINT   = os.environ["IOT_ENDPOINT"]
IOT_CERT_PATH  = os.environ["IOT_CERT_PATH"]   # desde ./secrets/
IOT_KEY_PATH   = os.environ["IOT_KEY_PATH"]
IOT_TOPIC      = os.environ.get("IOT_TOPIC", "parking/state_update")
IOT_CLIENT_ID      = os.environ.get("IOT_CLIENT_ID", f"mock-pi-{uuid.uuid4().hex[:8]}")

MESSAGE_COUNT       = int(os.environ.get("MESSAGE_COUNT", "5"))     # 0 = ejecutar indefinidamente
SEND_INTERVAL       = float(os.environ.get("SEND_INTERVAL_SECONDS", "5"))
NUM_SPOTS           = int(os.environ.get("NUM_SPOTS", "30"))
PARKING_ID          = os.environ.get("PARKING_ID", "parking-1")
PARKING_NAME        = os.environ.get("PARKING_NAME", "LATU Parking")

TIMEOUT = 100   # segundos a esperar antes de declarar timeout en operaciones MQTT (conexión, publicación, etc.)

# ── Fuente de las imágenes ────────────────────────────────────────────────────────

IMAGES_DIR = Path("image_captures")
HARDCODED_IMAGE_PATHS = [IMAGES_DIR / f"lot_{i}.jpg" for i in range(1, 17)]

# ── Eventos del ciclo de vida MQTT ────────────────────────────────────────────────

connection_success_event = threading.Event()
stopped_event            = threading.Event()


def on_lifecycle_attempting_connect(data: mqtt5.LifecycleAttemptingConnectData):
    print(f"[pi_mock] Connecting to '{IOT_ENDPOINT}' as '{IOT_CLIENT_ID}'...")


def on_lifecycle_connection_success(data: mqtt5.LifecycleConnectSuccessData):
    print(f"[pi_mock] Connected. Reason: {data.connack_packet.reason_code!r}")
    connection_success_event.set()


def on_lifecycle_connection_failure(data: mqtt5.LifecycleConnectFailureData):
    print(f"[pi_mock] Connection failed: {data.exception}")


def on_lifecycle_disconnection(data: mqtt5.LifecycleDisconnectData):
    reason = (
        data.disconnect_packet.reason_code
        if data.disconnect_packet else "None"
    )
    print(f"[pi_mock] Disconnected. Reason: {reason}")


def on_lifecycle_stopped(data: mqtt5.LifecycleStoppedData):
    print("[pi_mock] MQTT client stopped.")
    stopped_event.set()


def on_publish_received(data):
    pkt = data.publish_packet
    print(f"[pi_mock] Received on '{pkt.topic}': {pkt.payload.decode()}")

# ── Construcción del payload ─────────────────────────────────────────────────────

def load_and_encode_image(index: int) -> str:

    image_path = HARDCODED_IMAGE_PATHS[index % len(HARDCODED_IMAGE_PATHS)]

    if image_path.exists():
        img = Image.open(image_path)
        if img.mode != "RGB":
            img = img.convert("RGB")
        img = img.resize((960, 540))
    else:
        # Fallback artificial de imagen gris 960×540
        img = Image.new("RGB", (960, 540), (255, 0, 0))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=70)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("ascii")


def build_payload(sequence_index: int) -> dict:

    base_time = datetime.datetime.now(datetime.timezone.utc)

    spots = []
    for spot_index in range(NUM_SPOTS):
        occupied = (sequence_index + spot_index) % 2 == 0
        confidence = 0.99 if spot_index % 2 == 0 else 0.96
        last_changed = (
            base_time - datetime.timedelta(seconds=spot_index * 3)
        ).isoformat()
        spots.append({
            "spot_id": f"spot_{spot_index + 1:02d}",
            "status": 1 if occupied else 0,
            "confidence": confidence,
            "last_changed": last_changed,
        })

    free_spots = sum(1 for s in spots if s["status"] == 0)

    return {
        "device_id": IOT_CLIENT_ID,
        "parking_id": PARKING_ID,
        "parking_name": PARKING_NAME,
        "timestamp": base_time.isoformat(),
        "seq": f"message_{sequence_index}",
        "snapshot": load_and_encode_image(sequence_index),
        "total_spots": NUM_SPOTS,
        "free_spots": free_spots,
        "spots": spots,
    }

# ── main ─────────────────────────────────────────────────────────────────────────

def main():
    print("[pi_mock] Starting MQTT5 mock device")
    print(f"[pi_mock]   endpoint  : {IOT_ENDPOINT}")
    print(f"[pi_mock]   topic     : {IOT_TOPIC}")
    print(f"[pi_mock]   client_id : {IOT_CLIENT_ID}")
    print(f"[pi_mock]   cert      : {IOT_CERT_PATH}")
    print(f"[pi_mock]   count     : {'∞' if MESSAGE_COUNT == 0 else MESSAGE_COUNT}")
    print(f"[pi_mock]   interval  : {SEND_INTERVAL}s")

    builder_kwargs = dict(
        endpoint=IOT_ENDPOINT,
        cert_filepath=IOT_CERT_PATH,
        pri_key_filepath=IOT_KEY_PATH,
        on_publish_received=on_publish_received,
        on_lifecycle_stopped=on_lifecycle_stopped,
        on_lifecycle_attempting_connect=on_lifecycle_attempting_connect,
        on_lifecycle_connection_success=on_lifecycle_connection_success,
        on_lifecycle_connection_failure=on_lifecycle_connection_failure,
        on_lifecycle_disconnection=on_lifecycle_disconnection,
        client_id=IOT_CLIENT_ID,
    )


    client = mqtt5_client_builder.mtls_from_path(**builder_kwargs)

    client.start()

    if not connection_success_event.wait(TIMEOUT):
        raise TimeoutError("[pi_mock] Timed out waiting for connection.")

    publish_index = 0
    run_forever = MESSAGE_COUNT == 0

    while run_forever or publish_index < MESSAGE_COUNT:
        payload = build_payload(publish_index)
        payload_bytes = json.dumps(payload).encode("utf-8")

        print(
            f"[pi_mock] Publishing message {publish_index + 1}"
            + ("" if run_forever else f"/{MESSAGE_COUNT}")
            + f" to '{IOT_TOPIC}' ({len(payload_bytes):,} bytes)"
        )

        future = client.publish(mqtt5.PublishPacket(
            topic=IOT_TOPIC,
            payload=payload_bytes,
            qos=mqtt5.QoS.AT_LEAST_ONCE,
        ))
        result = future.result(TIMEOUT)
        print(f"[pi_mock] PubAck: {result.puback.reason_code!r}")

        publish_index += 1
        time.sleep(SEND_INTERVAL)

    print("[pi_mock] All messages sent. Stopping client.")
    client.stop()

    if not stopped_event.wait(TIMEOUT):
        raise TimeoutError("[pi_mock] Timed out waiting for stop.")

    print("[pi_mock] Done.")


if __name__ == "__main__":
    main()