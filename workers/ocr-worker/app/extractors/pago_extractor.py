import re
from typing import Any

from app.extractors.metadata_extractor import (
    extract_fecha,
    extract_monto,
    extract_numero_operacion,
    extract_banco,
    extract_ruc,
    normalize_for_search,
    normalize_ocr_text,
)
from app.extractors.filename_metadata_extractor import extract_pago_from_filename


_CLIENT_RUCS = {
    "20299922821",
    "20565747356",
    "20613521004",
    "20614307197",
    "20612122416",
    "20609856140",
}


def extract_detraccion_operacion(text: str) -> str | None:
    t = normalize_for_search(text)

    patterns = [
        r"(?:NUMERO|NRO|N°)\s+(?:DE\s+)?(?:OPERACION|CONSTANCIA)\s*:?\s*([0-9][0-9\-]{4,30})",
        r"CONSTANCIA\s+(?:DE\s+DEPOSITO\s+)?(?:N°|Nº|NO|NRO|NUMERO)?\s*:?\s*([0-9][0-9\-]{4,30})",
        r"OPERACION\s*(?:N°|Nº|NO|NRO|NUMERO)?\s*:?\s*([0-9][0-9\-]{4,30})",
    ]

    for pattern in patterns:
        match = re.search(pattern, t)
        if match:
            value = match.group(1).strip(" .:-")
            if re.search(r"\d", value):
                return value

    return extract_numero_operacion(text)


def extract_detraccion_comprobante(text: str) -> str | None:
    t = normalize_for_search(text)

    patterns = [
        r"COMPROBANTE\s*(?:DE\s+PAGO)?\s*:?\s*([A-Z0-9\-]{3,30})",
        r"FACTURA\s*:?\s*([A-Z0-9]{3,6}\s*[- ]\s*\d{1,12})",
    ]

    for pattern in patterns:
        match = re.search(pattern, t)
        if match:
            return re.sub(r"\s+", "", match.group(1).strip())

    return None


def extract_pago_rucs(text: str) -> dict[str, str | None]:
    rucs = re.findall(r"\b(10\d{9}|20\d{9})\b", normalize_ocr_text(text))
    cliente = next((r for r in rucs if r in _CLIENT_RUCS), None)
    proveedor = next((r for r in rucs if r not in _CLIENT_RUCS), None)

    return {
        "clienteRuc": cliente,
        "proveedorRuc": proveedor,
    }


def extract_pago_nombre_cercano(text: str, ruc: str | None) -> str | None:
    if not ruc:
        return None

    raw = normalize_ocr_text(text)
    lines = [line.strip() for line in raw.splitlines() if line.strip()]

    for idx, line in enumerate(lines):
        if ruc in line:
            after = line.split(ruc, 1)[-1].strip(" :-")
            if len(after) >= 4 and not after.isdigit():
                return re.sub(r"\s+", " ", after)[:160]
            if idx + 1 < len(lines):
                candidate = lines[idx + 1].strip(" :-")
                if len(candidate) >= 4 and not re.fullmatch(r"[0-9.,/\-]+", candidate):
                    return re.sub(r"\s+", " ", candidate)[:160]

    return None


def extract_pago_metadata(
    text: str,
    tipo_documental: str,
    filename: str | None = None,
) -> dict[str, Any]:
    tipo = str(tipo_documental or "").upper()
    from_file = extract_pago_from_filename(filename, tipo_documental)
    rucs = extract_pago_rucs(text)
    numero_operacion = (
        extract_detraccion_operacion(text)
        if tipo == "PAGO_DETRACCION"
        else extract_numero_operacion(text)
    )

    proveedor_ruc = rucs.get("proveedorRuc")
    cliente_ruc = rucs.get("clienteRuc")

    return {
        "numeroOperacion": numero_operacion or from_file.get("numeroOperacion"),
        "numeroConstancia": numero_operacion or from_file.get("numeroOperacion"),
        "comprobante": extract_detraccion_comprobante(text),
        "fechaPago": extract_fecha(text),
        "montoTotal": extract_monto(text),
        "banco": extract_banco(text) or from_file.get("banco"),
        "proveedorRuc": proveedor_ruc,
        "proveedorNombre": extract_pago_nombre_cercano(text, proveedor_ruc),
        "clienteRuc": cliente_ruc,
        "clienteNombre": extract_pago_nombre_cercano(text, cliente_ruc),
        "clienteAbreviatura": from_file.get("clienteAbreviatura"),
    }
