from pathlib import Path
from app.r2_storage import get_r2_client
from app.config import settings

local_file = Path("storage/inbox/factura_prueba.txt")
r2_key = "test/factura_prueba.txt"

if not local_file.exists():
    raise FileNotFoundError(f"No existe: {local_file}")

client = get_r2_client()

client.upload_file(
    str(local_file),
    settings.r2_bucket,
    r2_key,
)

print({
    "ok": True,
    "bucket": settings.r2_bucket,
    "key": r2_key,
})
