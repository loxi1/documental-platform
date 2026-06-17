from pathlib import Path
import fitz

from app.extractors.ocr_fallback import (
    OCR_FALLBACK_MIN_TEXT_LENGTH,
    get_or_create_searchable_pdf,
)


def extract_text_from_txt(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def extract_text_from_pdf(path: Path) -> str:
    doc = fitz.open(path)
    parts: list[str] = []

    for page in doc:
        text = page.get_text("text")
        if text:
            parts.append(text)

    doc.close()

    return "\n".join(parts).strip()


def is_text_too_short(text: str, min_length: int = OCR_FALLBACK_MIN_TEXT_LENGTH) -> bool:
    return len((text or "").strip()) < min_length


def extract_text_from_scanned_pdf(path: Path) -> str:
    searchable_pdf = get_or_create_searchable_pdf(path)

    if not searchable_pdf:
        return ""

    return extract_text_from_pdf(searchable_pdf)


def extract_text(path: Path) -> str:
    ext = path.suffix.lower()

    if ext == ".txt":
        return extract_text_from_txt(path)

    if ext == ".pdf":
        text = extract_text_from_pdf(path)

        if not is_text_too_short(text):
            return text

        text_ocr = extract_text_from_scanned_pdf(path)

        return text_ocr or text

    raise ValueError(f"Extensión no soportada todavía: {ext}")
