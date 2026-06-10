from pathlib import Path
from app.extractors.qr_extractor import extract_qr_data

path = Path("storage/inbox/factura_scaneada_1.pdf")

print("EXISTS:", path.exists())
print("PATH:", path)

print(extract_qr_data(path))
