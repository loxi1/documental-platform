import re
from typing import Any

from app.core.clientes_destino import detect_cliente_destino
from app.extractors.metadata_extractor import (
    extract_fecha,
    extract_monto,
    extract_proveedor,
    extract_numero_from_filename,
    normalize_for_search,
    normalize_ocr_text,
    parse_amount,
)


def _lines(text: str) -> list[str]:
    return [line.strip() for line in normalize_ocr_text(text).splitlines() if line.strip()]


def _normalize_provider_name(value: str | None) -> str | None:
    if not value:
        return None

    name = re.sub(r"\s+", " ", value).strip(" :-")

    if " - " in name:
        left, right = name.split(" - ", 1)
        if len(left.strip()) >= 6:
            name = left.strip()

    replacements = {
        "SOCIEDAD ANONIMA CERRADA": "S.A.C.",
        "SOCIEDAD ANÓNIMA CERRADA": "S.A.C.",
        "SOCIEDAD ANONIMA": "S.A.",
        "SOCIEDAD ANÓNIMA": "S.A.",
        "EMPRESA INDIVIDUAL DE RESPONSABILIDAD LIMITADA": "E.I.R.L.",
    }

    upper = name.upper()
    for raw, repl in replacements.items():
        if raw in upper:
            name = re.sub(raw, repl, name, flags=re.IGNORECASE)
            break

    return re.sub(r"\s+", " ", name).strip()


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
            r"ORDEN\s+DE\s+SERVICIO.{0,160}?(?:N°|Nº|NO|NRO|NUMERO)\s*:?\s*([A-Z0-9\-_/]{3,30})",
            r"ORDEN\s+SERVICIO.{0,160}?(?:N°|Nº|NO|NRO|NUMERO)\s*:?\s*([A-Z0-9\-_/]{3,30})",
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


def extract_orden_moneda(text: str) -> str | None:
    t = normalize_for_search(text)
    match = re.search(r"MONEDA\s*:\s*([A-Z]{3,}|SOLES|DOLARES|DOLARES AMERICANOS)", t)
    if match:
        return match.group(1).strip()

    lines = _lines(text)
    for idx, line in enumerate(lines):
        if "MONEDA" in line.upper():
            for item in lines[idx + 1: idx + 4]:
                value = item.strip().upper()
                if value in ["SOLES", "DOLARES", "DÓLARES", "USD"]:
                    return "DOLARES" if value in ["DOLARES", "DÓLARES", "USD"] else value

    return None


def extract_orden_proveedor_ruc(text: str) -> str | None:
    lines = _lines(text)

    for idx, line in enumerate(lines):
        if "R.U.C" in line.upper() or "RUC" in line.upper():
            same_line = re.search(r"\b(10\d{9}|20\d{9})\b", line)
            if same_line:
                return same_line.group(1)

            for item in lines[max(0, idx - 2): idx + 3]:
                match = re.search(r"\b(10\d{9}|20\d{9})\b", item)
                if match:
                    return match.group(1)

    match = re.search(r"\b(10\d{9}|20\d{9})\b", text)
    return match.group(1) if match else None


def extract_orden_proveedor_nombre(text: str, tipo_documental: str) -> str | None:
    tipo = str(tipo_documental or "").upper()

    if tipo == "OS":
        lines = _lines(text)
        for idx, line in enumerate(lines):
            if "COTIZACION" in line.upper() or "COTIZACIÓN" in line.upper():
                for item in lines[idx + 1: idx + 8]:
                    item_clean = item.strip()
                    item_upper = item_clean.upper()
                    if re.fullmatch(r"\d{1,2}/\d{1,2}/\d{4}", item_clean):
                        continue
                    if re.fullmatch(r"\d{6,}[-\d]*", item_clean):
                        continue
                    if item_upper in ["CONTADO", "CREDITO", "CRÉDITO"]:
                        continue
                    if "BBTI" in item_upper or "BB TECNOLOGIA" in item_upper:
                        continue
                    if len(item_clean) >= 6 and re.search(r"[A-ZÁÉÍÓÚÑ]", item_upper):
                        return _normalize_provider_name(item_clean)

    return extract_proveedor(text)


def extract_orden_total(text: str) -> float | None:
    lines = _lines(text)

    for idx, line in enumerate(lines):
        if re.fullmatch(r"TOTAL\s*", line.upper()) or line.upper().startswith("TOTAL "):
            amounts: list[float] = []
            for item in lines[idx + 1: idx + 12]:
                for raw in re.findall(r"\b\d{1,3}(?:,\d{3})*(?:\.\d{2})\b|\b\d+\.\d{2}\b", item):
                    amount = parse_amount(raw)
                    if amount is not None:
                        amounts.append(amount)
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
    cliente = detect_cliente_destino(text) or {}

    numero = (
        enriched.get("numero")
        or extract_orden_numero_from_text(text, tipo)
        or extract_orden_numero_from_filename(filename, tipo)
    )

    return {
        "numero": numero,
        "fechaEmision": extract_fecha(text),
        "montoTotal": extract_orden_total(text),
        "moneda": extract_orden_moneda(text),
        "proveedor": extract_orden_proveedor_nombre(text, tipo),
        "proveedorRuc": extract_orden_proveedor_ruc(text),
        "clienteAbreviatura": cliente.get("clienteAbreviatura"),
        "clienteRuc": cliente.get("clienteRuc"),
        "empresaNombre": cliente.get("empresaNombre"),
    }
