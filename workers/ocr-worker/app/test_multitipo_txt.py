import asyncio
import json
from pathlib import Path

from app.processor import process_file
from app.schemas import OcrProcesarArchivoPayload


BASE_DIR = Path("storage/inbox/_test_multitipo")


SAMPLES = {
    "oc_prueba.txt": """
ORDEN DE COMPRA
OC: OC-2026-000123
Proveedor: SERVICIOS INDUSTRIALES DEL PERU S.A.C.
Fecha de emisión: 12/01/2026
Total: S/ 1500.00
""",
    "os_prueba.txt": """
ORDEN DE SERVICIO
OS: OS-2026-000045
Proveedor: MANTENIMIENTO GLOBAL S.A.C.
Fecha de emisión: 14/01/2026
Importe total: S/ 850.50
""",
    "nota_ingreso_prueba.txt": """
NOTA DE INGRESO
NI: NI-2026-000078
Fecha de emisión: 15/01/2026
Recibido en almacén central
""",
    "transferencia_prueba.txt": """
CONSTANCIA DE TRANSFERENCIA
Banco: BCP
Número de Operación: 987654321
Fecha: 16/01/2026
Monto Total: S/ 238.64
""",
    "detraccion_prueba.txt": """
BANCO DE LA NACION
CONSTANCIA DE DEPOSITO - SISTEMA DE DETRACCIONES
Número de Operación: DTR-445566
Fecha: 17/01/2026
Importe: S/ 120.00
""",
    "recibo_honorario_prueba.txt": """
RECIBO POR HONORARIOS ELECTRONICO
RUC: 10445566778
E001-00001234
Fecha de emisión: 18/01/2026
Total: S/ 900.00
""",
    "nota_credito_prueba.txt": """
NOTA DE CREDITO ELECTRONICA
RUC: 20516403650
FC01-00000077
Fecha de emisión: 19/01/2026
Monto total: S/ 40.00
""",
    "guia_remision_prueba.txt": """
GUIA DE REMISION ELECTRONICA
RUC: 20516403650
T001-00004567
Fecha de emisión: 20/01/2026
Punto de partida: Lima
Punto de llegada: Tarma
""",
}


async def main():
    BASE_DIR.mkdir(parents=True, exist_ok=True)

    for filename, content in SAMPLES.items():
        (BASE_DIR / filename).write_text(content.strip(), encoding="utf-8")

    for idx, filename in enumerate(SAMPLES.keys(), start=1):
        payload = OcrProcesarArchivoPayload(
            documentoId=idx,
            archivoId=idx,
            clienteAbreviatura="BBTI",
            storageProvider="local",
            storageKey=f"_test_multitipo/{filename}",
            tipoSolicitud="clasificar_extraer",
        )

        result = await process_file(payload)

        resumen = {
            "archivo": filename,
            "tipoDocumental": result.get("tipoDocumental"),
            "estado": result.get("estado"),
            "confidence": result.get("confidence"),
            "metadata": result.get("metadata"),
            "metadataSource": result.get("metadataSource"),
            "camposFaltantes": result.get("camposFaltantes"),
            "claveDocumental": result.get("claveDocumental"),
            "mensaje": result.get("mensaje"),
        }

        print(json.dumps(resumen, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
