from pathlib import Path
from app.extractors.qr_extractor import extract_qr_data

result = extract_qr_data(
    Path("storage/tmp/factura_comatpe.PDF")
)

print(result)