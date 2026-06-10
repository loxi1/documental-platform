from pathlib import Path
import subprocess
import tempfile
import re
from typing import Any
from app.core.dates import normalize_date

import cv2
from pyzbar.pyzbar import decode


def parse_sunat_qr(raw: str) -> dict[str, Any] | None:
    """
    Formatos comunes SUNAT QR:
    RUC|TIPO|SERIE|NUMERO|IGV|TOTAL|FECHA|...
    """
    if not raw:
        return None

    text = raw.strip()
    parts = text.split("|")

    if len(parts) < 6:
        return None

    ruc = parts[0].strip()
    tipo_comprobante = parts[1].strip() if len(parts) > 1 else None
    serie = parts[2].strip() if len(parts) > 2 else None
    numero = parts[3].strip() if len(parts) > 3 else None

    total = None
    fecha = None

    # SUNAT suele traer IGV en parts[4], total en parts[5], fecha en parts[6]
    if len(parts) > 5:
        try:
            total = float(parts[5])
        except Exception:
            total = None

    if len(parts) > 6:
        fecha_raw = parts[6].strip()
        fecha = normalize_date(fecha_raw)

    if not re.match(r"^(10|20)\d{9}$", ruc):
        return None

    return {
        "raw": raw,
        "ruc": ruc,
        "tipoComprobanteCodigo": tipo_comprobante,
        "serie": serie,
        "numero": numero,
        "fechaEmision": fecha,
        "montoTotal": total,
    }


def decode_qr_from_image(image_path: Path) -> list[str]:
    img = cv2.imread(str(image_path))

    if img is None:
        return []

    results = decode(img)
    return [r.data.decode("utf-8", errors="ignore") for r in results]


def render_pdf_first_page_to_png(pdf_path: Path) -> Path:
    tmp_dir = Path(tempfile.mkdtemp(prefix="ocr_qr_"))
    output_prefix = tmp_dir / "page"

    subprocess.run(
        [
            "pdftoppm",
            "-png",
            "-f",
            "1",
            "-singlefile",
            str(pdf_path),
            str(output_prefix),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    return tmp_dir / "page.png"


def extract_qr_data(path: Path) -> dict[str, Any] | None:
    ext = path.suffix.lower()

    qr_values: list[str] = []

    if ext == ".pdf":
        try:
            png_path = render_pdf_first_page_to_png(path)
            qr_values = decode_qr_from_image(png_path)
        except Exception:
            qr_values = []

    elif ext in [".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff"]:
        qr_values = decode_qr_from_image(path)

    for raw in qr_values:
        parsed = parse_sunat_qr(raw)
        if parsed:
            return parsed

    return None
