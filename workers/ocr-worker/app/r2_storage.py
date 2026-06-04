from pathlib import Path
import boto3

from app.config import settings


def get_r2_client():
    if not settings.r2_endpoint_url:
        raise RuntimeError("R2_ENDPOINT_URL no está configurado")

    return boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint_url,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name=settings.r2_region,
    )


def download_from_r2(storage_key: str) -> Path:
    if not settings.r2_bucket:
        raise RuntimeError("R2_BUCKET no está configurado")

    tmp_dir = Path(settings.ocr_tmp_dir)
    tmp_dir.mkdir(parents=True, exist_ok=True)

    filename = Path(storage_key).name
    local_path = tmp_dir / filename

    client = get_r2_client()
    client.download_file(
        settings.r2_bucket,
        storage_key,
        str(local_path),
    )

    return local_path
