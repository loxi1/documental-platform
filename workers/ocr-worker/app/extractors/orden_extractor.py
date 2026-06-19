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


def extract_codigo_expediente(text: str) -> str | None:
    """Extrae únicamente el código de expediente vigente desde textos de OC/OS.

    Modelo actual: documentos.expedientes se vincula por cliente_destino_id +
    codigo_expediente. No se persiste ni se devuelve tipo de código, OP o centro
    de costo como metadata OCR.
    """
    raw = normalize_ocr_text(text).replace("\\n", "\n")
    t = normalize_for_search(raw)

    patterns = [
        r"CENTRO\s+DE\s+COSTOS?\s*:?\s*(?:\n\s*)?([0-9]{6})\b",
        r"CENTRO\s+COSTOS?\s*:?\s*(?:\n\s*)?([0-9]{6})\b",
        r"CENTRO\s+COSTO\s*:?\s*(?:\n\s*)?([0-9]{6})\b",
        r"\b(?:OP|ORDEN\s+DE\s+PRODUCCION)\s*:?\s*([0-9]{6})\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, t, flags=re.DOTALL)
        if match:
            return match.group(1)

    return None


def extract_all_rucs(text: str) -> list[str]:
    t = normalize_for_search(text)
    rucs: list[str] = []
    for match in re.findall(r"\b((?:10|20)\d{9})\b", t):
        if match not in rucs:
            rucs.append(match)
    return rucs


def extract_orden_comprador_ruc(text: str) -> str | None:
    """Extrae RUC del comprador/receptor de la OC/OS.

    En formatos BBTI, el comprador es BBTI S.A.C. y su RUC es 20565747356.
    En la extracción PDF este RUC puede aparecer junto a la etiqueta R.U.C.,
    por eso no debe asumirse automáticamente como proveedor.
    """
    t = normalize_for_search(text)
    if "BBTI" in t and "20565747356" in t:
        return "20565747356"
    return None


def extract_orden_proveedor_ruc(text: str) -> str | None:
    rucs = extract_all_rucs(text)
    comprador_ruc = extract_orden_comprador_ruc(text)

    # Si existe comprador conocido, el proveedor debe ser el primer RUC distinto.
    if comprador_ruc:
        for ruc in rucs:
            if ruc != comprador_ruc:
                return ruc

    t = normalize_for_search(text)
    patterns = [
        r"R\.U\.C\.\s*(?:\n|\s)*((?:10|20)\d{9})",
        r"((?:10|20)\d{9})\s*(?:\n|\s)*R\.U\.C\.",
    ]

    for pattern in patterns:
        match = re.search(pattern, t)
        if match:
            return match.group(1)

    return rucs[0] if rucs else None


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
    lines = [line.strip() for line in raw.splitlines() if line.strip()]

    # Prioridad 1: en OC/OS BBTI el proveedor viene en SEÑOR(ES).
    # Evita confundir la cotización (ej. AA510317037-1) con razón social.
    for line in lines[:25]:
        match = re.search(
            r"SEÑOR\(ES\)\s*:\s*(.+)$",
            line,
            flags=re.IGNORECASE,
        )
        if match:
            value = normalize_orden_proveedor(match.group(1))
            if value and not re.fullmatch(r"[A-Z]{1,5}\d[\d\-_/]*", normalize_for_search(value)):
                return value

    # Formato OS alternativo: razón social antes de fecha después de datos de cabecera.
    for idx, line in enumerate(lines[:35]):
        upper = normalize_for_search(line)
        if "SOCIEDAD ANONIMA CERRADA" in upper or " S.A.C" in upper or " S.A." in upper:
            value = normalize_orden_proveedor(line)
            if value:
                return value

    # Si SENOR(ES) tiene contenido reconocible por el extractor genérico.
    proveedor = normalize_orden_proveedor(extract_proveedor(text))
    if proveedor:
        proveedor_upper = normalize_for_search(proveedor)
        es_codigo = re.fullmatch(r"[A-Z]{1,5}\d[\d\-_/]*", proveedor_upper)
        es_label = proveedor_upper in ["TELEFONO", "ATENCION", "FECHA", "DIRECCION", "MONEDA", "COTIZACION"]
        if not es_codigo and not es_label:
            return proveedor

    # Respaldo: línea posterior al RUC proveedor que no sea dirección ni etiqueta.
    for idx, line in enumerate(lines):
        if re.fullmatch(r"(?:10|20)\d{9}", line.strip()):
            for candidate in lines[idx + 1: idx + 8]:
                c = candidate.strip()
                upper = normalize_for_search(c)
                if not c:
                    continue
                if any(label in upper for label in ["R.U.C", "DIRECCION", "TELEFONO", "CONDICION", "FECHA", "CAL.", "LIMA", "COTIZACION"]):
                    continue
                if re.search(r"[A-ZÁÉÍÓÚÑ]{3,}", c, flags=re.IGNORECASE):
                    return normalize_orden_proveedor(c)

    return None


def extract_orden_total(text: str) -> float | None:
    raw = normalize_ocr_text(text)
    t = normalize_for_search(raw)

    amount_pattern = r"\b\d{1,3}(?:,\d{3})*(?:\.\d{2})\b|\b\d+(?:\.\d{2})\b"

    # En OC/OS BBTI PyMuPDF suele separar etiquetas y montos:
    # IGV / Total / Sub-total / 3,544.00 / 4,181.92 / 0.00.
    # Se toma el mayor monto monetario del bloque de totales, excluyendo percepción 0.
    start_positions = [pos for token in ["IGV", "TOTAL"] if (pos := t.find(token)) >= 0]
    if start_positions:
        start = min(start_positions)
        stop_candidates = [
            pos for token in ["BBTI S.A.C.", "PRESENTACION", "PRESENTACIÓN"]
            if (pos := t.find(token, start)) > start
        ]
        stop = min(stop_candidates) if stop_candidates else start + 700
        window = t[start:stop]
        amounts = [parse_amount(x) for x in re.findall(amount_pattern, window)]
        amounts = [x for x in amounts if x is not None and x > 0]
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

    if "DOLARES AMERICANOS" in t:
        return "DOLARES AMERICANOS"

    if "DOLARES" in t:
        return "DOLARES"

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

    codigo_expediente = extract_codigo_expediente(text)
    ruc_proveedor = extract_orden_proveedor_ruc(text)
    ruc_comprador = extract_orden_comprador_ruc(text)

    return {
        "numero": numero,
        "fechaEmision": extract_fecha(text),
        "montoTotal": extract_orden_total(text),
        "proveedor": extract_orden_proveedor(text),
        "rucProveedor": ruc_proveedor,
        "rucComprador": ruc_comprador,
        "moneda": extract_orden_moneda(text),
        "cotizacion": extract_orden_cotizacion(text),
        "codigoExpediente": codigo_expediente,
    }
