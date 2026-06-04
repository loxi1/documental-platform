import re
import unicodedata


def compact_text(text: str) -> str:
    text = text or ""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.upper()
    return re.sub(r"[^A-Z0-9]+", "", text)
