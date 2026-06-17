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


_ORDER_LABELS = {
    "TELEFONO",
    "TELÉFONO",
    "ATENCION",
    "ATENCIÓN",
    "R.U.C.",
    "RUC",
    "DIRECCION",
    "DIRECCIÓN",
    "CONDICION DE PAGO",
    "CONDICIÓN DE PAGO",
    "FECHA",
    "ORDEN DE COMPRA",
    "ORDEN DE SERVICIO",
    "MONEDA",
    "E-MAIL",
    "EMAIL",
    "COTIZACION",
    "COTIZACIÓN",
    "CONTADO",
    "CREDITO",
    "CRÉDITO",
    "BBTI S.A.C.",
    "BB TECNOLOGIA INDUSTRIAL S.A.C.",
}


def _lines(text: str) -> list[str]:
    return [line.strip() for line in normalize_ocr_text(text).splitlines() if line.strip()]


def _is_noise_line(value: str | None) -> bool:
    if not value:
        return True

    v = normalize_for_search(value).strip(" :-")

    if not v or v in _ORDER_LABELS:
        return True

    if re.fullmatch(r"\d{1,2}/\d{1,2}/\d{4}", v):
        return True

    if re.fullmatch(r"\d{4,}[\d\-]*", v):
        return True

    if len(v) < 4:
        return True

    return False


def clean_order_party_name(value: str | None) -> str | None:
    if not value:
        return None

    text = re.sub(r"\s+", " ", str(value)).strip(" :-")
    text = re.sub(r"\bSOCIEDAD\s+ANONIMA\s+CERRADA\b", "S.A.C.", text, flags=re.IGNORECASE)
    text = re.sub(r"\bSOCIEDAD\s+ANÓNIMA\s+CERRADA\b", "S.A.C.", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text).strip(" :-")

    if " - " in text:
        left, right = [part.strip() for part in text.split(" - ", 1)]
        left_u = normalize_for_search(left)
        right_u = normalize_for_search(right)

        if right_u and (right_u in left_u or left_u.startswith(right_u)):
            text = left

    return text[:160] if text else None


