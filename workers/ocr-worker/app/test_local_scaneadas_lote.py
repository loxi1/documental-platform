import asyncio
import json

from app.processor import process_file
from app.schemas import OcrProcesarArchivoPayload


FILES = [
    "factura_scaneada_1.pdf",
    "factura_scaneada_2.pdf",
    "factura_scaneada_3.pdf",
    "factura_scaneada_4.pdf",
    "factura_scaneada_5.pdf",
    "factura_scaneada_6.pdf",
    "factura_scaneada_7.pdf",
    "factura_scaneada_8.pdf",
]


async def main():
    for idx, filename in enumerate(FILES, start=1):
        payload = OcrProcesarArchivoPayload(
            documentoId=idx,
            archivoId=idx,
            clienteAbreviatura="BBTI",
            storageProvider="local",
            storageKey=filename,
            tipoSolicitud="clasificar_extraer",
        )

        result = await process_file(payload)

        resumen = {
            "archivo": filename,
            "ok": result.get("ok"),
            "tipoDocumental": result.get("tipoDocumental"),
            "estado": result.get("estado"),
            "confidence": result.get("confidence"),
            "metadata": result.get("metadata"),
            "metadataSource": result.get("metadataSource"),
            "claveDocumental": result.get("claveDocumental"),
            "qr": bool(result.get("qr")),
            "mensaje": result.get("mensaje"),
        }

        print(json.dumps(resumen, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
