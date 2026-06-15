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
    text = str(text or "").upper()
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

    if "GUIA DE REMISION" in t or "GUIA REMISION" in t:
        return "GUIA_REMISION"

    if "NOTA DE INGRESO" in t or "NOTA INGRESO" in t or re.search(r"\bNOTA[_\-\s]?I\b", f):
        return "NOTA_INGRESO"

    if (
        "DETRACCION" in t
        or "CONSTANCIA DE DEPOSITO" in t
        or "SISTEMA DE DETRACCIONES" in t
    ):
        return "PAGO_DETRACCION"

    if (
        "TRANSFERENCIAS" in t
        or "TRANSFERENCIA" in t
        or "NUMERO DE OPERACION" in t
        or "NRO DE OPERACION" in t
        or "N° DE OPERACION" in t
        or re.search(r"\bPAGO[_\-\s]?\d+", f)
    ):
        return "PAGO_TRANSFERENCIA"

    if (
        "ORDEN DE COMPRA" in t
        or "ORDEN COMPRA" in t
        or re.search(r"\bOC[_\-\s]?\d+", f)
    ):
        return "OC"

    if (
        "ORDEN DE SERVICIO" in t
        or "ORDEN SERVICIO" in t
        or re.search(r"\bOS[_\-\s]?\d+", f)
    ):
        return "OS"

    if "FACTURA ELECTRONICA" in t or re.search(r"\bFACTURA\b", t):
        return "FACTURA"

    return "OTRO"
