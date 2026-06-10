from pathlib import Path

from app.schemas import OcrProcesarArchivoPayload
from app.storage import resolve_local_path, file_exists
from app.extractors.text_extractor import extract_text
metadata = {
    "ruc": enriched.get("ruc") or extract_ruc(text),
    "serie": enriched.get("serie"),
    "numero": enriched.get("numero"),
    "fechaEmision": extract_fecha(text),
    "montoTotal": extract_monto(text),
}

from app.result_builder import build_ocr_result
from app.r2_storage import download_from_r2
from app.legacy_core.document_enricher import enrich_page

from app.extractors.qr_extractor import extract_qr_data
from app.extractors.qr_sunat_extractor import merge_qr_metadata


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
    "OTRO": "OTRO",
}


def map_tipo(tipo: str | None) -> str:
    if not tipo:
        return "OTRO"

    key = tipo.upper()
    return TIPO_MAP.get(key, key)


def normalize_cliente_abreviatura(cliente: str) -> str:
    value = str(cliente or "").strip().upper()

    if not value:
        raise ValueError("clienteAbreviatura es obligatorio para construir la clave documental")

    return value


def clean_key_part(value) -> str | None:
    if value is None:
        return None

    cleaned = str(value).strip()
    return cleaned or None


def build_clave_documental(
    cliente: str,
    tipo_documental: str,
    metadata: dict,
) -> str | None:
    cliente_key = normalize_cliente_abreviatura(cliente)
    tipo_key = clean_key_part(tipo_documental)
    ruc = clean_key_part(metadata.get("ruc"))
    serie = clean_key_part(metadata.get("serie"))
    numero = clean_key_part(metadata.get("numero"))

    if tipo_key in [
        "FACTURA",
        "GUIA_REMISION",
        "NOTA_CREDITO",
        "RECIBO_HONORARIO",
    ]:
        if ruc and serie and numero:
            return f"{cliente_key}|{tipo_key}|{ruc}|{serie}|{numero}"

    if tipo_key in ["OC", "OS", "NOTA_INGRESO"]:
        if numero:
            return f"{cliente_key}|{tipo_key}|{numero}"

    return None


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


def should_use_qr(tipo_documental: str, metadata: dict, confidence: float) -> bool:
    if tipo_documental not in ["FACTURA", "GUIA_REMISION"]:
        return False

    required = ["ruc", "serie", "numero", "fechaEmision", "montoTotal"]
    missing = [key for key in required if not metadata.get(key)]

    return bool(missing) or confidence < 0.90


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

    tipo_documental = map_tipo(enriched.get("tipo"))

    serie_numero = extract_serie_numero(text)

    metadata = {
        "ruc": enriched.get("ruc") or extract_ruc(text),
        "serie": enriched.get("serie") or serie_numero.get("serie"),
        "numero": enriched.get("numero") or serie_numero.get("numero"),
        "fechaEmision": extract_fecha(text),
        "montoTotal": extract_monto(text),
    }

    campos_detectados = [
        key for key, value in metadata.items()
        if value is not None and value != ""
    ]

    confidence = round(len(campos_detectados) / len(metadata), 2)

    # QR se usará luego de forma condicionada:
    # solo FACTURA/GUIA_REMISION y solo si faltan campos o confidence baja.
    qr_data = None
    # if should_use_qr(tipo_documental, metadata, confidence):
    #     qr_data = extract_qr_data(file_path)
    #     metadata = merge_qr_metadata(metadata, qr_data)

    clave_documental = build_clave_documental(
        cliente=cliente,
        tipo_documental=tipo_documental,
        metadata=metadata,
    )

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
        "qr": qr_data,
        "mensaje": "Archivo leído, clasificado y extraído correctamente",
    })
