import asyncio
import json

from app.processor import process_file
from app.schemas import OcrProcesarArchivoPayload


async def main():
    payload = OcrProcesarArchivoPayload(
        documentoId=1,
        archivoId=1,
        clienteAbreviatura="BBTI",
        storageProvider="local",
        storageKey="factura_scaneada_1.pdf",
        tipoSolicitud="clasificar_extraer",
    )

    result = await process_file(payload)
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
