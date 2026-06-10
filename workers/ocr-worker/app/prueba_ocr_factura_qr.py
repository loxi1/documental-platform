from pathlib import Path
from app.extractors.qr_extractor import extract_qr_data

path = Path("storage/inbox/factura_escaneada_1.pdf")
print(extract_qr_data(path))