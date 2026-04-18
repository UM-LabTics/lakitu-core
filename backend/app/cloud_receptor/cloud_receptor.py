import asyncio
import base64
import binascii
import json
import logging
from functools import partial
from pathlib import Path
from datetime import timezone

from app.models import StateUpdate
 
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)
SNAPSHOT_DIR = Path("/tmp/parking_snapshots")

# ---------------------------------------------------------------------------
# Configuracion — Pydantic lee valores de variables de entorno, pero nos quedamos solo con las que realmente necesitamos acá. 
# En EC2, las credenciales de AWS van a venir a través de un rol IAM de la instancia, si se dejan en None boto3 entiende eso. 
# ---------------------------------------------------------------------------

class CloudReceptorSettings(BaseSettings):
    model_config = SettingsConfigDict(
        extra="ignore",          # ignorar las que no se definen acá abajo
    )

    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_default_region: str = "us-east-2"

    sqs_queue_url: str
    sqs_poll_interval_seconds: int = Field(default=2, ge=1)
    sqs_max_messages: int = Field(default=10, ge=1, le=10)  # SQS hard-limit: 10

    log_level: str = "INFO"

# ---------------------------------------------------------------------------
# CloudReceptor
# ---------------------------------------------------------------------------

class CloudReceptor:
    """
    Hace polling de una queue SQS usando una task asincrona de asyncio.

    Uso: 
        receptor = CloudReceptor(CloudReceptorSettings())

         @asynccontextmanager
        async def lifespan(app: FastAPI):
            await receptor.start()
            yield
            await receptor.stop()

        app = FastAPI(lifespan=lifespan)
    """

    def __init__(self, settings: CloudReceptorSettings) -> None:
        self.settings = settings
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
        logger.info("CloudReceptor stopped.")

    # ------------------------------------------------------------------
    # Lógica del loop de polling y manejo de mensajes
    # ------------------------------------------------------------------

    async def _poll_loop(self) -> None:
        while self._running:
            try:
                await self._poll_once()
            except asyncio.CancelledError:
                raise                       # Si cancelan la tarea, salimos del loop de una.
            except Exception as e:
                # Logear cualquier error inesperado y seguir al próximo ciclo de polling. No queremos que un error aislado mate la task.
                logger.exception("Unexpected error in SQS poll loop.\n%s", e)
            await asyncio.sleep(self.settings.sqs_poll_interval_seconds)

    async def _poll_once(self) -> None:
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
                    WaitTimeSeconds=0,
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
            await self._handle_message(raw_msg)


    async def _handle_message(self, raw_msg: dict) -> None:
        """Procesa un mensaje individual: parsea, valida, logea, guarda snapshot, borra mensaje de la queue."""
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
            msg = StateUpdate.model_validate(payload)
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

        # --- Snapshot --------------------------------------------------------
        await self._save_snapshot(msg)

        # --- Done ------------------------------------------------------------
        await self._delete_message(receipt_handle, message_id)

    async def _save_snapshot(self, msg: StateUpdate) -> None:
        """Decodifica el snapshot de base64 y lo guarda en disco. Se hace en un thread separado para no bloquear el loop de asyncio con operaciones de I/O."""
        loop = asyncio.get_running_loop()

        def _write() -> Path:
            SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)

            ts_str = msg.timestamp.strftime("%Y%m%dT%H%M%SZ")
            filename = f"{msg.parking_id}_seq{msg.seq:06d}_{ts_str}.jpg"
            dest = SNAPSHOT_DIR / filename

            image_bytes = base64.b64decode(msg.snapshot)
            dest.write_bytes(image_bytes)
            return dest

        try:
            dest = await loop.run_in_executor(None, _write)
            logger.debug("[Snapshot] Saved → %s", dest)
        except (ValueError, TypeError, binascii.Error):
            logger.warning("[Snapshot] seq=%d — snapshot is not valid base64, skipping.", msg.seq)
        except OSError:
            logger.warning("[Snapshot] seq=%d — could not write snapshot to disk, skipping.", msg.seq)



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