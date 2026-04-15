
import datetime
import io
import json
import base64
from pathlib import Path

from awsiot import mqtt5_client_builder
from awscrt import mqtt5
import threading, time
import argparse, uuid
from PIL import Image

parser = argparse.ArgumentParser(
    description="Mock iot device",
    formatter_class=argparse.ArgumentDefaultsHelpFormatter,
)
required = parser.add_argument_group("required arguments")
optional = parser.add_argument_group("optional arguments")

# Required Arguments
required.add_argument("--endpoint", required=True, metavar="", dest="input_endpoint",
                      help="IoT endpoint hostname")
required.add_argument("--cert", required=True, metavar="", dest="input_cert",
                    help="Path to the certificate file to use during mTLS connection establishment")
required.add_argument("--key", required=True, metavar="", dest="input_key",
                    help="Path to the private key file to use during mTLS connection establishment")

# Optional Arguments
optional.add_argument("--client_id", metavar="",dest="input_clientId", default=f"mqtt5-sample-{uuid.uuid4().hex[:8]}",
                      help="Client ID")
optional.add_argument("--topic", metavar="",default="no-topic", dest="input_topic",
                      help="Topic")
optional.add_argument("--message", metavar="",default="no-message", dest="input_message",
                      help="Message payload")
optional.add_argument("--count", type=int, metavar="",default=5, dest="input_count",
                      help="Messages to publish")

# args contains all the parsed commandline arguments
args = parser.parse_args()

TIMEOUT = 100
message_count = args.input_count
message_topic = args.input_topic
message_string = args.input_message
# Events used within callbacks to progress sample
connection_success_event = threading.Event()
stopped_event = threading.Event()
received_all_event = threading.Event()
received_count = 0


# Callback when any publish is received
def on_publish_received(publish_packet_data):
    publish_packet = publish_packet_data.publish_packet
    print("==== Received message from topic '{}': {} ====\n".format(
        publish_packet.topic, publish_packet.payload.decode('utf-8')))

    # Track number of publishes received
    global received_count
    received_count += 1
    if received_count == args.input_count:
        received_all_event.set()


# Callback for the lifecycle event Stopped
def on_lifecycle_stopped(lifecycle_stopped_data: mqtt5.LifecycleStoppedData):
    print("Lifecycle Stopped\n")
    stopped_event.set()


# Callback for lifecycle event Attempting Connect
def on_lifecycle_attempting_connect(lifecycle_attempting_connect_data: mqtt5.LifecycleAttemptingConnectData):
    print("Lifecycle Connection Attempt\nConnecting to endpoint: '{}' with client ID'{}'".format(
        args.input_endpoint, args.input_clientId))


# Callback for the lifecycle event Connection Success
def on_lifecycle_connection_success(lifecycle_connect_success_data: mqtt5.LifecycleConnectSuccessData):
    connack_packet = lifecycle_connect_success_data.connack_packet
    print("Lifecycle Connection Success with reason code:{}\n".format(
        repr(connack_packet.reason_code)))
    connection_success_event.set()


# Callback for the lifecycle event Connection Failure
def on_lifecycle_connection_failure(lifecycle_connection_failure: mqtt5.LifecycleConnectFailureData):
    print("Lifecycle Connection Failure with exception:{}".format(
        lifecycle_connection_failure.exception))


# Callback for the lifecycle event Disconnection
def on_lifecycle_disconnection(lifecycle_disconnect_data: mqtt5.LifecycleDisconnectData):
    print("Lifecycle Disconnected with reason code:{}".format(
        lifecycle_disconnect_data.disconnect_packet.reason_code if lifecycle_disconnect_data.disconnect_packet else "None"))

payloads = {}
IMAGES_DIR = Path("script/image_captures")
HARDCODED_IMAGE_PATHS = [IMAGES_DIR / f"lot_{i}.jpg" for i in range(1, 17)]


