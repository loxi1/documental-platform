import re
from typing import Any

from app.core.dates import normalize_date
from app.core.clientes_destino import detect_cliente_destino


def normalizar_texto(texto: str) -> str:
    texto = str(texto or "").upper()
    texto = (
        texto.replace("Á", "A")
        .replace("É", "E")
        .replace("Í", "I")
        .replace("Ó", "O")
        .replace("Ú", "U")
    )
    texto = re.sub(r"[ \t]+", " ", texto)
    texto = re.sub(r"\n+", "\n", texto)
    return texto.strip()


def extraer_nota_ingreso(texto: str) -> str | None:
    texto_u = normalizar_texto(texto)

    match = re.search(r"\bGC\s+\d+\s*\n(\d{10})\b", texto_u)
    if match:
        return match.group(1)

    match = re.search(r"\n(\d{10})\s*\nCL COMPRAS", texto_u)
    if match:
        return match.group(1)

    match = re.search(
        r"NRO\.?\s*DOC\.?\s*REF\.?.{0,160}?\b(\d{10})\b",
        texto_u,
        re.DOTALL,
    )
    if match:
        return match.group(1)

    return None


def extraer_orden_compra(texto: str) -> str | None:
    texto_u = normalizar_texto(texto)
    lines = [line.strip() for line in texto_u.splitlines() if line.strip()]

    for idx, line in enumerate(lines):
        if re.fullmatch(r"\d{2}/\d{2}/\d{4}", line):
            window = lines[idx + 1: idx + 8]

            for item in window:
                # Evitar RUC proveedor: 10/20 + 9 dígitos y normalmente con nombre.
                if re.match(r"^(10|20)\d{9}\b", item):
                    continue

                if re.fullmatch(r"\d{10,13}", item):
                    return item

    match = re.search(
        r"ORD\.?\s*COMPRA.*?\n.*?\n(\d{10,13})",
        texto_u,
        re.DOTALL,
    )
    if match:
        value = match.group(1)
        if not re.match(r"^(10|20)\d{9}$", value):
            return value

    return None


def extraer_fecha_doc(texto: str) -> str | None:
    texto_u = normalizar_texto(texto)

    match = re.search(
        r"ALMACEN PRINCIPAL\s*\n(\d{2}/\d{2}/\d{4})",
        texto_u,
    )
    if match:
        return normalize_date(match.group(1))

    match = re.search(
        r"FECHA DOC.*?ALMACEN PRINCIPAL\s*\n(\d{2}/\d{2}/\d{4})",
        texto_u,
        re.DOTALL,
    )
    if match:
        return normalize_date(match.group(1))

    match = re.search(r"\b(\d{2}/\d{2}/\d{4})\b", texto_u)
    if match:
        return normalize_date(match.group(1))

    return None

def extraer_proveedor(texto: str) -> dict[str, str | None]:
    texto_u = normalizar_texto(texto)
    lines = [line.strip() for line in texto_u.splitlines() if line.strip()]

    for idx, line in enumerate(lines):
        match = re.match(r"^(10\d{9}|20\d{9})\s+(.+)$", line)

        if match:
            return {
                "proveedorRuc": match.group(1),
                "proveedorNombre": match.group(2).strip(),
            }

        if re.fullmatch(r"10\d{9}|20\d{9}", line):
            next_line = lines[idx + 1].strip() if idx + 1 < len(lines) else None

            if next_line and not re.fullmatch(r"\d{10,13}", next_line):
                return {
                    "proveedorRuc": line,
                    "proveedorNombre": next_line,
                }

    return {
        "proveedorRuc": None,
        "proveedorNombre": None,
    }


def extract_nota_ingreso_metadata(text: str) -> dict[str, Any]:
    cliente = detect_cliente_destino(text) or {}
    proveedor = extraer_proveedor(text)

    return {
        "clienteAbreviatura": cliente.get("clienteAbreviatura"),
        "clienteRuc": cliente.get("clienteRuc"),
        "empresaNombre": cliente.get("empresaNombre"),
        "numero": extraer_nota_ingreso(text),
        "fechaEmision": extraer_fecha_doc(text),
        "ordenCompra": extraer_orden_compra(text),
        "proveedorRuc": proveedor.get("proveedorRuc"),
        "proveedorNombre": proveedor.get("proveedorNombre"),
    }
