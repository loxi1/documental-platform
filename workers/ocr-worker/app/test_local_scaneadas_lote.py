import asyncio
import json

from app.processor import process_file
from app.schemas import OcrProcesarArchivoPayload


FILES = [
    "guia_1.pdf",
    "guia_2.pdf",
    "guia_3.pdf",
    "guia_4.pdf",
    "guia_3_1.pdf",
    "guia_3_2.pdf",
    "guia_3_3.pdf",
    "guia_3_4.pdf",
    "nota_i_31.pdf",
    "nota_i_32.pdf",
    "nota_i_34.pdf",
    "nota_i_37.pdf",
    "nota_i_168.pdf",
    "nota_i_169.pdf",
    "nota_i_173.pdf",
    "nota_i_174.pdf",
    "oc_007902.pdf",
    "oc_007934.pdf",
    "oc_007950.pdf",
    "pago_1.pdf",
    "pago_2.pdf",
    "pago_3.pdf",
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
