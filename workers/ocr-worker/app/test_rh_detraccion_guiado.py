import asyncio
import json

from app.processor import process_file
from app.schemas import OcrProcesarArchivoPayload


FILES = [
    ("recib_honorario_1.pdf", "RECIBO_HONORARIO", "RRHH", "adjunto_recibo_honorario"),
    ("recib_honorario_2.pdf", "RECIBO_HONORARIO", "RRHH", "adjunto_recibo_honorario"),
    ("pago_detraccion_1.pdf", "PAGO_DETRACCION", "FINANZAS", "adjunto_detraccion"),
    ("pago_detraccion_2.pdf", "PAGO_DETRACCION", "FINANZAS", "adjunto_detraccion"),
]


async def main():
    for idx, (filename, tipo, area, relacion) in enumerate(FILES, start=1):
        payload = OcrProcesarArchivoPayload(
            documentoId=idx,
            archivoId=idx,
            clienteAbreviatura="BBTI",
            storageProvider="local",
            storageKey=filename,
            tipoSolicitud="clasificar_extraer",
            tipoEsperado=tipo,
            tipoRelacionSugerida=relacion,
            areaOrigen=area,
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