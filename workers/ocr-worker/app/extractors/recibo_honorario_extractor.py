import re
from typing import Any

from app.extractors.metadata_extractor import (
    extract_ruc,
    extract_fecha,
    extract_monto,
    extract_serie_numero,
    normalize_for_search,
)
from app.extractors.filename_metadata_extractor import extract_rh_from_filename


def extract_rh_serie_numero(text: str) -> dict[str, str | None]:
    t = normalize_for_search(text)

    patterns = [
        r"RECIBO\s+POR\s+HONORARIOS?.{0,80}?\b(E\d{3})\s*[- ]\s*(\d{1,12})\b",
        r"\b(E\d{3})\s*[- ]\s*(\d{1,12})\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, t, flags=re.DOTALL)
        if match:
            return {"serie": match.group(1), "numero": match.group(2)}

    return extract_serie_numero(text)


def extract_rh_monto(text: str) -> float | None:
    t = normalize_for_search(text)

    patterns = [
        r"MONTO\s+TOTAL\s+POR\s+HONORARIOS\s*(?:S/)?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)",
        r"TOTAL\s+POR\s+HONORARIOS\s*:??\s*(?:S/)?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)",
        r"TOTAL\s+NETO\s+RECIBIDO\s*:??\s*(?:S/)?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)",
    ]

    for pattern in patterns:
        match = re.search(pattern, t)
        if match:
            from app.extractors.metadata_extractor import parse_amount
            return parse_amount(match.group(1))

    return extract_monto(text)


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
        "fechaEmision": extract_fecha(text),
        "montoTotal": extract_rh_monto(text),
        "persona": from_file.get("persona"),
        "clienteAbreviatura": from_file.get("clienteAbreviatura"),
    }
