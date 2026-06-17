from __future__ import annotations

import hashlib
import os
import shutil
import subprocess
from pathlib import Path


def _bool_env(name: str, default: bool = True) -> bool:
    value = os.getenv(name)

    if value is None:
        return default

    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


OCR_FALLBACK_ENABLED = _bool_env("OCR_FALLBACK_ENABLED", True)
OCR_FALLBACK_LANG = os.getenv("OCR_FALLBACK_LANG", "spa")
OCR_FALLBACK_MIN_TEXT_LENGTH = int(os.getenv("OCR_FALLBACK_MIN_TEXT_LENGTH", "80"))
OCR_FALLBACK_OUTPUT_DIR = Path(os.getenv("OCR_FALLBACK_OUTPUT_DIR", "storage/tmp/ocr"))


def is_ocrmypdf_available() -> bool:
    return shutil.which("ocrmypdf") is not None


def build_ocr_output_path(input_pdf: Path) -> Path:
    raw = f"{input_pdf.resolve()}:{input_pdf.stat().st_mtime_ns}:{input_pdf.stat().st_size}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]

    OCR_FALLBACK_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    return OCR_FALLBACK_OUTPUT_DIR / f"{input_pdf.stem}.{digest}.ocr.pdf"


def run_ocrmypdf(input_pdf: Path, output_pdf: Path) -> bool:
    if not OCR_FALLBACK_ENABLED:
        return False

    if not is_ocrmypdf_available():
        return False

    output_pdf.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        "ocrmypdf",
        "-l",
        OCR_FALLBACK_LANG,
        "--skip-text",
        "--rotate-pages",
        "--deskew",
        "--optimize",
        "0",
        "--quiet",
        str(input_pdf),
        str(output_pdf),
    ]

    try:
        completed = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=int(os.getenv("OCR_FALLBACK_TIMEOUT_SECONDS", "180")),
            check=False,
        )
    except Exception:
        return False

    return completed.returncode == 0 and output_pdf.exists() and output_pdf.stat().st_size > 0


def get_or_create_searchable_pdf(input_pdf: Path) -> Path | None:
    output_pdf = build_ocr_output_path(input_pdf)

    if output_pdf.exists() and output_pdf.stat().st_size > 0:
        return output_pdf

    if run_ocrmypdf(input_pdf, output_pdf):
        return output_pdf

    return None