def extract_orden_numero_from_text(text: str, tipo_documental: str) -> str | None:
    tipo = str(tipo_documental or "").upper()
    t = normalize_for_search(text)

    if tipo == "OC":
        patterns = [
            r"ORDEN\s+DE\s+COMPRA[\s\S]{0,120}?N[°ºO]?\s*:?[\s\n]*([0-9]{3,12})",
            r"ORDEN\s+DE\s+COMPRA\s*(?:N°|Nº|NO|NRO|NUMERO)?\s*:?\s*([A-Z0-9\-_/]{3,30})",
            r"ORDEN\s+COMPRA\s*(?:N°|Nº|NO|NRO|NUMERO)?\s*:?\s*([A-Z0-9\-_/]{3,30})",
            r"\bOC\s*(?:N°|Nº|NO|NRO|NUMERO)?\s*:?\s*([A-Z0-9\-_/]{3,30})",
        ]
    elif tipo == "OS":
        patterns = [
            r"ORDEN\s+DE\s+SERVICIO[\s\S]{0,140}?N[°ºO]?\s*:?[\s\n]*([0-9]{3,12})",
            r"ORDEN\s+SERVICIO[\s\S]{0,140}?N[°ºO]?\s*:?[\s\n]*([0-9]{3,12})",
            r"ORDEN\s+DE\s+SERVICIO\s*(?:N°|Nº|NO|NRO|NUMERO)?\s*:?\s*([A-Z0-9\-_/]{3,30})",
            r"ORDEN\s+SERVICIO\s*(?:N°|Nº|NO|NRO|NUMERO)?\s*:?\s*([A-Z0-9\-_/]{3,30})",
            r"\bOS\s*(?:N°|Nº|NO|NRO|NUMERO)?\s*:?\s*([A-Z0-9\-_/]{3,30})",
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


def extract_order_ruc_proveedor(text: str) -> str | None:
    rucs = re.findall(r"\b(10\d{9}|20\d{9})\b", normalize_ocr_text(text))

    # RUCs propios/clientes frecuentes que no deben tomarse como proveedor cuando hay otro antes.
    own_or_client_rucs = {
        "20565747356",  # BBTI
        "20299922821",  # BBTEC
        "20613521004",  # CIMA
        "20614307197",  # TARMA
        "20612122416",  # HUANCA
        "20609856140",  # KIMBIRI
    }

    for ruc in rucs:
        if ruc not in own_or_client_rucs:
            return ruc

    return rucs[0] if rucs else None


def extract_order_proveedor(text: str, tipo_documental: str | None = None) -> str | None:
    raw = normalize_ocr_text(text)
    tipo = str(tipo_documental or "").upper()

    # Formato OC: SEÑOR(ES) : PROVEEDOR FECHA : ...
    match = re.search(
        r"SEÑOR\(ES\)\s*:\s*([^\n:]{4,180}?)\s+FECHA\s*:",
        raw,
        flags=re.IGNORECASE,
    )
    if match:
        value = re.sub(r"\s+", " ", match.group(1)).strip(" :-")
        if not _is_noise_line(value):
            return clean_order_party_name(value)

    # Formato OS digital Starsoft: proveedor suele aparecer después de COTIZACION cuando SEÑOR(ES) está vacío.
    lines = _lines(raw)
    for idx, line in enumerate(lines):
        line_u = normalize_for_search(line).strip(" :-")

        if line_u.startswith("COTIZACION") or line_u.startswith("COTIZACIÓN"):
            for candidate in lines[idx + 1 : idx + 8]:
                candidate_clean = re.sub(r"\s+", " ", candidate).strip(" :-")
                candidate_u = normalize_for_search(candidate_clean)

                if _is_noise_line(candidate_clean):
                    continue

                if "BBTI" in candidate_u or "BB TECNOLOGIA" in candidate_u:
                    continue

                if re.search(r"\b(S\.A\.?C\.?|SAC|S\.A\.?|E\.I\.R\.L\.?|SRL|S\.R\.L\.?|SOCIEDAD)", candidate_u):
                    return clean_order_party_name(candidate_clean)

            # Si no encontró razón social formal, tomar primera línea con letras suficiente.
            for candidate in lines[idx + 1 : idx + 8]:
                candidate_clean = re.sub(r"\s+", " ", candidate).strip(" :-")
                candidate_u = normalize_for_search(candidate_clean)

                if not _is_noise_line(candidate_clean) and not re.search(r"\d{1,2}/\d{1,2}/\d{4}", candidate_u):
                    return clean_order_party_name(candidate_clean)

    fallback = extract_proveedor(raw)
    return None if _is_noise_line(fallback) else clean_order_party_name(fallback)


def extract_order_moneda(text: str) -> str | None:
    lines = _lines(text)

    for idx, line in enumerate(lines):
        line_u = normalize_for_search(line)

        if "MONEDA" in line_u:
            same_line = re.search(r"MONEDA\s*:\s*([A-ZÁÉÍÓÚ ]{4,40})", line, flags=re.IGNORECASE)
            if same_line:
                value = normalize_for_search(same_line.group(1)).strip()
                if "SOLES" in value:
                    return "SOLES"
                if "DOLARES" in value or "DÓLARES" in value:
                    return "DOLARES AMERICANOS"

            for candidate in lines[idx + 1 : idx + 4]:
                candidate_u = normalize_for_search(candidate)
                if "SOLES" in candidate_u:
                    return "SOLES"
                if "DOLARES" in candidate_u or "DÓLARES" in candidate_u:
                    return "DOLARES AMERICANOS"

    t = normalize_for_search(text)
    if "DOLARES AMERICANOS" in t:
        return "DOLARES AMERICANOS"
    if "SOLES" in t:
        return "SOLES"

    return None


def extract_order_monto_total(text: str, tipo_documental: str | None = None) -> float | None:
    tipo = str(tipo_documental or "").upper()
    t = normalize_for_search(text)

    # En algunas OS/OC digitales el PDF extrae la tabla de totales como:
    # Sub - total \n 2,177.12 \n 2,569.00 \n 391.88
    # El monto total suele ser el segundo importe y el IGV el tercero.
    if tipo == "OS":
        match = re.search(r"SUB\s*-?\s*TOTAL[\s\S]{0,120}", t)
        if match:
            amounts = [parse_amount(value) for value in re.findall(r"[0-9][0-9,]*(?:\.[0-9]{2})", match.group(0))]
            amounts = [amount for amount in amounts if amount is not None]

            if len(amounts) >= 2:
                return amounts[1]

    # Si el texto mantiene 'TOTAL S/ 2,569.00', tomar ese valor.
    direct_patterns = [
        r"TOTAL\s*(?:S/|S\.|US\$)?\s*:?[\s\n]*([0-9][0-9,]*(?:\.[0-9]{2}))",
        r"TOTAL\s+(?:S/|US\$)[\s\n]*([0-9][0-9,]*(?:\.[0-9]{2}))",
    ]

    for pattern in direct_patterns:
        match = re.search(pattern, t, flags=re.DOTALL)
        if match:
            amount = parse_amount(match.group(1))
            if amount is not None:
                return amount

    return extract_monto(text)


def extract_order_cotizacion(text: str) -> str | None:
    raw = normalize_ocr_text(text)
    lines = _lines(raw)

    for idx, line in enumerate(lines):
        line_u = normalize_for_search(line).strip(" :-")

        if line_u.startswith("COTIZACION") or line_u.startswith("COTIZACIÓN"):
            same_line = re.search(r"COTIZACI[OÓ]N\s*:\s*([A-Z0-9\-_/]{3,40})", line, flags=re.IGNORECASE)
            if same_line:
                return same_line.group(1).strip()

            for candidate in lines[idx + 1 : idx + 8]:
                candidate_clean = candidate.strip(" :-")
                candidate_u = normalize_for_search(candidate_clean)

                if re.fullmatch(r"[A-Z0-9][A-Z0-9\-_/]{3,40}", candidate_u):
                    if not re.fullmatch(r"\d{1,2}/\d{1,2}/\d{4}", candidate_u):
                        return candidate_clean

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

    return {
        "numero": numero,
        "fechaEmision": extract_fecha(text),
        "montoTotal": extract_order_monto_total(text, tipo),
        "proveedor": extract_order_proveedor(text, tipo),
        "rucProveedor": extract_order_ruc_proveedor(text),
        "moneda": extract_order_moneda(text),
        "cotizacion": extract_order_cotizacion(text),
    }
