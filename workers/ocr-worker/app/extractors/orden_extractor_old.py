import re
from typing import Any

from app.extractors.metadata_extractor import (
    extract_fecha,
    extract_monto,
    extract_proveedor,
    extract_ruc,
    extract_numero_from_filename,
    normalize_for_search,
    normalize_ocr_text,
)


def extract_orden_numero_from_text(text: str, tipo_documental: str) -> str | None:
    tipo = str(tipo_documental or "").upper()
    t = normalize_for_search(text)

    if tipo == "OC":
        patterns = [
            r"ORDEN\s+DE\s+COMPRA[\s\S]{0,120}?\bN[°ºO]?\s*:?\s*([A-Z0-9\-_/]{3,30})",
            r"ORDEN\s+COMPRA[\s\S]{0,120}?\bN[°ºO]?\s*:?\s*([A-Z0-9\-_/]{3,30})",
            r"\bOC\s*(?:N°|Nº|NO|NRO|NUMERO)?\s*:?\s*([A-Z0-9\-_/]{3,30})",
        ]
    elif tipo == "OS":
        patterns = [
            r"ORDEN\s+DE\s+SERVICIO[\s\S]{0,120}?\bN[°ºO]?\s*:?\s*([A-Z0-9\-_/]{3,30})",
            r"ORDEN\s+SERVICIO[\s\S]{0,120}?\bN[°ºO]?\s*:?\s*([A-Z0-9\-_/]{3,30})",
            r"\bOS\s*(?:N°|Nº|NO|NRO|NUMERO)?\s*:?\s*([A-Z0-9\-_/]{3,30})",
        ]
    else:
        return None

    for pattern in patterns:
        match = re.search(pattern, t)
        if match:
            value = match.group(1).strip(" .:-")
            if re.search(r"\d", value):
                return value

    return None


def extract_orden_numero_from_filename(filename: str | None, tipo_documental: str) -> str | None:
    tipo = str(tipo_documental or "").upper()
    prefix = "OC" if tipo == "OC" else "OS" if tipo == "OS" else None

    if not prefix:
        return None

    return extract_numero_from_filename(filename, prefix)


def extract_orden_proveedor(text: str) -> str | None:
    raw = normalize_ocr_text(text)
    upper = normalize_for_search(text)

    # Formato frecuente de OC/OS BBTI:
    # VA COMPUTERS SOCIEDAD ANONIMA CERRADA - VA COMPUTERS S.A.C. 10/06/2026
    company_pattern = (
        r"([A-Z0-9ÁÉÍÓÚÑ .,&\-/]+?"
        r"(?:S\.A\.C\.|SAC|S\.A\.|E\.I\.R\.L\.|EIRL|S\.R\.L\.|SRL)"
        r"(?:\s*-\s*[A-Z0-9ÁÉÍÓÚÑ .,&\-/]+?"
        r"(?:S\.A\.C\.|SAC|S\.A\.|E\.I\.R\.L\.|EIRL|S\.R\.L\.|SRL))?)"
        r"\s+\d{2}/\d{2}/\d{4}"
    )

    match = re.search(company_pattern, upper)

    if match:
        value = match.group(1).strip(" -")
        if "BBTI" not in value and "BB TECNOLOGIA" not in value:
            return re.sub(r"\s+", " ", value)

    return extract_proveedor(raw)


def extract_orden_proveedor_ruc(text: str) -> str | None:
    return extract_ruc(text)


def extract_orden_metadata(
    text: str,
    tipo_documental: str,
    filename: str | None = None,
    enriched: dict[str, Any] | None = None,
) -> dict[str, Any]:
    enriched = enriched or {}
    tipo = str(tipo_documental or "").upper()

    numero = (
        enriched.get("numero")
        or extract_orden_numero_from_text(text, tipo)
        or extract_orden_numero_from_filename(filename, tipo)
    )

    return {
        "numero": numero,
        "fechaEmision": extract_fecha(text),
        "montoTotal": extract_monto(text),
        "proveedor": extract_orden_proveedor(text),
        "proveedorRuc": extract_orden_proveedor_ruc(text),
    }
