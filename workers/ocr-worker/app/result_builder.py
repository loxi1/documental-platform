from typing import Any


def build_ocr_result(params: dict[str, Any]) -> dict[str, Any]:
    metadata = params.get("metadata", {})

    campos_detectados = [
        key for key, value in metadata.items()
        if value is not None and value != ""
    ]

    campos_faltantes = [
        key for key, value in metadata.items()
        if value is None or value == ""
    ]

    total_campos = len(metadata.keys()) or 1
    confidence = round(len(campos_detectados) / total_campos, 2)

    estado = "clasificado"

    if confidence < 0.5:
        estado = "requiere_revision"

    return {
        "ok": True,
        "documentoId": params.get("documentoId"),
        "archivoId": params.get("archivoId"),
        "tipoDocumental": params.get("tipoDocumental"),
        "confidence": confidence,
        "estado": estado,
        "metadata": metadata,
        "metadataSource": params.get("metadataSource"),
        "camposDetectados": campos_detectados,
        "camposFaltantes": campos_faltantes,
        "archivo": {
            "storageProvider": params.get("storageProvider"),
            "storageKey": params.get("storageKey"),
            "resolvedPath": params.get("resolvedPath"),
            "filename": params.get("filename"),
            "extension": params.get("extension"),
        },
        "texto": {
            "length": params.get("textLength"),
            "preview": params.get("textPreview"),
        },
        "mensaje": params.get("mensaje"),
        "clienteAbreviatura": params.get("clienteAbreviatura"),
        "claveDocumental": params.get("claveDocumental"),
        "qr": params.get("qr"),
    }
