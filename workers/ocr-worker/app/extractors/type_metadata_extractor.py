from typing import Any

from app.core.document_types import normalize_document_type
from app.extractors.metadata_extractor import (
    extract_ruc,
    extract_fecha,
    extract_monto,
    extract_serie_numero,
)
from app.extractors.nota_ingreso_extractor import extract_nota_ingreso_metadata
from app.extractors.orden_extractor import extract_orden_metadata
from app.extractors.recibo_honorario_extractor import extract_recibo_honorario_metadata
from app.extractors.pago_extractor import extract_pago_metadata


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

    if tipo in ["FACTURA", "GUIA_REMISION", "NOTA_CREDITO"]:
        data = {
            "ruc": common_ruc,
            "serie": common_serie,
            "numero": common_numero,
            "fechaEmision": common_fecha,
        }

        if tipo in ["FACTURA", "NOTA_CREDITO"]:
            data["montoTotal"] = common_monto

        return data

    if tipo == "RECIBO_HONORARIO":
        return extract_recibo_honorario_metadata(text=text, filename=filename)

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
        return extract_pago_metadata(
            text=text,
            tipo_documental=tipo,
            filename=filename,
        )

    return {
        "ruc": common_ruc,
        "serie": common_serie,
        "numero": common_numero,
        "fechaEmision": common_fecha,
        "montoTotal": common_monto,
    }
