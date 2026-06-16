import asyncio
import json

from app.processor import process_file
from app.schemas import OcrProcesarArchivoPayload


FILES = [
    ("recib_honorario_1.pdf", "RECIBO_HONORARIO", "RRHH"),
    ("recib_honorario_2.pdf", "RECIBO_HONORARIO", "RRHH"),
    ("recib_honorario_3.pdf", "RECIBO_HONORARIO", "RRHH"),
    ("recib_honorario_4.pdf", "RECIBO_HONORARIO", "RRHH"),
    ("recib_honorario_5.pdf", "RECIBO_HONORARIO", "RRHH"),
    ("recib_honorario_6.pdf", "RECIBO_HONORARIO", "RRHH"),
    ("recib_honorario_7.pdf", "RECIBO_HONORARIO", "RRHH"),
    ("pago_detraccion_1.pdf", "PAGO_DETRACCION", "FINANZAS"),
    ("pago_detraccion_2.pdf", "PAGO_DETRACCION", "FINANZAS"),
    ("pago_detraccion_3.pdf", "PAGO_DETRACCION", "FINANZAS"),
    ("pago_detraccion_4.pdf", "PAGO_DETRACCION", "FINANZAS"),
    ("pago_transferencia_1.pdf", "PAGO_TRANSFERENCIA", "FINANZAS"),
    ("pago_transferencia_2.pdf", "PAGO_TRANSFERENCIA", "FINANZAS"),
    ("pago_transferencia_3.pdf", "PAGO_TRANSFERENCIA", "FINANZAS"),
    ("pago_transferencia_4.pdf", "PAGO_TRANSFERENCIA", "FINANZAS"),
]


async def main():
    for idx, (filename, tipo, area) in enumerate(FILES, start=1):
        payload = OcrProcesarArchivoPayload(
            documentoId=idx,
            archivoId=idx,
            clienteAbreviatura="BBTI",
            storageProvider="local",
            storageKey=filename,
            tipoSolicitud="clasificar_extraer",
            tipoEsperado=tipo,
            tipoRelacionSugerida=(
                "adjunto_recibo_honorario"
                if tipo == "RECIBO_HONORARIO"
                else "adjunto_detraccion"
                if tipo == "PAGO_DETRACCION"
                else "adjunto_transferencia"
            ),
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
        }

        print(json.dumps(resumen, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
