import re
from typing import Any

from app.extractors.metadata_extractor import (
    extract_fecha,
    extract_monto,
    extract_numero_operacion,
    extract_banco,
    normalize_for_search,
    normalize_ocr_text,
    parse_amount,
)
from app.extractors.filename_metadata_extractor import extract_pago_from_filename

_CLIENT_RUCS = {
    "20299922821", "20565747356", "20613521004",
    "20614307197", "20612122416", "20609856140",
}

def _first_amount(text: str, patterns: list[str]) -> float | None:
    t = normalize_for_search(text)
    for pattern in patterns:
        match = re.search(pattern, t, flags=re.DOTALL)
        if match:
            amount = parse_amount(match.group(1))
            if amount is not None:
                return amount
    return None

def extract_transferencia_montos(text: str) -> dict[str, float | None]:
    monto_operacion = _first_amount(text, [
        r"(?:IMPORTE|MONTO)\s+(?:DE\s+LA\s+)?(?:OPERACION|TRANSFERENCIA|PAGO)\s*:?\s*(?:S/\.?|US\$|\$)?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)",
        r"IMPORTE\s+ABONADO\s*:?\s*(?:S/\.?|US\$|\$)?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)",
        r"MONTO\s+PAGADO\s*:?\s*(?:S/\.?|US\$|\$)?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)",
    ])
    comision = _first_amount(text, [
        r"COMISI(?:O|Ó)N(?:\s+BANCARIA)?\s*:?\s*(?:S/\.?|US\$|\$)?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)",
        r"GASTOS?\s+BANCARIOS?\s*:?\s*(?:S/\.?|US\$|\$)?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)",
    ])
    monto_total_debitado = _first_amount(text, [
        r"(?:TOTAL|MONTO)\s+DEBITADO\s*:?\s*(?:S/\.?|US\$|\$)?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)",
        r"IMPORTE\s+CARGADO\s*:?\s*(?:S/\.?|US\$|\$)?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)",
        r"TOTAL\s+OPERACION\s*:?\s*(?:S/\.?|US\$|\$)?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)",
    ])
    monto_total = monto_operacion or monto_total_debitado
    if monto_total is None:
        generic = extract_monto(text)
        if generic is not None and (comision is None or abs(generic - comision) > 0.000001):
            monto_total = generic
    return {
        "montoOperacion": monto_operacion,
        "comision": comision,
        "montoTotalDebitado": monto_total_debitado,
        "montoTotal": monto_total,
    }

def extract_transferencia_moneda(text: str) -> str | None:
    t = normalize_for_search(text)
    if re.search(r"\b(?:US\$|USD|DOLARES?|DOLAR AMERICANO)\b", t):
        return "USD"
    if re.search(r"(?:S/\.?|\bPEN\b|\bSOLES?\b)", t):
        return "PEN"
    return None

def extract_transferencia_estado(text: str) -> str | None:
    t = normalize_for_search(text)
    for token in ["PROCESADA", "COMPLETADA", "EXITOSA", "APROBADA", "RECHAZADA", "ANULADA", "PENDIENTE"]:
        if token in t:
            return token
    return None

def extract_transferencia_documento_referenciado(text: str) -> str | None:
    t = normalize_for_search(text)
    for pattern in [
        r"(?:DOCUMENTO|REFERENCIA|FACTURA|LETRA)\s*(?:PAGADA|REFERENCIADA|NRO|N°|NUMERO)?\s*:?\s*([A-Z0-9]{1,8}\s*[- ]\s*[0-9]{1,16})",
        r"\b([FBE][A-Z0-9]{2,5}\s*[- ]\s*[0-9]{1,16})\b",
    ]:
        match = re.search(pattern, t)
        if match:
            return re.sub(r"\s+", "", match.group(1).strip())
    return None

def extract_detraccion_operacion(text: str) -> str | None:
    t = normalize_for_search(text)
    for pattern in [
        r"(?:NUMERO|NRO|N°)\s+(?:DE\s+)?(?:OPERACION|CONSTANCIA)\s*:?\s*([0-9][0-9\-]{4,30})",
        r"CONSTANCIA\s+(?:DE\s+DEPOSITO\s+)?(?:N°|Nº|NO|NRO|NUMERO)?\s*:?\s*([0-9][0-9\-]{4,30})",
        r"OPERACION\s*(?:N°|Nº|NO|NRO|NUMERO)?\s*:?\s*([0-9][0-9\-]{4,30})",
    ]:
        match = re.search(pattern, t)
        if match:
            return match.group(1).strip(" .:-")
    return extract_numero_operacion(text)

