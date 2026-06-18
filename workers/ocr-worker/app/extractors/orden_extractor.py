import re
from typing import Any

from app.extractors.metadata_extractor import (
    extract_fecha,
    extract_monto,
    extract_proveedor,
    extract_numero_from_filename,
    normalize_for_search,
    normalize_ocr_text,
    parse_amount,
)


def extract_orden_numero_from_text(text: str, tipo_documental: str) -> str | None:
    tipo = str(tipo_documental or "").upper()
    t = normalize_for_search(text)

    if tipo == "OC":
        patterns = [
            r"ORDEN\s+DE\s+COMPRA\s*(?:N°|Nº|NO|NRO|NUMERO)?\s*:?\s*([A-Z0-9\-_/]{3,30})",
            r"ORDEN\s+COMPRA\s*(?:N°|Nº|NO|NRO|NUMERO)?\s*:?\s*([A-Z0-9\-_/]{3,30})",
            r"\bOC\s*(?:N°|Nº|NO|NRO|NUMERO)?\s*:?\s*([A-Z0-9\-_/]{3,30})",
        ]
    elif tipo == "OS":
        patterns = [
            r"ORDEN\s+DE\s+SERVICIO.{0,80}?N[°ºO]*\s*:?\s*([A-Z0-9\-_/]{3,30})",
            r"ORDEN\s+SERVICIO.{0,80}?N[°ºO]*\s*:?\s*([A-Z0-9\-_/]{3,30})",
            r"ORDEN\s+DE\s+SERVICIO\s*(?:N°|Nº|NO|NRO|NUMERO)?\s*:?\s*([A-Z0-9\-_/]{3,30})",
            r"ORDEN\s+SERVICIO\s*(?:N°|Nº|NO|NRO|NUMERO)?\s*:?\s*([A-Z0-9\-_/]{3,30})",
            r"\bOS\s*(?:N°|Nº|NO|NRO|NUMERO)?\s*:?\s*([A-Z0-9\-_/]{3,30})",
            r"\bN[°ºO]*\s*:?\s*([0-9]{3,12})\b",
        ]
    else:
        return None

    for pattern in patterns:
        match = re.search(pattern, t, flags=re.DOTALL)
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


def extract_orden_proveedor_ruc(text: str) -> str | None:
    t = normalize_for_search(text)

    patterns = [
        r"R\.U\.C\.\s*(?:\n|\s)*((?:10|20)\d{9})",
        r"((?:10|20)\d{9})\s*(?:\n|\s)*R\.U\.C\.",
        r"\b((?:10|20)\d{9})\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, t)
        if match:
            return match.group(1)

    return None


def extract_orden_proveedor(text: str) -> str | None:
    raw = normalize_ocr_text(text)
    t = normalize_for_search(text)

    # Formato frecuente de OC/OS BBTI:
    # COTIZACION :
    # PROVEEDOR RAZON SOCIAL
    # 10/06/2026
    match = re.search(
        r"COTIZACION\s*:\s*\n\s*(.+?)\s*\n\s*\d{1,2}/\d{1,2}/\d{4}",
        raw,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if match:
        value = re.sub(r"\s+", " ", match.group(1)).strip(" :-")
        if value:
            return value[:180]

    # Si SENOR(ES) tiene contenido en la misma línea, usar extractor genérico.
    proveedor = extract_proveedor(text)
    if proveedor:
        return proveedor

    # Respaldo: línea posterior al RUC que no sea dirección ni etiqueta.
    lines = [line.strip() for line in raw.splitlines() if line.strip()]
    for idx, line in enumerate(lines):
        if re.fullmatch(r"(?:10|20)\d{9}", line.strip()):
            for candidate in lines[idx + 1: idx + 8]:
                c = candidate.strip()
                upper = normalize_for_search(c)
                if not c:
                    continue
                if any(label in upper for label in ["R.U.C", "DIRECCION", "TELEFONO", "CONDICION", "FECHA", "CAL.", "LIMA"]):
                    continue
                if re.search(r"[A-ZÁÉÍÓÚÑ]{3,}", c, flags=re.IGNORECASE):
                    return re.sub(r"\s+", " ", c).strip()[:180]

    return None


def extract_orden_total(text: str) -> float | None:
    t = normalize_for_search(text)

    # En OS/OC puede venir como bloque: Total S/ ... Sub-total ... 2,569.00 ... IGV.
    if "TOTAL" in t:
        tail = t[t.find("TOTAL"): t.find("TOTAL") + 500]
        amounts = [parse_amount(x) for x in re.findall(r"\b\d{1,3}(?:,\d{3})*(?:\.\d{2})\b|\b\d+(?:\.\d{2})\b", tail)]
        amounts = [x for x in amounts if x is not None]
        if amounts:
            return max(amounts)

    return extract_monto(text)


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
        "montoTotal": extract_orden_total(text),
        "proveedor": extract_orden_proveedor(text),
        "proveedorRuc": extract_orden_proveedor_ruc(text),
    }
