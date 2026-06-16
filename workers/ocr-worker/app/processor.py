from pathlib import Path

from app.schemas import OcrProcesarArchivoPayload
from app.storage import resolve_local_path, file_exists
from app.extractors.text_extractor import extract_text
from app.extractors.type_metadata_extractor import extract_metadata_by_type
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


def normalize_cliente_abreviatura(cliente: str) -> str:
    value = str(cliente or "").strip().upper()

    if not value:
        raise ValueError(
            "clienteAbreviatura es obligatorio para construir la clave documental"
        )

    return value


def resolve_case_insensitive_path(file_path: Path) -> Path | None:
    if file_path.exists():
        return file_path

    parent = file_path.parent

    if not parent.exists():
        return None

    expected = file_path.name.lower()

    for candidate in parent.iterdir():
        if candidate.name.lower() == expected:
            return candidate

    return None


def resolve_file_path(payload: OcrProcesarArchivoPayload) -> Path | dict:
    if payload.storageProvider == "local":
        file_path = resolve_local_path(payload.storageKey)
        resolved = resolve_case_insensitive_path(file_path)

        if not resolved or not file_exists(resolved):
            return {
                "ok": False,
                "error": "Archivo no encontrado",
                "storageKey": payload.storageKey,
                "resolvedPath": str(file_path),
            }

        return resolved

    if payload.storageProvider == "r2":
        return download_from_r2(payload.storageKey)

    return {
        "ok": False,
        "error": f"storageProvider no soportado todavía: {payload.storageProvider}",
    }


def should_use_qr(
    tipo_documental: str,
    metadata: dict,
    confidence: float,
    text: str = "",
) -> bool:
    tipo = normalize_document_type(tipo_documental)

    # Solo comprobantes donde QR realmente aporta valor.
    if tipo in ["FACTURA", "GUIA_REMISION", "NOTA_CREDITO"]:
        return bool(get_missing_metadata(tipo, metadata)) or confidence < 0.90

    # Fallback automático solo cuando no se sabe el tipo.
    if tipo == "OTRO" and len((text or "").strip()) < 80:
        return True

    # No intentar QR en OC, OS, NI, RH, pagos ni detracciones.
    return False


def infer_tipo_from_qr(tipo_documental: str, qr_data: dict | None) -> str:
    tipo = normalize_document_type(tipo_documental)

    if tipo != "OTRO" or not qr_data:
        return tipo

    codigo = str(qr_data.get("tipoComprobanteCodigo") or "").strip()

    sunat_map = {
        "01": "FACTURA",
        "07": "NOTA_CREDITO",
        "09": "GUIA_REMISION",
        "R1": "RECIBO_HONORARIO",
    }

    return normalize_document_type(sunat_map.get(codigo, tipo))


def resolve_cliente_for_key(payload_cliente: str, metadata: dict) -> str:
    detected = metadata.get("clienteAbreviatura")

    if detected:
        return normalize_cliente_abreviatura(detected)

    return normalize_cliente_abreviatura(payload_cliente)


def resolve_expected_type(payload: OcrProcesarArchivoPayload) -> str | None:
    tipo = getattr(payload, "tipoEsperado", None)

    if tipo is None or str(tipo).strip() == "":
        return None

    normalized = normalize_document_type(tipo)
    return normalized if normalized != "OTRO" else None


async def process_file(payload: OcrProcesarArchivoPayload) -> dict:
    resolved = resolve_file_path(payload)

    if isinstance(resolved, dict):
        return resolved

    file_path: Path = resolved
    payload_cliente = normalize_cliente_abreviatura(payload.clienteAbreviatura)

    text = extract_text(file_path)

    enriched = enrich_page(
        text,
        archivo_fuente=file_path.name,
        cliente=payload_cliente,
    )

    expected_type = resolve_expected_type(payload)

    tipo_documental = expected_type or normalize_document_type(
        enriched.get("tipo") or classify_document(text, file_path.name)
    )

    metadata = extract_metadata_by_type(
        tipo_documental=tipo_documental,
        text=text,
        enriched=enriched,
        filename=file_path.name,
    )

    cliente_for_key = resolve_cliente_for_key(payload_cliente, metadata)

    metadata_source = build_initial_metadata_source(metadata)
    confidence = calculate_confidence(tipo_documental, metadata)

    qr_data = None

    if should_use_qr(tipo_documental, metadata, confidence, text):
        qr_data = extract_qr_data(file_path)

        if not expected_type:
            tipo_documental = infer_tipo_from_qr(tipo_documental, qr_data)

        metadata = extract_metadata_by_type(
            tipo_documental=tipo_documental,
            text=text,
            enriched=enriched,
            filename=file_path.name,
        )

        cliente_for_key = resolve_cliente_for_key(payload_cliente, metadata)
        metadata_source = build_initial_metadata_source(metadata)

        metadata, metadata_source = merge_qr_metadata(
            metadata,
            qr_data,
            metadata_source,
        )

        confidence = calculate_confidence(tipo_documental, metadata)

    clave_documental = build_document_key(
        cliente=cliente_for_key,
        tipo_documental=tipo_documental,
        metadata=metadata,
    )

    campos_faltantes = get_missing_metadata(tipo_documental, metadata)

    campos_detectados = [
        field
        for field in metadata.keys()
        if metadata.get(field) not in [None, ""]
    ]

    estado_forzado = None
    mensaje = "Archivo leído, clasificado y extraído correctamente"

    if should_require_review(tipo_documental, metadata, text, qr_data) or not clave_documental:
        estado_forzado = "requiere_revision"

        if len((text or "").strip()) < 80 and not qr_data:
            mensaje = (
                "PDF escaneado sin texto digital y sin QR legible. "
                "Requiere revisión manual o reescaneo con mejor calidad."
            )
        else:
            mensaje = (
                "Documento requiere revisión manual por metadata incompleta "
                "o clave documental no generable."
            )

    return build_ocr_result({
        "documentoId": payload.documentoId,
        "archivoId": payload.archivoId,
        "clienteAbreviatura": cliente_for_key,
        "storageProvider": payload.storageProvider,
        "storageKey": payload.storageKey,
        "resolvedPath": str(file_path),
        "filename": file_path.name,
        "extension": file_path.suffix.lower(),
        "tipoSolicitud": payload.tipoSolicitud,
        "tipoDocumental": tipo_documental,
        "confidence": confidence,
        "estadoForzado": estado_forzado,
        "claveDocumental": clave_documental,
        "textLength": len(text),
        "textPreview": text[:500],
        "metadata": metadata,
        "metadataSource": metadata_source,
        "camposDetectados": campos_detectados,
        "camposFaltantes": campos_faltantes,
        "qr": qr_data,
        "mensaje": mensaje,
        "contextoCarga": {
            "areaOrigen": getattr(payload, "areaOrigen", None),
            "tipoEsperado": getattr(payload, "tipoEsperado", None),
            "expedienteId": getattr(payload, "expedienteId", None),
            "documentoBaseId": getattr(payload, "documentoBaseId", None),
            "tipoRelacionSugerida": getattr(payload, "tipoRelacionSugerida", None),
            "canalIngreso": getattr(payload, "canalIngreso", None),
        },
    })
