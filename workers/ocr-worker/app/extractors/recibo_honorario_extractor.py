import re
from typing import Any

from app.core.dates import MESES, normalize_date
from app.extractors.metadata_extractor import (
    extract_ruc,
    extract_fecha,
    extract_monto,
    extract_serie_numero,
    normalize_for_search,
    normalize_ocr_text,
    parse_amount,
)
from app.extractors.filename_metadata_extractor import extract_rh_from_filename


def extract_rh_serie_numero(text: str) -> dict[str, str | None]:
    t = normalize_for_search(text)

    patterns = [
        r"RECIBO\s+POR\s+HONORARIOS?.{0,120}?\b(E\d{3})\s*[- ]\s*(\d{1,12})\b",
        r"\b(E\d{3})\s*[- ]\s*(\d{1,12})\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, t, flags=re.DOTALL)
        if match:
            return {"serie": match.group(1), "numero": match.group(2)}

    return extract_serie_numero(text)


def normalize_rh_month_date(value: str | None) -> str | None:
    if not value:
        return None

    raw = normalize_for_search(value)

    normalized = normalize_date(raw)
    if normalized:
        return normalized

    # Soporta: 12 MAYO 2026 / 12 MAY 2026
    match = re.search(r"\b(\d{1,2})\s+([A-Z]{3,12})\s+(\d{4})\b", raw)
    if match:
        day, month_name, year = match.groups()
        month = MESES.get(month_name) or MESES.get(month_name[:3])
        if month:
            return f"{year}-{month}-{day.zfill(2)}"

    return None


def extract_rh_fecha(text: str) -> str | None:
    raw = normalize_ocr_text(text)
    t = normalize_for_search(text)

    label_patterns = [
        r"FECHA\s+DE\s+EMISI[OÓ]N\s*:?\s*([0-9]{1,2}/[0-9]{1,2}/[0-9]{4})",
        r"FECHA\s+EMISI[OÓ]N\s*:?\s*([0-9]{1,2}/[0-9]{1,2}/[0-9]{4})",
        r"EMITIDO\s+EL\s*:?\s*([0-9]{1,2}/[0-9]{1,2}/[0-9]{4})",
        r"FECHA\s+DE\s+EMISI[OÓ]N\s*:?\s*([0-9]{1,2}\s+DE\s+[A-ZÁÉÍÓÚ]+\s+DEL?\s+[0-9]{4})",
        r"FECHA\s+DE\s+EMISI[OÓ]N\s*:?\s*([0-9]{1,2}\s+[A-ZÁÉÍÓÚ]{3,12}\s+[0-9]{4})",
    ]

    for pattern in label_patterns:
        match = re.search(pattern, t, flags=re.DOTALL)
        if match:
            parsed = normalize_rh_month_date(match.group(1))
            if parsed:
                return parsed

    return extract_fecha(raw)


def extract_rh_monto(text: str) -> float | None:
    t = normalize_for_search(text)

    patterns = [
        r"MONTO\s+TOTAL\s+POR\s+HONORARIOS\s*(?:S/|S\.)?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)",
        r"TOTAL\s+POR\s+HONORARIOS\s*:?\s*(?:S/|S\.)?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)",
        r"TOTAL\s+NETO\s+RECIBIDO\s*:?\s*(?:S/|S\.)?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)",
        r"IMPORTE\s+TOTAL\s*:?\s*(?:S/|S\.)?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)",
    ]

    for pattern in patterns:
        match = re.search(pattern, t)
        if match:
            return parse_amount(match.group(1))

    return extract_monto(text)


def extract_rh_persona(text: str) -> str | None:
    t = normalize_for_search(text)

    # Formato OCR frecuente: E001-32 NOMBRE APELLIDO RUC 104...
    match = re.search(
        r"\bE\d{3}\s*[- ]\s*\d{1,12}\s+(.+?)\s+RUC\s+(?:10|20)\d{9}\b",
        t,
        flags=re.DOTALL,
    )
    if match:
        value = re.sub(r"\s+", " ", match.group(1)).strip(" :-")
        if value and len(value) >= 4:
            return value[:160]

    # Formato: Recibo por honorarios emitido por...
    match = re.search(
        r"(?:EMITIDO\s+POR|RECIBO\s+POR\s+HONORARIOS\s+ELECTRONICO)\s+(.+?)\s+RUC\s+(?:10|20)\d{9}\b",
        t,
        flags=re.DOTALL,
    )
    if match:
        value = re.sub(r"\s+", " ", match.group(1)).strip(" :-")
        if value and len(value) >= 4:
            return value[:160]

    return None


def extract_recibo_honorario_metadata(
    text: str,
    filename: str | None = None,
) -> dict[str, Any]:
    from_file = extract_rh_from_filename(filename)
    serie_numero = extract_rh_serie_numero(text)

    return {
        "ruc": extract_ruc(text) or from_file.get("ruc"),
        "serie": serie_numero.get("serie") or from_file.get("serie"),
        "numero": serie_numero.get("numero") or from_file.get("numero"),
        "fechaEmision": extract_rh_fecha(text),
        "montoTotal": extract_rh_monto(text),
        "persona": extract_rh_persona(text) or from_file.get("persona"),
        "clienteAbreviatura": from_file.get("clienteAbreviatura"),
    }
