import re
from typing import Literal

TipoDocumento = Literal[
    "FACTURA",
    "GUIA_REMISION",
    "OC",
    "OS",
    "NOTA_INGRESO",
    "PAGO_TRANSFERENCIA",
    "PAGO_DETRACCION",
    "RECIBO_HONORARIO",
    "NOTA_CREDITO",
    "OTRO",
]


def normalize_text(text: str) -> str:
    text = text.upper()
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def classify_document(text: str, filename: str = "") -> TipoDocumento:
    t = normalize_text(text)
    f = filename.upper()

    if "RECIBO POR HONORARIO" in t or "RECIBO POR HONORARIOS" in t:
        return "RECIBO_HONORARIO"

    if "NOTA DE CRÉDITO" in t or "NOTA DE CREDITO" in t:
        return "NOTA_CREDITO"

    if "GUÍA DE REMISIÓN" in t or "GUIA DE REMISION" in t or "GUÍA REMISIÓN" in t:
        return "GUIA_REMISION"

    if "ORDEN DE COMPRA" in t or re.search(r"\bOC\b", f):
        return "OC"

    if "ORDEN DE SERVICIO" in t or re.search(r"\bOS\b", f):
        return "OS"

    if "NOTA DE INGRESO" in t or "NOTA INGRESO" in t:
        return "NOTA_INGRESO"

    if "DETRACCIÓN" in t or "DETRACCION" in t:
        return "PAGO_DETRACCION"

    if "TRANSFERENCIA" in t or "OPERACIÓN" in t or "OPERACION" in t:
        return "PAGO_TRANSFERENCIA"

    if "FACTURA ELECTRÓNICA" in t or "FACTURA ELECTRONICA" in t or re.search(r"\bFACTURA\b", t):
        return "FACTURA"

    return "OTRO"
