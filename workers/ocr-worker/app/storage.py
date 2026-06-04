from pathlib import Path

from app.config import settings


def resolve_local_path(storage_key: str) -> Path:
    path = Path(storage_key)

    if path.is_absolute():
        return path

    base = Path(settings.ocr_inbox_dir)

    candidate = base / storage_key

    if candidate.exists():
        return candidate

    return Path(storage_key)


def file_exists(path: Path) -> bool:
    return path.exists() and path.is_file()
