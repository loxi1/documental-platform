import asyncio
import json
from nats.aio.client import Client as NATS

from app.config import settings


async def main():
    nc = NATS()
    await nc.connect(servers=[settings.nats_url])

    payload = {
        "documentoId": 101,
        "archivoId": 101,
        "clienteAbreviatura": "BBTI",
        "storageProvider": "local",
        "storageKey": "factura_scaneada_2.pdf",
        "tipoSolicitud": "clasificar_extraer",
    }

    response = await nc.request(
        "ocr.procesar-archivo",
        json.dumps(payload).encode(),
        timeout=20,
    )

    print(response.data.decode())

    await nc.close()


if __name__ == "__main__":
    asyncio.run(main())
