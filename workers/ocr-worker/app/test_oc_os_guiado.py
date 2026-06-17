import asyncio
import json

from app.processor import process_file
from app.schemas import OcrProcesarArchivoPayload


FILES = [
    ("OC_007902.pdf", "OC", "principal_oc"),
    ("OC_007934.pdf", "OC", "principal_oc"),
    ("OC_007950.pdf", "OC", "principal_oc"),
    ("OS_000177.pdf", "OS", "principal_os"),
    ("OS_000229.pdf", "OS", "principal_os"),
    ("OS_000238.pdf", "OS", "principal_os"),
    ("OS_000254.pdf", "OS", "principal_os"),
    ("OS_000256.pdf", "OS", "principal_os"),
    ("OS_000262.pdf", "OS", "principal_os"),
    ("OS_000265.pdf", "OS", "principal_os"),
    ("OS_30.pdf", "OS", "principal_os"),
]


async def main():
    for idx, (filename, tipo, relacion) in enumerate(FILES, start=1):
        payload = OcrProcesarArchivoPayload(
            documentoId=idx,
            archivoId=idx,
            clienteAbreviatura="BBTI",
            storageProvider="local",
            storageKey=filename,
            tipoSolicitud="clasificar_extraer",
            tipoEsperado=tipo,
            tipoRelacionSugerida=relacion,
            areaOrigen="COMPRAS",
            canalIngreso="WEB_ADMIN_GUIADO",
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
            "camposFaltantes": result.get("camposFaltantes"),
            "mensaje": result.get("mensaje"),
            "contextoCarga": result.get("contextoCarga"),
        }

        print(json.dumps(resumen, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())