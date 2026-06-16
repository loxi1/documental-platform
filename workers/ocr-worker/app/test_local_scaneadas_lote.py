import asyncio
import json

from app.processor import process_file
from app.schemas import OcrProcesarArchivoPayload


FILES = [
    "OC_007902.pdf",
    "OC_007934.pdf",
    "OC_007950.pdf",
    "OS_000177.pdf",
    "OS_000229.pdf",
    "OS_000238.pdf",
    "OS_000254.pdf",
    "OS_000256.pdf",
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
    "OC_007902.pdf",
    "OC_007934.pdf",
    "OC_007950.pdf",
    "pago_1.pdf",
    "pago_2.pdf",
    "pago_3.pdf",
]

async def main():
    for idx, filename in enumerate(FILES, start=1):
        tipo_esperado = None
        tipo_relacion_sugerida = None
        area_origen = None

        if filename.upper().startswith("OC_"):
            tipo_esperado = "OC"
            tipo_relacion_sugerida = "principal_oc"
            area_origen = "COMPRAS"

        payload = OcrProcesarArchivoPayload(
            documentoId=idx,
            archivoId=idx,
            clienteAbreviatura="BBTI",
            storageProvider="local",
            storageKey=filename,
            tipoSolicitud="clasificar_extraer",
            tipoEsperado=tipo_esperado,
            tipoRelacionSugerida=tipo_relacion_sugerida,
            areaOrigen=area_origen,
        )

        result = await process_file(payload)

        resumen = {
            "archivo": filename,
            "ok": result.get("ok"),
            "error": result.get("error"),
            "storageKey": result.get("storageKey"),
            "resolvedPath": result.get("resolvedPath"),
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
