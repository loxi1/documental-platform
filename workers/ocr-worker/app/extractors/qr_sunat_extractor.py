from typing import Any

CRITICAL_FIELDS = [
    "ruc",
    "serie",
    "numero",
    "fechaEmision",
    "montoTotal",
]


def build_initial_metadata_source(metadata: dict[str, Any]) -> dict[str, str | None]:
    return {
        key: "TEXT" if metadata.get(key) not in [None, ""] else None
        for key in CRITICAL_FIELDS
    }


def merge_qr_metadata(
    metadata: dict[str, Any],
    qr: dict[str, Any] | None,
    metadata_source: dict[str, str | None] | None = None,
) -> tuple[dict[str, Any], dict[str, str | None]]:
    result = metadata.copy()
    source = metadata_source.copy() if metadata_source else build_initial_metadata_source(metadata)

    if not qr:
        return result, source

    for field in CRITICAL_FIELDS:
        if not result.get(field) and qr.get(field) not in [None, ""]:
            result[field] = qr.get(field)
            source[field] = "QR"

    return result, source
