from app.extractors.orden_extractor import extract_codigo_expediente


SAMPLES = [
    "CENTRO DE COSTOS: 050101 - CEMENTOS PACASMAYO - PACASMAYO",
    "CENTRO DE COSTOS: 030101 - UNACEM LIMA",
    "CENTRO COSTO\\n050202 - OBRA DEMO",
]


for sample in SAMPLES:
    print(sample)
    print(extract_codigo_expediente(sample))
