from pathlib import Path

from app.schemas import OcrProcesarArchivoPayload
from app.storage import resolve_local_path, file_exists
from app.extractors.text_extractor import extract_text
from app.extractors.metadata_extractor import (
    extract_ruc,
    extract_fecha,
    extract_monto,
    extract_serie_numero,
)
from app.extractors.qr_extractor import extract_qr_data
from app.extractors.qr_sunat_extractor import (
    build_initial_metadata_source,
    merge_qr_metadata,
)
from app.result_builder import build_ocr_result
from app.r2_storage import download_from_r2
from app.legacy_core.document_enricher import enrich_page
from app.classifier import classify_document

from app.core.document_keys import build_document_key
from app.core.document_types import (
    normalize_document_type,
    calculate_confidence,
    get_missing_metadata,
    should_require_review,
)


TIPO_MAP = {
    "FACTURA": "FACTURA",
    "GUIA_REMISION": "GUIA_REMISION",
    "ORDEN_COMPRA": "OC",
    "ORDEN_SERVICIO": "OS",
    "NOTA_INGRESO": "NOTA_INGRESO",
    "PAGO_TRANSFERENCIA": "PAGO_TRANSFERENCIA",
    "PAGO_DETRACCION": "PAGO_DETRACCION",
    "RECIBO_HONORARIO": "RECIBO_HONORARIO",
    "NOTA_CREDITO": "NOTA_CREDITO",
    "OC": "OC",
    "OS": "OS",
    "OTRO": "OTRO",
}

def normalize_cliente_abreviatura(cliente: str) -> str:
    value = str(cliente or "").strip().upper()

    if not value:
        raise ValueError(
            "clienteAbreviatura es obligatorio para construir la clave documental"
        )

    return value


def clean_key_part(value) -> str | None:
    if value is None:
        return None

    cleaned = str(value).strip()
    return cleaned or None


def resolve_file_path(payload: OcrProcesarArchivoPayload) -> Path | dict:
    if payload.storageProvider == "local":
        file_path = resolve_local_path(payload.storageKey)

        if not file_exists(file_path):
            return {
                "ok": False,
                "error": "Archivo no encontrado",
                "storageKey": payload.storageKey,
                "resolvedPath": str(file_path),
            }

        return file_path

    if payload.storageProvider == "r2":
        return download_from_r2(payload.storageKey)

    return {
        "ok": False,
        "error": f"storageProvider no soportado todavía: {payload.storageProvider}",
    }


def should_use_qr(tipo_documental: str, metadata: dict, confidence: float, text: str = "") -> bool:
    if tipo_documental in ["FACTURA", "GUIA_REMISION"]:
        required = ["ruc", "serie", "numero", "fechaEmision", "montoTotal"]
        missing = [key for key in required if not metadata.get(key)]
        return bool(missing) or confidence < 0.90

    # PDF escaneado sin texto: intentar QR aunque el tipo sea OTRO
    if len((text or "").strip()) < 80:
        return True

    return False


async def process_file(payload: OcrProcesarArchivoPayload) -> dict:
    resolved = resolve_file_path(payload)

    if isinstance(resolved, dict):
        return resolved

    file_path: Path = resolved
    cliente = normalize_cliente_abreviatura(payload.clienteAbreviatura)

    text = extract_text(file_path)

    enriched = enrich_page(
        text,
        archivo_fuente=file_path.name,
        cliente=cliente,
    )

    tipo_documental = normalize_document_type(
        enriched.get("tipo") or classify_document(text, file_path.name)
    )

    serie_numero = extract_serie_numero(text)

    metadata = {
        "ruc": enriched.get("ruc") or extract_ruc(text),
        "serie": enriched.get("serie") or serie_numero.get("serie"),
        "numero": enriched.get("numero") or serie_numero.get("numero"),
        "fechaEmision": extract_fecha(text),
        "montoTotal": extract_monto(text),
    }

    metadata_source = build_initial_metadata_source(metadata)

    confidence = calculate_confidence(tipo_documental, metadata)

    qr_data = None

    if should_use_qr(tipo_documental, metadata, confidence, text):
        qr_data = extract_qr_data(file_path)
        metadata, metadata_source = merge_qr_metadata(
            metadata,
            qr_data,
            metadata_source,
        )
        confidence = calculate_confidence(tipo_documental, metadata)
    
    if tipo_documental == "OTRO" and qr_data:
        if qr_data.get("tipoComprobanteCodigo") == "01":
            tipo_documental = "FACTURA"

    clave_documental = build_document_key(
        cliente=cliente,
        tipo_documental=tipo_documental,
        metadata=metadata,
    )

    estado_forzado = None
    mensaje = "Archivo leído, clasificado y extraído correctamente"

    if should_require_review(tipo_documental, metadata, text, qr_data) or not clave_documental:
        estado_forzado = "requiere_revision"
        mensaje = "Documento requiere revisión manual por metadata incompleta o clave documental no generable."
    
    campos_faltantes = get_missing_metadata(tipo_documental, metadata)

    campos_detectados = [
        field
        for field in metadata.keys()
        if metadata.get(field) not in [None, ""]
    ]

    return build_ocr_result({
        "documentoId": payload.documentoId,
        "archivoId": payload.archivoId,
        "clienteAbreviatura": cliente,
        "storageProvider": payload.storageProvider,
        "storageKey": payload.storageKey,
        "resolvedPath": str(file_path),
        "filename": file_path.name,
        "extension": file_path.suffix.lower(),
        "tipoSolicitud": payload.tipoSolicitud,
        "tipoDocumental": tipo_documental,
        "claveDocumental": clave_documental,
        "textLength": len(text),
        "textPreview": text[:500],
        "metadata": metadata,
        "metadataSource": metadata_source,
        "estadoForzado": estado_forzado,
        "camposDetectados": campos_detectados,
        "camposFaltantes": campos_faltantes,
        "qr": qr_data,
        "mensaje": mensaje,
    })
