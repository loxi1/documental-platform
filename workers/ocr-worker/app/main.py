import asyncio
import json
from rich.console import Console
from nats.aio.client import Client as NATS
from pydantic import ValidationError

from app.config import settings
from app.schemas import OcrProcesarArchivoPayload
from app.processor import process_file

console = Console()


async def main():
    nc = NATS()

    await nc.connect(servers=[settings.nats_url])

    console.log(f"[cyan]{settings.app_name} conectado a NATS[/cyan]")
    console.log(f"[yellow]Escuchando subject: {settings.ocr_request_subject}[/yellow]")

    async def handler(msg):
        try:
            raw = json.loads(msg.data.decode())

            if isinstance(raw, dict) and "data" in raw:
                raw = raw["data"]

            payload = OcrProcesarArchivoPayload(**raw)
            console.log(json.dumps({
                "archivoId": payload.archivoId,
                "storage_key": payload.storageKey if "://" not in payload.storageKey else "[URL omitida]",
                "subject": msg.subject,
            }), markup=False)

            result = await process_file(payload)

            if result.get("ok"):
                await nc.publish(
                    settings.ocr_classified_subject,
                    json.dumps(result).encode(),
                )

            if msg.reply:
                await nc.publish(msg.reply, json.dumps(result).encode())

        except ValidationError as e:
            error = {
                "ok": False,
                "error": "Payload inválido",
                "details": e.errors(),
            }

            if msg.reply:
                await nc.publish(msg.reply, json.dumps(error).encode())

        except Exception as e:
            error = {
                "ok": False,
                "error": str(e),
            }

            if msg.reply:
                await nc.publish(msg.reply, json.dumps(error).encode())

    await nc.subscribe(settings.ocr_request_subject, cb=handler)

    while True:
        await asyncio.sleep(1)


if __name__ == "__main__":
    asyncio.run(main())
