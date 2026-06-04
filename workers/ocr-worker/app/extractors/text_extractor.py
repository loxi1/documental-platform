from pathlib import Path
import fitz


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


def extract_text(path: Path) -> str:
    ext = path.suffix.lower()

    if ext == ".txt":
        return extract_text_from_txt(path)

    if ext == ".pdf":
        return extract_text_from_pdf(path)

    raise ValueError(f"Extensión no soportada todavía: {ext}")
