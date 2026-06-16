import re
from pathlib import Path
from typing import Any


CLIENTE_CODES = {"BBTEC", "BBTI", "CIMA", "HUANCA", "TARMA", "KIMBIRI"}


def clean_filename(filename: str | None) -> str:
    name = Path(str(filename or "")).stem.upper()
    name = name.replace("_", " ")
    name = re.sub(r"\s+", " ", name)
    return name.strip()


def extract_cliente_from_filename(filename: str | None) -> str | None:
    text = clean_filename(filename)

    for code in CLIENTE_CODES:
        if re.search(rf"\b{code}\b", text):
            return code

    return None


def extract_rh_from_filename(filename: str | None) -> dict[str, Any]:
    text = clean_filename(filename)

    if "RECIBO HONORARIO" not in text and "RECIBO_HONORARIO" not in str(filename or "").upper():
        return {}

    serie = None
    numero = None
    ruc = None
    persona = None

    match = re.search(r"\b(E\d{3})\s+(\d{1,12})\s+((?:10|20)\d{9})\s+(.+)$", text)

    if match:
        serie = match.group(1)
        numero = match.group(2)
        ruc = match.group(3)
        persona = match.group(4).strip()
    else:
        ruc_match = re.search(r"\b((?:10|20)\d{9})\b", text)
        serie_match = re.search(r"\b(E\d{3})\b", text)

        if ruc_match:
            ruc = ruc_match.group(1)

        if serie_match:
            serie = serie_match.group(1)
            after = text[serie_match.end():]
            num_match = re.search(r"\b(\d{1,12})\b", after)
            if num_match:
                numero = num_match.group(1)

        if ruc:
            after_ruc = text.split(ruc, 1)[-1].strip()
            persona = after_ruc or None

    if persona:
        persona = re.sub(r"\s+", " ", persona.replace("_", " ")).strip()

    return {
        "ruc": ruc,
        "serie": serie,
        "numero": numero,
        "persona": persona,
        "clienteAbreviatura": extract_cliente_from_filename(filename),
    }


def extract_pago_from_filename(filename: str | None, tipo_documental: str) -> dict[str, Any]:
    text = clean_filename(filename)
    tipo = str(tipo_documental or "").upper()

    if tipo == "PAGO_DETRACCION" and "PAGO DETRACCION" not in text:
        return {}

    if tipo == "PAGO_TRANSFERENCIA" and "PAGO TRANSFERENCIA" not in text:
        return {}

    banco = None

    bancos = {
        "INTERBANK": "INTERBANK",
        "BCP": "BCP",
        "BBVA": "BBVA",
        "SCOTIABANK": "SCOTIABANK",
        "BN": "BANCO DE LA NACION",
        "BANCO DE LA NACION": "BANCO DE LA NACION",
    }

    for raw, normalized in bancos.items():
        if re.search(rf"\b{re.escape(raw)}\b", text):
            banco = normalized
            break

    numero_operacion = None

    if tipo == "PAGO_TRANSFERENCIA":
        match = re.search(r"PAGO\s+TRANSFERENCIA\s+(?:[A-Z]+\s+)?([0-9][0-9\-]{3,20})\b", text)
        if match:
            numero_operacion = match.group(1)

    if tipo == "PAGO_DETRACCION":
        match = re.search(r"PAGO\s+DETRACCION\s+(?:[A-Z]+\s+)?([0-9][0-9\-]{3,20})\b", text)
        if match:
            numero_operacion = match.group(1)

    if not numero_operacion:
        numbers = re.findall(r"\b\d{5,20}\b", text)
        if numbers:
            numero_operacion = numbers[-1]

    return {
        "numeroOperacion": numero_operacion,
        "banco": banco,
        "clienteAbreviatura": extract_cliente_from_filename(filename),
    }
