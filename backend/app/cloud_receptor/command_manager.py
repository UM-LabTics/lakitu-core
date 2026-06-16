import asyncio
import json
import logging
import uuid
from functools import partial
from typing import Any

import boto3
from awscrt import auth, mqtt
from awsiot import mqtt_connection_builder
from botocore.exceptions import BotoCoreError, ClientError

from app.settings import Settings

logger = logging.getLogger(__name__)

# La respuesta se publica en un topic con este formato, el executionId siempre vive en el índice 3 al hacer split("/").
#   commands/responses/{thingName}/{executionId}
# (IoT Rule hace bridge desde $aws/commands/things/{thingName}/executions/{executionId}/response/json)
RESPONSE_TOPIC = "commands/+/+"
EXECUTION_ID_TOPIC_INDEX = 2


class CommandManager:
    """
    Envia comandos a dispositivos IoT y espera sus respuestas a través de MQTT. Utiliza AWS IoT Core's Command Manager
    """

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.command_arn = f"arn:aws:iot:{settings.aws_default_region}:{settings.aws_account_id}:command/request_photo"

        # { executionId: asyncio.Future }
        self._pending: dict[str, asyncio.Future[dict]] = {}

        self._loop: asyncio.AbstractEventLoop | None = None

        # para enviar comandos a través de la API HTTP de IoT Data Plane (StartCommandExecution).
        self._iot_data = boto3.client(
            "iot-jobs-data",
            region_name=settings.aws_default_region,
            endpoint_url=f"https://{settings.iot_endpoint}",
        )

        # para recibir respuestas a través de MQTT. La conexión se establece en start().
        self._mqtt = mqtt_connection_builder.websockets_with_default_aws_signing(
            endpoint=settings.iot_endpoint,
            region=settings.aws_default_region,
            credentials_provider=auth.AwsCredentialsProvider.new_default_chain(),
            client_id=f"backend-command-manager-{uuid.uuid4().hex[:8]}",
            clean_session=False,
            keep_alive_secs=30,
            on_connection_interrupted=self._on_interrupted,
            on_connection_resumed=self._on_resumed,
        )

    def _on_interrupted(self, connection, error, **kwargs):
        logger.error("CommandManager — connection interrupted: %s", error)

    def _on_resumed(self, connection, return_code, session_present, **kwargs):
        logger.info("CommandManager — connection resumed (session_present=%s)", session_present)

    async def start(self) -> None:
        """Conecta por MQTT y se suscribe al topic de respuestas."""
        self._loop = asyncio.get_running_loop()

        await asyncio.wrap_future(self._mqtt.connect())
        logger.info("CommandManager — MQTT connected.")

        sub_future, _ = self._mqtt.subscribe(
            topic=RESPONSE_TOPIC,
            qos=mqtt.QoS.AT_LEAST_ONCE,
            callback=self._on_response,
        )
        await asyncio.wrap_future(sub_future)
        logger.debug(
            "CommandManager — subscribed to '%s'. "
            "Ready to send 'request_photo' commands (ARN: %s).",
            RESPONSE_TOPIC, self.command_arn,
        )

    async def stop(self) -> None:
        """Cancela todas las operaciones pendientes y desconecta MQTT."""
        for fut in self._pending.values():
            if not fut.done():
                fut.cancel()
        self._pending.clear()

        await asyncio.wrap_future(self._mqtt.disconnect())
        logger.info("CommandManager — MQTT disconnected.")

    # ──────────────────────────────────────────────────────────────────────────
    # API para cloud_receptor
    # ──────────────────────────────────────────────────────────────────────────

    async def send_command(self, device_full_id: str, timeout: float = 30.0,) -> dict[str, Any]:
        """
        Envía el comando 'request_photo' a un dispositivo de cámara y espera su respuesta.

        Llama a StartCommandExecution → AWS entrega el comando al dispositivo en su topic MQTT reservado y devuelve un executionId → Registra un asyncio.Future con ese executionId → Espera hasta que el callback MQTT resuelva el future → Devuelve el payload publicado por el dispositivo.

        El device debe:
          - Estar suscrito a su topic de comandos:
            $aws/commands/things/{thingName}/executions/+/request/json
          - Publicar su respuesta en el topic de respuestas:
            $aws/commands/things/{thingName}/executions/{executionId}/response/json

        Args:
            device_full_id: La thing_name del dispositivo IoT, con parking_id y device_full_id, e.g. "parkingLATU-cam007".
            timeout: Segundos a esperar la respuesta antes de lanzar TimeoutError.

        Retorna:
            El diccionario decodificado del JSON publicado por el dispositivo en su respuesta MQTT.
            {snapshot: "base64 string", timestamp: "ISO UTC string", ...}

        Errores:
            TimeoutError: Si no se recibe respuesta dentro del timeout especificado.
            ClientError:  Si la llamada a StartCommandExecution falla (e.g. comando no encontrado, dispositivo offline, permisos insuficientes).
        """
        target_arn = (f"arn:aws:iot:{self.settings.aws_default_region}:{self.settings.aws_account_id}:thing/{device_full_id.split('-')[1]}")

        loop = asyncio.get_running_loop()

        try:
            exec_response = await loop.run_in_executor(
                None,
                partial(
                    self._iot_data.start_command_execution,
                    targetArn=target_arn,
                    commandArn=self.command_arn,
                    executionTimeoutSeconds=int(timeout) + 10,
                ),
            )
        except (BotoCoreError, ClientError):
            logger.exception("CommandManager — failed to start 'request_photo' on '%s'.", device_full_id)
            raise

        execution_id: str = exec_response["executionId"]
        logger.info("CommandManager — 'request_photo' sent to '%s' [executionId=%s].",
            device_full_id, execution_id,
        )

        # 2. Register the future BEFORE the device could possibly respond.
        future: asyncio.Future[dict] = loop.create_future()
        self._pending[execution_id] = future

        # 3. Await the device response via MQTT.
        try:
            result = await asyncio.wait_for(future, timeout=timeout)
            logger.info("CommandManager — photo received from '%s' [executionId=%s].",
                device_full_id, execution_id,
            )
            return result
        except asyncio.TimeoutError:
            self._pending.pop(execution_id, None)
            logger.warning("CommandManager — timeout waiting for '%s' [executionId=%s] after %.1fs.",
                device_full_id, execution_id, timeout,
            )
            raise TimeoutError(f"No response from '{device_full_id}' within {timeout}s - (executionId={execution_id})."
            )

    # ──────────────────────────────────────────────────────────────────────────
    # MQTT response handler
    # ──────────────────────────────────────────────────────────────────────────

    def _on_response(self, topic: str, payload: bytes, **kwargs) -> None:
        """
        MQTT callback para manejar respuestas de dispositivos. Extrae el executionId del topic, decodifica el payload JSON, y resuelve el future correspondiente.
        """
        parts = topic.split("/")
        if len(parts) < 3:
            logger.warning("CommandManager — unexpected response topic: '%s', ignoring.", topic)
            return

        execution_id = parts[EXECUTION_ID_TOPIC_INDEX]
        try:
            data: dict = json.loads(payload.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            logger.warning("CommandManager — non-JSON payload on topic '%s', ignoring.", topic)
            return

        future = self._pending.pop(execution_id, None)
        if future is None:
            logger.debug("CommandManager — no pending execution for executionId='%s' (already timed out or unsolicited response).", execution_id)
            return

        if self._loop is None:
            logger.error("CommandManager — event loop not set, cannot resolve future.")
            return

        self._loop.call_soon_threadsafe(self._resolve_future, future, data)

    @staticmethod
    def _resolve_future(future: asyncio.Future, data: dict) -> None:
        """Called on the asyncio thread. Sets the result unless already cancelled."""
        if not future.done():
            future.set_result(data)
