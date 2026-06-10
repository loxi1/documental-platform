from pathlib import Path
from app.extractors.text_extractor import extract_text

path = Path("storage/inbox/factura_scaneada_8.pdf")

print("EXISTS:", path.exists())
print("PATH:", path)

text = extract_text(path)

print("LENGTH:", len(text))
print(text[:500])
