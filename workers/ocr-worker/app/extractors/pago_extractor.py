from typing import Any

from app.extractors.metadata_extractor import (
    extract_fecha,
    extract_monto,
    extract_numero_operacion,
    extract_banco,
)
from app.extractors.filename_metadata_extractor import extract_pago_from_filename


def extract_pago_metadata(
    text: str,
    tipo_documental: str,
    filename: str | None = None,
) -> dict[str, Any]:
    from_file = extract_pago_from_filename(filename, tipo_documental)

    return {
        "numeroOperacion": extract_numero_operacion(text) or from_file.get("numeroOperacion"),
        "fechaPago": extract_fecha(text),
        "montoTotal": extract_monto(text),
        "banco": extract_banco(text) or from_file.get("banco"),
        "clienteAbreviatura": from_file.get("clienteAbreviatura"),
    }
