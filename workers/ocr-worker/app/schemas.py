from pydantic import BaseModel, Field
from typing import Literal, Optional


class OcrProcesarArchivoPayload(BaseModel):
    documentoId: Optional[int] = None
    archivoId: Optional[int] = None
    storageProvider: Literal["local", "r2", "s3"] = "local"
    storageKey: str = Field(..., min_length=1)
    tipoSolicitud: Literal["clasificar", "extraer", "clasificar_extraer"] = "clasificar_extraer"
    requestId: Optional[str] = None

    clienteAbreviatura: str = Field(..., min_length=1)

    areaOrigen: str | None = None
    tipoEsperado: str | None = None
    expedienteId: int | None = None
    documentoBaseId: int | None = None
    tipoRelacionSugerida: str | None = None
    canalIngreso: str | None = None
