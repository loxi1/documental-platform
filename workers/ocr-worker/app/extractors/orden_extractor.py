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


def extract_codigo_expediente(text: str) -> dict[str, str | None]:
    """Extrae código de expediente desde textos de OC/OS.

    Reglas acordadas:
    - Códigos que empiezan con 05 => OP.
    - Códigos que empiezan con 03 => CENTRO_COSTO.
    - Soporta `CENTRO DE COSTOS: 050101 - ...` y OCR con salto de línea.
    """
    raw = normalize_ocr_text(text).replace("\\n", "\n")
    t = normalize_for_search(raw)

    patterns = [
        r"CENTRO\s+DE\s+COSTOS?\s*:?\s*(?:\n\s*)?([0-9]{6})\b",
        r"CENTRO\s+COSTOS?\s*:?\s*(?:\n\s*)?([0-9]{6})\b",
        r"CENTRO\s+COSTO\s*:?\s*(?:\n\s*)?([0-9]{6})\b",
        r"\b(?:OP|ORDEN\s+DE\s+PRODUCCION)\s*:?\s*([0-9]{6})\b",
    ]

    codigo = None
    for pattern in patterns:
        match = re.search(pattern, t, flags=re.DOTALL)
        if match:
            codigo = match.group(1)
            break

    if not codigo:
        return {"codigoExpediente": None, "tipoCodigoExpediente": None}

    tipo = None
    if codigo.startswith("05"):
        tipo = "OP"
    elif codigo.startswith("03"):
        tipo = "CENTRO_COSTO"

    return {"codigoExpediente": codigo, "tipoCodigoExpediente": tipo}


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


def normalize_orden_proveedor(value: str | None) -> str | None:
    if not value:
        return None

    text = re.sub(r"\s+", " ", str(value)).strip(" :-")
    upper = normalize_for_search(text)

    # Caso OS_30: PyMuPDF corta el texto después de `VA COMPUT`.
    # La razón social completa es reconocible por `SOCIEDAD ANONIMA CERRADA`.
    m = re.match(r"(.+?)\s+SOCIEDAD\s+ANONIMA\s+CERRADA\b", upper)
    if m:
        base = re.sub(r"\s+", " ", m.group(1)).strip()
        if base:
            return f"{base} S.A.C."

    # Si existe un alias societario al final, quedarse con la forma corta final.
    m = re.search(r"-\s*([A-Z0-9 .&]+?S\.A\.C\.)\b", text, flags=re.IGNORECASE)
    if m:
        return re.sub(r"\s+", " ", m.group(1)).strip().upper()

    return text[:180]


def extract_orden_proveedor(text: str) -> str | None:
    raw = normalize_ocr_text(text)

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
        value = normalize_orden_proveedor(match.group(1))
        if value:
            return value

    # Si SENOR(ES) tiene contenido en la misma línea, usar extractor genérico.
    proveedor = normalize_orden_proveedor(extract_proveedor(text))
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
                    return normalize_orden_proveedor(c)

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


def extract_orden_moneda(text: str) -> str | None:
    raw = normalize_ocr_text(text)
    t = normalize_for_search(text)

    match = re.search(r"MONEDA\s*:\s*(?:\n\s*)?([A-Z]+)", t)
    if match:
        value = match.group(1).strip()
        if value in ["SOLES", "DOLARES", "USD", "PEN"]:
            return value

    if " SOLES" in t or "SOLES" in t:
        return "SOLES"

    return None


def extract_orden_cotizacion(text: str) -> str | None:
    raw = normalize_ocr_text(text)

    match = re.search(
        r"COTIZACION\s*:\s*(?:\n.*?){0,3}\n\s*([A-Z0-9\-_/]{5,30})\s*(?:\n|$)",
        raw,
        flags=re.IGNORECASE,
    )
    if match:
        value = match.group(1).strip()
        if re.search(r"\d", value):
            return value

    t = normalize_for_search(text)
    match = re.search(r"\b(20\d{4}-\d{3,8})\b", t)
    if match:
        return match.group(1)

    return None


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

    codigo = extract_codigo_expediente(text)
    ruc_proveedor = extract_orden_proveedor_ruc(text)

    return {
        "numero": numero,
        "fechaEmision": extract_fecha(text),
        "montoTotal": extract_orden_total(text),
        "proveedor": extract_orden_proveedor(text),
        "rucProveedor": ruc_proveedor,
        "proveedorRuc": ruc_proveedor,
        "moneda": extract_orden_moneda(text),
        "cotizacion": extract_orden_cotizacion(text),
        "codigoExpediente": codigo.get("codigoExpediente"),
        "tipoCodigoExpediente": codigo.get("tipoCodigoExpediente"),
    }
