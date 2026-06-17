import asyncio
import json

from app.processor import process_file
from app.schemas import OcrProcesarArchivoPayload


async def main():
    payload = OcrProcesarArchivoPayload(
        documentoId=30,
        archivoId=30,
        clienteAbreviatura="BBTI",
        storageProvider="local",
        storageKey="OS_30.pdf",
        tipoSolicitud="clasificar_extraer",
        tipoEsperado="OS",
        tipoRelacionSugerida="principal_os",
        areaOrigen="COMPRAS",
        canalIngreso="WEB_ADMIN_GUIADO",
    )

    result = await process_file(payload)

    print(json.dumps({
        "ok": result.get("ok"),
        "tipoDocumental": result.get("tipoDocumental"),
        "estado": result.get("estado"),
        "confidence": result.get("confidence"),
        "metadata": result.get("metadata"),
        "metadataSource": result.get("metadataSource"),
        "claveDocumental": result.get("claveDocumental"),
        "mensaje": result.get("mensaje"),
    }, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
