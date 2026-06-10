from pathlib import Path
from app.extractors.text_extractor import extract_text

path = Path("storage/inbox/factura_escaneada_1.pdf")
text = extract_text(path)

print("LENGTH:", len(text))
print(text[:500])