def create_mock_message(count):
    for i in range(count):
        image_path = HARDCODED_IMAGE_PATHS[i % len(HARDCODED_IMAGE_PATHS)]
        img = Image.open(image_path)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        res = img.resize((960, 540))
        buffer = io.BytesIO()
        res.save(buffer, format="JPEG", quality=70)
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode("ascii")

        total_spots = 30
        base_time = datetime.datetime.now(datetime.timezone.utc)
        spots = []
        for spot_index in range(total_spots):
            has_parked_car = (i + spot_index) % 2 == 0
            confidence = 0.99 if spot_index % 2 == 0 else 0.96
            last_changed = (base_time - datetime.timedelta(seconds=spot_index * 3)).isoformat()
            spots.append({
                "spot_id": f"spot_{spot_index + 1:02d}",
                "status": 1 if has_parked_car else 0,
                "confidence": confidence,
                "last_changed": last_changed
            })

        free_spots = sum(1 for spot in spots if spot["status"] == 0)
        
        payloads[f"payload_{i}"] = {
            "device_id": f"{i}",
            "parking_id": "parking 1",
            "parking_name": "LATU Parking",
            "timestamp": base_time.isoformat(),
            "seq": f"message_{i}",
            "snapshot": image_base64,
            "total_spots": total_spots,
            "free_spots": free_spots,
            "spots": spots
        }
    



if __name__ == '__main__':
    print("\nStarting MQTT5 X509 Mock Device\n")
    message_count = args.input_count
    message_topic = args.input_topic
    message_string = args.input_message

    if message_count > 0:
        create_mock_message(message_count)

    # Create MQTT5 client using mutual TLS via X509 Certificate and Private Key
    print("==== Creating MQTT5 Client ====\n")
    client = mqtt5_client_builder.mtls_from_path(
        endpoint=args.input_endpoint,
        cert_filepath=args.input_cert,
        pri_key_filepath=args.input_key,
        on_publish_received=on_publish_received,
        on_lifecycle_stopped=on_lifecycle_stopped,
        on_lifecycle_attempting_connect=on_lifecycle_attempting_connect,
        on_lifecycle_connection_success=on_lifecycle_connection_success,
        on_lifecycle_connection_failure=on_lifecycle_connection_failure,
        on_lifecycle_disconnection=on_lifecycle_disconnection,
        client_id=args.input_clientId)
    

    # Start the client, instructing the client to desire a connected state. The client will try to 
    # establish a connection with the provided settings. If the client is disconnected while in this 
    # state it will attempt to reconnect automatically.
    print("==== Starting client ====")
    client.start()

    # We await the `on_lifecycle_connection_success` callback to be invoked.
    if not connection_success_event.wait(TIMEOUT):
        raise TimeoutError("Connection timeout")


  

    # Publish
    if message_count == 0:
        print("==== Sending messages until program killed ====\n")
    else:
        print("==== Sending {} message(s) ====\n".format(message_count))

    publish_count = 1
    while publish_count <= message_count:
        payload_obj = payloads[f"payload_{publish_count - 1}"]
        payload_bytes = json.dumps(payload_obj).encode("utf-8")
        print(
            f"Publishing payload {publish_count}/{message_count} to topic '{message_topic}' "
            f"({len(payload_bytes)} bytes)"
        )
        print(f"\nPayload content (truncated to 3000 chars): {repr(payload_bytes[:3000])}\n")
        publish_future = client.publish(mqtt5.PublishPacket(
            topic=message_topic,
            payload=payload_bytes,
            qos=mqtt5.QoS.AT_LEAST_ONCE
        ))
        publish_completion_data = publish_future.result(TIMEOUT)
        print("PubAck received with {}\n".format(repr(publish_completion_data.puback.reason_code)))
        time.sleep(5)
        publish_count += 1

    received_all_event.wait(TIMEOUT)
    print("{} message(s) received.\n".format(received_count))

    
    # Stop the client. Instructs the client to disconnect and remain in a disconnected state.
    print("==== Stopping Client ====")
    client.stop()

    if not stopped_event.wait(TIMEOUT):
        raise TimeoutError("Stop timeout")

    print("==== Client Stopped! ====")
