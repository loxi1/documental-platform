import re
from typing import Any, Optional

from app.core.dates import normalize_date


def normalize_ocr_text(text: str) -> str:
    return (
        str(text or "")
        .replace("\u00a0", " ")
        .replace("Nº", "N°")
        .replace("NRO.", "NRO")
        .replace("NRO:", "NRO:")
    )


def normalize_for_search(text: str) -> str:
    text = normalize_ocr_text(text).upper()
    return (
        text.replace("Á", "A")
        .replace("É", "E")
        .replace("Í", "I")
        .replace("Ó", "O")
        .replace("Ú", "U")
    )


def extract_ruc(text: str) -> Optional[str]:
    match = re.search(r"\b(10\d{9}|20\d{9})\b", text)
    return match.group(1) if match else None


def extract_serie_numero(text: str) -> dict[str, str | None]:
    t = normalize_for_search(text)

    patterns = [
        r"\b([FBE][A-Z0-9]{2,4})\s*[- ]\s*(\d{1,12})\b",
        r"\b([A-Z]{1,3}\d{1,3})\s*[- ]\s*(\d{1,12})\b",
        r"\bSERIE\s*:?\s*([A-Z0-9]{3,6}).{0,30}\bN[°OºRO]*\s*:?\s*(\d{1,12})\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, t, flags=re.DOTALL)

        if match:
            return {
                "serie": match.group(1).strip(),
                "numero": match.group(2).strip(),
            }

    return {
        "serie": None,
        "numero": None,
    }


def extract_fecha(text: str) -> str | None:
    t = normalize_ocr_text(text)

    patterns = [
        r"(\d{1,2}/\d{1,2}/\d{4})",
        r"(\d{1,2}-\d{1,2}-\d{4})",
        r"(\d{4}-\d{2}-\d{2})",
        r"(\d{4}/\d{2}/\d{2})",
        r"(\d{1,2}/[A-Za-z]{3}\.?/\d{4})",
        r"(\d{1,2}-[A-Za-z]{3}-\d{4})",
        r"(\d{1,2}\s+DE\s+[A-Za-zÁÉÍÓÚáéíóú]+ DEL?\s+\d{4})",
    ]

    for pattern in patterns:
        match = re.search(pattern, t, flags=re.IGNORECASE)

        if match:
            return normalize_date(match.group(1))

    return None


def parse_amount(value: str | None) -> float | None:
    if not value:
        return None

    raw = (
        str(value)
        .strip()
        .replace("S/", "")
        .replace("US$", "")
        .replace("SOLES", "")
        .replace("DOLARES", "")
        .replace(" ", "")
    )

    if "," in raw and "." in raw:
        raw = raw.replace(",", "")
    elif "," in raw and "." not in raw:
        raw = raw.replace(",", ".")

    try:
        return float(raw)
    except Exception:
        return None


def extract_monto(text: str) -> float | None:
    t = normalize_for_search(text)

    patterns = [
        r"TOTAL\s+IMPORTE\s*:?\s*(?:S\/\.?|US\$)?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)",
        r"IMPORTE\s+TOTAL\s*:?\s*(?:S\/\.?|US\$)?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)",
        r"TOTAL\s+A\s+PAGAR\s*:?\s*(?:S\/\.?|US\$)?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)",
        r"MONTO\s+TOTAL\s*:?\s*(?:S\/\.?|US\$)?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)",
        r"IMPORTE\s+CARGADO\s*:?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)\s*(?:SOLES|DOLARES)?",
        r"IMPORTE\s+ABONADO\s*:?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)\s*(?:SOLES|DOLARES)?",
        r"\bTOTAL\b\s*(?:S\/\.?|US\$)?\s*:?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)",
        r"\bIMPORTE\b\s*(?:S\/\.?|US\$)?\s*:?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)",
    ]

    candidates: list[float] = []

    for pattern in patterns:
        for match in re.finditer(pattern, t):
            amount = parse_amount(match.group(1))

            if amount is not None:
                candidates.append(amount)

    return candidates[-1] if candidates else None


def extract_value_by_labels(text: str, labels: list[str], max_len: int = 80) -> str | None:
    t = normalize_ocr_text(text)

    for label in labels:
        pattern = rf"{re.escape(label)}\s*:?\s*([A-Za-z0-9][A-Za-z0-9\-_/.,]*)"
        match = re.search(pattern, t, flags=re.IGNORECASE)

        if match:
            value = match.group(1).strip(" :-")

            if value:
                return value[:max_len]

    return None


def extract_numero_from_filename(filename: str | None, prefix: str | None = None) -> str | None:
    if not filename:
        return None

    f = str(filename).upper()

    if prefix:
        patterns = [
            rf"\b{re.escape(prefix.upper())}[_\-\s]?(\d{{3,12}})\b",
            rf"\b{re.escape(prefix.upper())}[_\-\s]?([A-Z0-9]{{3,20}})\b",
        ]
    else:
        patterns = [r"\b(\d{3,12})\b"]

    for pattern in patterns:
        match = re.search(pattern, f)

        if match:
            return match.group(1)

    return None


def extract_oc_os_numero(text: str, tipo_documental: str, filename: str | None = None) -> str | None:
    tipo = str(tipo_documental or "").upper()
    prefix = "OC" if tipo == "OC" else "OS"

    t = normalize_for_search(text)

    if prefix == "OC":
        patterns = [
            r"ORDEN\s+DE\s+COMPRA\s*(?:N°|Nº|NO|NRO|NUMERO)?\s*:?\s*([A-Z0-9\-_/]{3,30})",
            r"ORDEN\s+COMPRA\s*(?:N°|Nº|NO|NRO|NUMERO)?\s*:?\s*([A-Z0-9\-_/]{3,30})",
        ]
    else:
        patterns = [
            r"ORDEN\s+DE\s+SERVICIO\s*(?:N°|Nº|NO|NRO|NUMERO)?\s*:?\s*([A-Z0-9\-_/]{3,30})",
            r"ORDEN\s+SERVICIO\s*(?:N°|Nº|NO|NRO|NUMERO)?\s*:?\s*([A-Z0-9\-_/]{3,30})",
        ]

    patterns.append(
        rf"\b{prefix}\s*(?:N°|Nº|NO|NRO|NUMERO)?\s*:?\s*([A-Z0-9\-_/]{{3,30}})"
    )

    for pattern in patterns:
        match = re.search(pattern, t)

        if match:
            value = match.group(1).strip()

            if re.search(r"\d", value):
                return value

    return extract_numero_from_filename(filename, prefix)


def extract_nota_ingreso_numero(text: str, filename: str | None = None) -> str | None:
    lines = [line.strip() for line in normalize_ocr_text(text).splitlines() if line.strip()]

    for idx, line in enumerate(lines):
        if "DOC. REF" in line.upper() or "DOC REF" in line.upper():
            window = lines[idx: idx + 18]

            for item in window:
                match = re.search(r"\b(\d{10})\b", item)

                if match:
                    return match.group(1)

    t = normalize_for_search(text)

    patterns = [
        r"\bGC\s+\d+\s*\n(\d{10})\b",
        r"\n(\d{10})\s*\nCL COMPRAS",
        r"NRO\.?\s*DOC\.?\s*REF\.?.{0,160}?\b(\d{10})\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, t, flags=re.DOTALL)

        if match:
            return match.group(1)

    return extract_numero_from_filename(filename)


def extract_numero_documento(
    text: str,
    tipo_documental: str | None = None,
    filename: str | None = None,
) -> str | None:
    tipo = str(tipo_documental or "").upper()

    if tipo in ["OC", "OS"]:
        return extract_oc_os_numero(text, tipo, filename)

    if tipo == "NOTA_INGRESO":
        return extract_nota_ingreso_numero(text, filename)

    labels = ["NUMERO", "NRO", "N°", "DOCUMENTO"]
    value = extract_value_by_labels(text, labels)

    if value and re.search(r"\d", value):
        return value

    serie_numero = extract_serie_numero(text)
    return serie_numero.get("numero")


def extract_numero_operacion(text: str) -> str | None:
    t = normalize_for_search(text)

    strict_patterns = [
        r"(?:NUMERO|NRO|N°)\s+DE\s+OPERACION\s*:?\s*([0-9][0-9,.\-]*(?:\s*-\s*[0-9]+)?)",
        r"(?:NUMERO|NRO|N°)\s+OPERACION\s*:?\s*([0-9][0-9,.\-]*(?:\s*-\s*[0-9]+)?)",
        r"\bOPERACION\s*(?:N°|Nº|NO|NRO|NUMERO)?\s*:?\s*([0-9][0-9,.\-]*(?:\s*-\s*[0-9]+)?)",
    ]

    for pattern in strict_patterns:
        match = re.search(pattern, t)

        if match:
            value = re.sub(r"\s+", "", match.group(1).strip(" .:-"))

            if value and re.search(r"\d", value):
                return value

    return None


def extract_banco(text: str) -> str | None:
    t = normalize_for_search(text)

    bancos = [
        "BANCO DE CREDITO",
        "BCP",
        "BBVA",
        "SCOTIABANK",
        "INTERBANK",
        "BANCO DE LA NACION",
        "BANBIF",
    ]

    for banco in bancos:
        if banco in t:
            return banco

    return extract_value_by_labels(text, ["BANCO"], max_len=100)


def extract_proveedor(text: str) -> str | None:
    t = normalize_ocr_text(text)

    patterns = [
        r"SEÑOR\(ES\)\s*:\s*(.+?)(?:\s+FECHA\s*:|\n|$)",
        r"SENOR\(ES\)\s*:\s*(.+?)(?:\s+FECHA\s*:|\n|$)",
        r"PROVEEDOR\s*:?\s*(.+?)(?:\n|$)",
        r"RAZON SOCIAL\s*:?\s*(.+?)(?:\n|$)",
    ]

    for pattern in patterns:
        match = re.search(pattern, t, flags=re.IGNORECASE)

        if match:
            value = match.group(1).strip(" :-")

            if value:
                return value[:160]

    return None


def remove_empty_values(data: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in data.items()
        if value not in [None, ""]
    }