def extract_detraccion_comprobante(text: str) -> str | None:
    t = normalize_for_search(text)
    for pattern in [
        r"COMPROBANTE\s*(?:DE\s+PAGO)?\s*:?\s*([A-Z0-9\-]{3,30})",
        r"FACTURA\s*:?\s*([A-Z0-9]{3,6}\s*[- ]\s*\d{1,12})",
    ]:
        match = re.search(pattern, t)
        if match:
            return re.sub(r"\s+", "", match.group(1).strip())
    return None

def extract_pago_rucs(text: str) -> dict[str, str | None]:
    rucs = re.findall(r"\b(10\d{9}|20\d{9})\b", normalize_ocr_text(text))
    return {
        "clienteRuc": next((r for r in rucs if r in _CLIENT_RUCS), None),
        "proveedorRuc": next((r for r in rucs if r not in _CLIENT_RUCS), None),
    }

def extract_pago_proveedor_nombre_etiquetado(text: str) -> str | None:
    lines = [line.strip() for line in normalize_ocr_text(text).splitlines() if line.strip()]
    for idx, line in enumerate(lines[:-1]):
        if not re.fullmatch(r"(?i)proveedor\s*:?", line):
            continue

        candidate = lines[idx + 1].strip(" :-")
        if not candidate:
            continue

        if re.fullmatch(
            r"(?i)(ruc\s+proveedor|fecha\s+factura|importe\s+factura|factura|centro\s+de\s+costo)\s*:?",
            candidate,
        ):
            continue

        return re.sub(r"\s+", " ", candidate)[:160]

    return None


def extract_pago_nombre_cercano(text: str, ruc: str | None) -> str | None:
    if not ruc:
        return None
    lines = [line.strip() for line in normalize_ocr_text(text).splitlines() if line.strip()]
    for idx, line in enumerate(lines):
        if ruc not in line:
            continue
        after = line.split(ruc, 1)[-1].strip(" :-")
        if len(after) >= 4 and not after.isdigit():
            return re.sub(r"\s+", " ", after)[:160]
        if idx + 1 < len(lines):
            candidate = lines[idx + 1].strip(" :-")
            if len(candidate) >= 4 and not re.fullmatch(r"[0-9.,/\-]+", candidate):
                return re.sub(r"\s+", " ", candidate)[:160]
    return None

def extract_pago_metadata(text: str, tipo_documental: str, filename: str | None = None) -> dict[str, Any]:
    tipo = str(tipo_documental or "").upper()
    tipo = "TRANSFERENCIA" if tipo == "PAGO_TRANSFERENCIA" else tipo
    from_file = extract_pago_from_filename(filename, tipo_documental)
    rucs = extract_pago_rucs(text)
    numero_operacion = extract_detraccion_operacion(text) if tipo == "PAGO_DETRACCION" else extract_numero_operacion(text)
    proveedor_ruc = rucs.get("proveedorRuc")
    cliente_ruc = rucs.get("clienteRuc")
    metadata: dict[str, Any] = {
        "numeroOperacion": numero_operacion or from_file.get("numeroOperacion"),
        "numeroConstancia": numero_operacion or from_file.get("numeroOperacion"),
        "comprobante": extract_detraccion_comprobante(text),
        "fechaPago": extract_fecha(text),
        "banco": extract_banco(text) or from_file.get("banco"),
        "proveedorRuc": proveedor_ruc,
        "proveedorNombre": extract_pago_proveedor_nombre_etiquetado(text)
        or extract_pago_nombre_cercano(text, proveedor_ruc),
        "clienteRuc": cliente_ruc,
        "clienteNombre": extract_pago_nombre_cercano(text, cliente_ruc),
        "clienteAbreviatura": from_file.get("clienteAbreviatura"),
    }
    if tipo == "TRANSFERENCIA":
        metadata.update(extract_transferencia_montos(text))
        metadata.update({
            "moneda": extract_transferencia_moneda(text),
            "documentoReferenciado": extract_transferencia_documento_referenciado(text),
            "estadoOperacion": extract_transferencia_estado(text),
        })
    else:
        metadata["montoTotal"] = _first_amount(text, [
            r"(?:IMPORTE|MONTO)\s*:?\s*(?:S/\.?|US\$|\$)?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)",
            r"IMPORTE\s+DEPOSITADO\s*:?\s*(?:S/\.?|US\$|\$)?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)",
            r"MONTO\s+DEPOSITADO\s*:?\s*(?:S/\.?|US\$|\$)?\s*([0-9][0-9,]*(?:\.[0-9]{2})?)",
        ]) or extract_monto(text)
    return metadata
