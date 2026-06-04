import re 
from typing import Optional
from app.core.dates import normalize_date


def extract_ruc(text: str) -> Optional[str]:
    match = re.search(r'\b(10\d{9}|20\d{9})\b', text)

    if match:
        return match.group(1)

    return None


def extract_serie_numero(text: str):
    patterns = [
        r'([A-Z0-9]{3,5})[- ](\d{1,12})',
        r'([FBE][A-Z0-9]{2,4})[- ](\d{1,12})',
    ]

    for pattern in patterns:
        match = re.search(pattern, text)

        if match:
            return {
                "serie": match.group(1),
                "numero": match.group(2),
            }

    return {
        "serie": None,
        "numero": None,
    }


def extract_fecha(text: str):
    match = re.search(r'(\d{1,2}/\d{1,2}/\d{4})', text)

    if not match:
        return None

    return normalize_date(match.group(1))


def extract_monto(text: str):
    t = text.upper()

    patterns = [
        r"TOTAL\s+IMPORTE\s*S\/\s*([0-9]+(?:\.[0-9]{2})?)",
        r"IMPORTE\s+TOTAL\s*:?\s*S\/\.?\s*([0-9]+(?:\.[0-9]{2})?)",
        r"\bTOTAL\b\s*S\/\s*([0-9]+(?:\.[0-9]{2})?)",
    ]

    for pattern in patterns:
        match = re.search(pattern, t)
        if match:
            return float(match.group(1))

    return None
