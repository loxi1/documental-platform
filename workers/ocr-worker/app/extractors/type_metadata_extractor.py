from typing import Any

from app.core.document_types import normalize_document_type
from app.extractors.metadata_extractor import (
    extract_ruc,
    extract_fecha,
    extract_monto,
    extract_serie_numero,
    extract_numero_operacion,
    extract_banco,
)
from app.extractors.nota_ingreso_extractor import extract_nota_ingreso_metadata
from app.extractors.orden_extractor import extract_orden_metadata


def extract_metadata_by_type(
    tipo_documental: str,
    text: str,
    enriched: dict[str, Any] | None = None,
    filename: str | None = None,
) -> dict[str, Any]:
    enriched = enriched or {}
    tipo = normalize_document_type(tipo_documental)

    serie_numero = extract_serie_numero(text)

    common_serie = enriched.get("serie") or serie_numero.get("serie")
    common_numero = enriched.get("numero") or serie_numero.get("numero")
    common_fecha = extract_fecha(text)
    common_monto = extract_monto(text)
    common_ruc = enriched.get("ruc") or extract_ruc(text)

    if tipo in ["FACTURA", "GUIA_REMISION", "NOTA_CREDITO", "RECIBO_HONORARIO"]:
        data = {
            "ruc": common_ruc,
            "serie": common_serie,
            "numero": common_numero,
            "fechaEmision": common_fecha,
        }

        if tipo in ["FACTURA", "RECIBO_HONORARIO", "NOTA_CREDITO"]:
            data["montoTotal"] = common_monto

        return data

    if tipo in ["OC", "OS"]:
        return extract_orden_metadata(
            text=text,
            tipo_documental=tipo,
            filename=filename,
            enriched=enriched,
        )

    if tipo == "NOTA_INGRESO":
        return extract_nota_ingreso_metadata(text)

    if tipo in ["PAGO_TRANSFERENCIA", "PAGO_DETRACCION"]:
        return {
            "numeroOperacion": extract_numero_operacion(text),
            "fechaPago": common_fecha,
            "montoTotal": common_monto,
            "banco": extract_banco(text),
        }

    return {
        "ruc": common_ruc,
        "serie": common_serie,
        "numero": common_numero,
        "fechaEmision": common_fecha,
        "montoTotal": common_monto,
    }
