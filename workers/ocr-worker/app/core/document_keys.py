from typing import Any


DOCUMENT_TYPES_SERIE_NUMERO = {
    "FACTURA",
    "GUIA_REMISION",
    "NOTA_CREDITO",
    "RECIBO_HONORARIO",
}

DOCUMENT_TYPES_NUMERO = {
    "OC",
    "OS",
    "NOTA_INGRESO",
}

DOCUMENT_TYPES_OPERACION = {
    "PAGO_TRANSFERENCIA",
    "PAGO_DETRACCION",
}


def clean_key_part(value: Any) -> str | None:
    if value is None:
        return None

    text = str(value).strip()
    return text if text else None


def normalize_cliente(cliente: str) -> str:
    value = str(cliente or "").strip().upper()

    if not value:
        raise ValueError("clienteAbreviatura es obligatorio para construir clave documental")

    return value


def build_document_key(
    cliente: str,
    tipo_documental: str,
    metadata: dict[str, Any],
) -> str | None:
    cliente_key = normalize_cliente(cliente)
    tipo_key = clean_key_part(tipo_documental)

    if not tipo_key:
        return None

    tipo_key = tipo_key.upper()

    ruc = clean_key_part(metadata.get("ruc"))
    serie = clean_key_part(metadata.get("serie"))
    numero = clean_key_part(metadata.get("numero"))
    numero_operacion = clean_key_part(
        metadata.get("numeroOperacion")
        or metadata.get("numero_operacion")
        or metadata.get("operacion")
    )

    if tipo_key in DOCUMENT_TYPES_SERIE_NUMERO:
        if ruc and serie and numero:
            return f"{cliente_key}|{tipo_key}|{ruc}|{serie}|{numero}"

    if tipo_key in DOCUMENT_TYPES_NUMERO:
        if numero:
            return f"{cliente_key}|{tipo_key}|{numero}"

    if tipo_key in DOCUMENT_TYPES_OPERACION:
        if numero_operacion:
            return f"{cliente_key}|{tipo_key}|{numero_operacion}"

    return None
