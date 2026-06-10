def merge_qr_metadata(metadata, qr):
    if not qr:
        return metadata

    result = metadata.copy()

    for field in [
        "ruc",
        "serie",
        "numero",
        "fechaEmision",
        "montoTotal",
    ]:
        if not result.get(field):
            result[field] = qr.get(field)

    return result