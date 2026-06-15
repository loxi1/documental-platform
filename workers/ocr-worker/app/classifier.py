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
    text = (
        text.replace("Á", "A")
        .replace("É", "E")
        .replace("Í", "I")
        .replace("Ó", "O")
        .replace("Ú", "U")
    )
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def classify_document(text: str, filename: str = "") -> TipoDocumento:
    t = normalize_text(text)
    f = normalize_text(filename)

    if "RECIBO POR HONORARIO" in t or "RECIBO POR HONORARIOS" in t:
        return "RECIBO_HONORARIO"

    if "NOTA DE CREDITO" in t or "NOTA CREDITO" in t:
        return "NOTA_CREDITO"

    if (
        "GUIA DE REMISION" in t
        or "GUIA REMISION" in t
        or "GUIA DE REMISION ELECTRONICA" in t
    ):
        return "GUIA_REMISION"

    if (
        "ORDEN DE COMPRA" in t
        or "ORDEN COMPRA" in t
        or re.search(r"\bOC[-_\s]?\d+", f)
        or re.search(r"\bOC\b", f)
    ):
        return "OC"

    if (
        "ORDEN DE SERVICIO" in t
        or "ORDEN SERVICIO" in t
        or re.search(r"\bOS[-_\s]?\d+", f)
        or re.search(r"\bOS\b", f)
    ):
        return "OS"

    if "NOTA DE INGRESO" in t or "NOTA INGRESO" in t:
        return "NOTA_INGRESO"

    if (
        "DETRACCION" in t
        or "CONSTANCIA DE DEPOSITO" in t
        or "SISTEMA DE DETRACCIONES" in t
        or "BANCO DE LA NACION" in t and "DETRACC" in t
    ):
        return "PAGO_DETRACCION"

    if (
        "TRANSFERENCIA" in t
        or "OPERACION" in t and ("BANCO" in t or "CUENTA" in t)
        or "CONSTANCIA DE TRANSFERENCIA" in t
        or "COMPROBANTE DE PAGO" in t and "BANCO" in t
    ):
        return "PAGO_TRANSFERENCIA"

    if "FACTURA ELECTRONICA" in t or re.search(r"\bFACTURA\b", t):
        return "FACTURA"

    return "OTRO"
