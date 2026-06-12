from typing import Any


DOCUMENT_TYPES = {
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
}


REQUIRED_METADATA_BY_TYPE = {
    "FACTURA": ["ruc", "serie", "numero", "fechaEmision", "montoTotal"],
    "GUIA_REMISION": ["ruc", "serie", "numero", "fechaEmision"],
    "OC": ["numero"],
    "OS": ["numero"],
    "NOTA_INGRESO": ["numero"],
    "PAGO_TRANSFERENCIA": ["numeroOperacion"],
    "PAGO_DETRACCION": ["numeroOperacion"],
    "RECIBO_HONORARIO": ["ruc", "serie", "numero", "fechaEmision", "montoTotal"],
    "NOTA_CREDITO": ["ruc", "serie", "numero", "fechaEmision"],
    "OTRO": [],
}


def normalize_document_type(tipo: str | None) -> str:
    if not tipo:
        return "OTRO"

    value = str(tipo).strip().upper()

    aliases = {
        "ORDEN_COMPRA": "OC",
        "ORDEN DE COMPRA": "OC",
        "ORDEN_SERVICIO": "OS",
        "ORDEN DE SERVICIO": "OS",
        "GUIA": "GUIA_REMISION",
        "GUÍA": "GUIA_REMISION",
        "GUIA DE REMISION": "GUIA_REMISION",
        "GUÍA DE REMISIÓN": "GUIA_REMISION",
        "BOLETA": "OTRO",
        "TRANSFERENCIA": "PAGO_TRANSFERENCIA",
        "DETRACCION": "PAGO_DETRACCION",
        "DETRACCIÓN": "PAGO_DETRACCION",
        "RH": "RECIBO_HONORARIO",
        "RECIBO POR HONORARIO": "RECIBO_HONORARIO",
        "RECIBO POR HONORARIOS": "RECIBO_HONORARIO",
        "NC": "NOTA_CREDITO",
        "NOTA DE CREDITO": "NOTA_CREDITO",
        "NOTA DE CRÉDITO": "NOTA_CREDITO",
    }

    value = aliases.get(value, value)

    return value if value in DOCUMENT_TYPES else "OTRO"


def get_required_metadata(tipo_documental: str | None) -> list[str]:
    tipo = normalize_document_type(tipo_documental)
    return REQUIRED_METADATA_BY_TYPE.get(tipo, [])


def get_missing_metadata(tipo_documental: str | None, metadata: dict[str, Any]) -> list[str]:
    required = get_required_metadata(tipo_documental)

    return [
        field
        for field in required
        if metadata.get(field) in [None, ""]
    ]


def calculate_confidence(tipo_documental: str | None, metadata: dict[str, Any]) -> float:
    required = get_required_metadata(tipo_documental)

    if not required:
        return 0.0

    detected = [
        field
        for field in required
        if metadata.get(field) not in [None, ""]
    ]

    return round(len(detected) / len(required), 2)


def should_require_review(
    tipo_documental: str | None,
    metadata: dict[str, Any],
    text: str = "",
    qr_data: dict | None = None,
) -> bool:
    tipo = normalize_document_type(tipo_documental)

    if get_missing_metadata(tipo, metadata):
        return True

    if len((text or "").strip()) < 80 and not qr_data and tipo == "OTRO":
        return True

    return False
