import re
import unicodedata
from typing import Any


CLIENTES_DESTINO = [
    {
        "nombre_oficial": "BB TECNOLOGIA INDUSTRIAL S.A.C.",
        "abreviatura": "BBTEC",
        "ruc": "20299922821",
        "aliases": [
            "BB TECNOLOGIA",
            "BB TECNOLOGIA INDUSTRIAL",
            "BB TECNOLOGIA INDUSTRIAL SAC",
        ],
    },
    {
        "nombre_oficial": "CONSORCIO CIMA ENERGY",
        "abreviatura": "CIMA",
        "ruc": "20613521004",
        "aliases": [
            "CONSORCIO CIMA ENERGY",
            "CIMA ENERGY",
        ],
    },
    {
        "nombre_oficial": "CONSORCIO ILUMINACION TARMA 2025",
        "abreviatura": "TARMA",
        "ruc": "20614307197",
        "aliases": [
            "CONSORCIO ILUMINACION TARMA 2025",
            "ILUMINACION TARMA",
            "TARMA 2025",
        ],
    },
    {
        "nombre_oficial": "CONSORCIO HUANCAVELICA",
        "abreviatura": "HUANCA",
        "ruc": "20612122416",
        "aliases": [
            "CONSORCIO HUANCAVELICA",
            "HUANCAVELICA",
        ],
    },
    {
        "nombre_oficial": "Consorcio Kimbiri",
        "abreviatura": "KIMBIRI",
        "ruc": "20609856140",
        "aliases": [
            "CONSORCIO KIMBIRI",
            "KIMBIRI",
        ],
    },
    {
        "nombre_oficial": "BBTI S.A.C.",
        "abreviatura": "BBTI",
        "ruc": "20565747356",
        "aliases": [
            "BBTI S.A.C.",
            "BBTI SAC",
            "BBTI",
        ],
    },
]


def normalize_text(value: Any) -> str:
    text = str(value or "").upper()
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = re.sub(r"[^A-Z0-9]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def detect_cliente_destino(text: str) -> dict[str, str] | None:
    normalized = normalize_text(text)

    for cliente in CLIENTES_DESTINO:
        candidates = [cliente["nombre_oficial"], *cliente.get("aliases", [])]

        for candidate in candidates:
            if normalize_text(candidate) in normalized:
                return {
                    "empresaNombre": cliente["nombre_oficial"],
                    "clienteAbreviatura": cliente["abreviatura"],
                    "clienteRuc": cliente["ruc"],
                }

    return None
