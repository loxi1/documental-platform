"""
Prueba manual R2 para Documental Platform.

Objetivo:
1) Subir un PDF real a Cloudflare R2.
2) Imprimir un SQL mínimo para registrar documento + archivo y obtener archivoId.
3) Imprimir los comandos curl para disparar OCR desde el API Gateway.

Uso recomendado desde workers/ocr-worker:

python -m app.test_r2_upload \
  --file /ruta/OC_007950.pdf \
  --cliente BBTI \
  --tipo OC \
  --key documentos/2026/04/BBTI/OC_007950.pdf

Variables requeridas en .env del worker:
R2_ENDPOINT_URL=
R2_BUCKET=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_REGION=auto
"""

from __future__ import annotations

import argparse
import hashlib
import mimetypes
from pathlib import Path

from app.config import settings
from app.r2_storage import get_r2_client


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_default_key(file_path: Path, cliente: str, tipo: str) -> str:
    cliente_key = cliente.strip().upper()
    tipo_key = tipo.strip().upper()
    return f"documentos/manual/{cliente_key}/{tipo_key}/{file_path.name}"


def sql_literal(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def main() -> None:
    parser = argparse.ArgumentParser(description="Sube un archivo a R2 y genera pasos para OCR Gateway")
    parser.add_argument("--file", required=True, help="Ruta local del PDF a subir")
    parser.add_argument("--cliente", default="BBTI", help="cliente_abreviatura para documentos.documentos")
    parser.add_argument("--tipo", default="OC", help="tipo_documental inicial/sugerido")
    parser.add_argument("--key", help="storage_key destino en R2")
    parser.add_argument("--gateway-url", default="http://localhost:3000/api/v1", help="URL base del API Gateway")
    parser.add_argument("--ms-url", default="http://localhost:3002/api/v1", help="URL base directa de ms-documentos")
    args = parser.parse_args()

    local_file = Path(args.file).expanduser().resolve()
    if not local_file.exists() or not local_file.is_file():
        raise FileNotFoundError(f"No existe archivo local: {local_file}")

    if not settings.r2_bucket:
        raise RuntimeError("R2_BUCKET no está configurado")

    r2_key = args.key or build_default_key(local_file, args.cliente, args.tipo)
    content_type = mimetypes.guess_type(local_file.name)[0] or "application/octet-stream"
    file_hash = sha256_file(local_file)

    client = get_r2_client()
    client.upload_file(
        str(local_file),
        settings.r2_bucket,
        r2_key,
        ExtraArgs={"ContentType": content_type},
    )

    print("\n✅ Archivo subido a R2")
    print({
        "bucket": settings.r2_bucket,
        "key": r2_key,
        "nombre_archivo": local_file.name,
        "content_type": content_type,
        "sha256": file_hash,
    })

    cliente = args.cliente.strip().upper()
    tipo = args.tipo.strip().upper()

    print("\n-- SQL mínimo para crear documento contenedor + archivo y obtener archivoId")
    print("-- Ejecutar en PostgreSQL. No usa tipo_expediente, correlativo ni clave_principal.")
    print(f"""
WITH doc AS (
  INSERT INTO documentos.documentos (
    cliente_abreviatura,
    tipo_documental,
    estado,
    metadata
  ) VALUES (
    {sql_literal(cliente)},
    {sql_literal(tipo)},
    'pendiente_ocr',
    jsonb_build_object('origen', 'test_r2_upload', 'storageProvider', 'r2')
  )
  RETURNING id
), archivo AS (
  INSERT INTO documentos.documentos_archivos (
    documento_id,
    nombre_archivo,
    ruta_archivo,
    hash_sha256,
    tipo_version,
    area_origen,
    estado,
    origen_archivo,
    storage_provider,
    storage_bucket,
    storage_key,
    metadata
  )
  SELECT
    doc.id,
    {sql_literal(local_file.name)},
    {sql_literal(r2_key)},
    {sql_literal(file_hash)},
    'original',
    'COMPRAS',
    'subido',
    'R2_MANUAL_TEST',
    'r2',
    {sql_literal(settings.r2_bucket)},
    {sql_literal(r2_key)},
    jsonb_build_object('contentType', {sql_literal(content_type)})
  FROM doc
  RETURNING id AS archivo_id, documento_id, storage_provider, storage_key
)
SELECT * FROM archivo;
""".strip())

    print("\n-- Prueba directa contra ms-documentos sin token Gateway")
    print(f"""
curl -X POST '{args.ms_url}/documentos/archivos/<ARCHIVO_ID>/procesar-ocr' \\
  -H 'Content-Type: application/json' \\
  -d '{{"tipoEsperado":"{tipo}","areaOrigen":"COMPRAS","canalIngreso":"R2_MANUAL_TEST","reprocesar":true}}'
""".strip())

    print("\n-- Prueba oficial vía API Gateway con token")
    print(f"""
curl -X POST '{args.gateway_url}/documentos/archivos/<ARCHIVO_ID>/procesar-ocr' \\
  -H 'Authorization: Bearer <TOKEN>' \\
  -H 'Content-Type: application/json' \\
  -d '{{"tipoEsperado":"{tipo}","areaOrigen":"COMPRAS","canalIngreso":"R2_MANUAL_TEST","reprocesar":true}}'
""".strip())


if __name__ == "__main__":
    main()
