import asyncio
import base64
import binascii
import json
import logging
import os
from functools import partial
from pathlib import Path
from datetime import timezone

from app.models import StateUpdateEvent
 
import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.settings import Settings
from app.business_logic.cloud_backend import CloudBackend
from app.cloud_receptor.command_manager import CommandManager

logger = logging.getLogger(__name__)
SNAPSHOT_DIR = Path("/tmp/parking_snapshots")
ENVIRONMENT = os.getenv("ENVIRONMENT", "production").lower()

# ---------------------------------------------------------------------------
# CloudReceptor
# ---------------------------------------------------------------------------

class CloudReceptor:
    """
    Hace polling de una queue SQS usando una task asincrona de asyncio.
    Expone el envío de comandos a dispositivos IoT a través de CommandManager.

    Uso: 
        receptor = CloudReceptor(settings, cloud_backend, command_manager)

         @asynccontextmanager
        async def lifespan(app: FastAPI):
            await receptor.start()
            yield
            await receptor.stop()

        app = FastAPI(lifespan=lifespan)
    """

    def __init__(self,settings: Settings,cloud_backend: CloudBackend) -> None:
        self.settings = settings
        self.cloud_backend = cloud_backend
        self.command_manager = CommandManager(settings)

        self._running = False
        self._task: asyncio.Task | None = None

        self._sqs = boto3.client(
            "sqs",
            region_name=settings.aws_default_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )

    # ------------------------------------------------------------------
    # Start y stop (ciclo de vida)
    # ------------------------------------------------------------------

    async def start(self) -> None:
        if self._running:
            logger.warning("CloudReceptor.start() called while already running.")
            return
        self._running = True

        await self.command_manager.start()

        self._task = asyncio.create_task(self._poll_loop(), name="sqs-poll-loop")
        logger.info(
            "CloudReceptor started — polling %s every %ss.",
            self.settings.sqs_queue_url,
            self.settings.sqs_poll_interval_seconds,
        )

    async def stop(self) -> None:
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

        await self.command_manager.stop()
        logger.info("CloudReceptor stopped.")

    # ------------------------------------------------------------------
    # Lógica del loop de polling y manejo de mensajes
    # ------------------------------------------------------------------

    async def _poll_loop(self) -> None:
        while self._running:
            try:
                await self._receive_messages()
            except asyncio.CancelledError:
                raise                       # Si cancelan la tarea, salimos del loop de una.
            except Exception as e:
                # Logear cualquier error inesperado y seguir al próximo ciclo de polling. No queremos que un error aislado mate la task.
                logger.exception("Unexpected error in SQS poll loop.\n%s", e)
            await asyncio.sleep(self.settings.sqs_poll_interval_seconds)

    async def _receive_messages(self) -> None:
        """Pide un conjunto de mensajes y los procesa."""
        loop = asyncio.get_running_loop()

        try:
            response = await loop.run_in_executor(
                None,
                partial(
                    self._sqs.receive_message,
                    QueueUrl=self.settings.sqs_queue_url,
                    MaxNumberOfMessages=self.settings.sqs_max_messages,
                    # Después pongamos WaitTimeSeconds=20 para long polling, 
                    # por ahora lo dejamos en 0 para desarrollo y testing.
                    WaitTimeSeconds = 0 if ENVIRONMENT == "development" else 20,
                    AttributeNames=["All"],
                    MessageAttributeNames=["All"],
                ),
            )
        except (BotoCoreError, ClientError):
            logger.exception("Failed to receive messages from SQS.")
            return

        messages = response.get("Messages", [])
        if not messages:
            logger.debug("No messages in queue.")
            return

        logger.info("Received %d message(s) from SQS.", len(messages))

        for raw_msg in messages:
            await self._process_message(raw_msg)


    async def _process_message(self, raw_msg: dict) -> None:
        """Procesa un mensaje individual: parsea, valida, logea, guarda snapshot en local (para debug), borra mensaje de la queue."""
        message_id = raw_msg.get("MessageId", "<no-id>")
        receipt_handle = raw_msg["ReceiptHandle"]
        body_raw = raw_msg.get("Body", "")

        # --- Parse -----------------------------------------------------------
        try:
            payload = json.loads(body_raw)
        except json.JSONDecodeError:
            logger.warning(
                "[SQS] MessageId=%s — body is not valid JSON: %r",
                message_id, body_raw,
            )
            await self._delete_message(receipt_handle, message_id)
            return

        try:
            msg = StateUpdateEvent.model_validate(payload)
        except Exception:
            logger.exception(
                "[SQS] MessageId=%s — payload failed schema validation. "
                "Raw keys: %s", message_id, list(payload.keys()),
            )
            await self._delete_message(receipt_handle, message_id)
            return

        # --- Log (sin snapshot) --------------------------------------------


        spot_lines = "\n".join(
            f"│    [{s.spot_id}]  {'FREE    ' if s.status == 0 else 'OCCUPIED'}  conf={s.confidence:.2f}  last_changed={s.last_changed.strftime('%H:%M:%S')}".ljust(68) + "│"
            for s in msg.spots
        )

        logger.info(
            "\n"
             "┌─SQS Message".ljust(53,"─") + "┐\n"
            f"│  MessageId   : {message_id}".ljust(70) + "│\n"
            f"│  Seq         : {msg.seq}".ljust(70) + "│\n"
            f"│  Device      : {msg.device_id}".ljust(70) + "│\n"
            f"│  Parking     : {msg.parking_name} ({msg.parking_id})".ljust(70) + "│\n"
            f"│  Timestamp   : {msg.timestamp.astimezone(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}".ljust(70) + "│\n"
            f"│  Occupancy   : {msg.free_spots}/{msg.total_spots} spots free ({msg.occupancy_pct}%)".ljust(70) + "│\n"
            f"│  Spots:".ljust(70) + "│\n"
            f"{spot_lines}\n"
             "└────────────────────────────────────────────────┘"
        )

        # --- UpdateState a Cloud Backend  ------------------------------------
        await self.cloud_backend.process_event(msg)

        # --- Done ------------------------------------------------------------
        await self._delete_message(receipt_handle, message_id)



    async def _delete_message(self, receipt_handle: str, message_id: str) -> None:
        loop = asyncio.get_running_loop()
        try:
            await loop.run_in_executor(
                None,
                partial(
                    self._sqs.delete_message,
                    QueueUrl=self.settings.sqs_queue_url,
                    ReceiptHandle=receipt_handle,
                ),
            )
            logger.debug("[SQS] Deleted MessageId=%s.", message_id)
        except (BotoCoreError, ClientError):
            logger.exception(
                "[SQS] Failed to delete MessageId=%s — it will reappear after the visibility timeout.",
                message_id,
            )

    # ------------------------------------------------------------------
    # Command API — delegado a CommandManager
    # ------------------------------------------------------------------

    async def send_command(self, payload: dict[str,str], timeout: float = 60.0) -> dict:
        """
        Envía un comando a un dispositivo IoT a través de CommandManager y espera la respuesta.
        """
        parking_id = payload.get("parking_id")
        if not parking_id:
            raise ValueError("Payload must include 'parking_id' field.")
        
        device_id = payload.get("device_id")
        if not device_id:
            raise ValueError("Payload must include 'device_id' field.")
        
        device_full_id = f"{parking_id}-{device_id}"
        return await self.command_manager.send_command(device_full_id, timeout)