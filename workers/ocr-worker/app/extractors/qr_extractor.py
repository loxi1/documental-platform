from pathlib import Path
import subprocess
import tempfile
import re
from typing import Any

import cv2
from pyzbar.pyzbar import decode

from app.core.dates import normalize_date


def parse_sunat_qr(raw: str) -> dict[str, Any] | None:
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

    if len(parts) > 5:
        try:
            total = float(parts[5])
        except Exception:
            total = None

    if len(parts) > 6:
        fecha = normalize_date(parts[6].strip())

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


def decode_qr_from_cv_image(img) -> list[str]:
    results = decode(img)
    return [
        r.data.decode("utf-8", errors="ignore")
        for r in results
    ]


def preprocess_variants(img) -> list:
    variants = []

    variants.append(img)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    variants.append(gray)

    for scale in [1.5, 2, 3]:
        resized = cv2.resize(
            gray,
            None,
            fx=scale,
            fy=scale,
            interpolation=cv2.INTER_CUBIC,
        )
        variants.append(resized)

    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    variants.append(blurred)

    _, thresh = cv2.threshold(
        gray,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU,
    )
    variants.append(thresh)

    adaptive = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        2,
    )
    variants.append(adaptive)

    return variants


def decode_qr_from_image(image_path: Path) -> list[str]:
    img = cv2.imread(str(image_path))

    if img is None:
        return []

    values: list[str] = []

    for region in crop_regions(img):
        for variant in preprocess_variants(region):
            try:
                decoded = decode_qr_from_cv_image(variant)
                for item in decoded:
                    if item not in values:
                        values.append(item)
            except Exception:
                continue

    return values


def render_pdf_first_page_to_png(pdf_path: Path, dpi: int = 300) -> Path:
    tmp_dir = Path(tempfile.mkdtemp(prefix="ocr_qr_"))
    output_prefix = tmp_dir / "page"

    subprocess.run(
        [
            "pdftoppm",
            "-r",
            str(dpi),
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
        for dpi in [300, 400, 500]:
            try:
                png_path = render_pdf_first_page_to_png(path, dpi=dpi)
                values = decode_qr_from_image(png_path)

                for value in values:
                    if value not in qr_values:
                        qr_values.append(value)

                if qr_values:
                    break
            except Exception:
                continue

    elif ext in [".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff"]:
        qr_values = decode_qr_from_image(path)

    for raw in qr_values:
        parsed = parse_sunat_qr(raw)
        if parsed:
            return parsed

    return None

def crop_regions(img) -> list:
    h, w = img.shape[:2]

    regions = [img]

    # zona inferior completa
    regions.append(img[int(h * 0.45):h, 0:w])

    # inferior izquierda
    regions.append(img[int(h * 0.45):h, 0:int(w * 0.5)])

    # inferior centro
    regions.append(img[int(h * 0.45):h, int(w * 0.25):int(w * 0.75)])

    # inferior derecha
    regions.append(img[int(h * 0.45):h, int(w * 0.5):w])

    # centro vertical, útil para tickets pegados en A4
    regions.append(img[int(h * 0.20):int(h * 0.95), int(w * 0.10):int(w * 0.90)])

    return regions