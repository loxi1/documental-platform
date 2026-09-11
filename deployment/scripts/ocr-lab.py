"""Explicit LAB-only launcher. No secrets written to disk or printed."""
import argparse
import json
import os
from pathlib import Path
import subprocess


def inspect_env(name):
    result = subprocess.run(["docker", "inspect", name], capture_output=True, text=True, check=True)
    container = json.loads(result.stdout)[0]
    if not container["State"]["Running"]:
        raise RuntimeError("El componente LAB requerido no está activo")
    return dict(entry.split("=", 1) for entry in container["Config"]["Env"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start", action="store_true", help="Build/start only the new LAB worker; default is validation only")
    args = parser.parse_args()
    try:
        # Never consult any Cloudflare or production configuration.
        minio = inspect_env("dp_minio_documental_lab")
        access = minio.get("MINIO_ROOT_USER")
        secret = minio.get("MINIO_ROOT_PASSWORD")
        if not access or not secret:
            raise RuntimeError("Credenciales MinIO LAB no disponibles en el contenedor; no se aplican fallbacks")
        node = inspect_env("dp_ms_documentos_carga_segura_test")
        if node.get("OCR_REQUEST_SUBJECT") != "lab.ocr.procesar-archivo":
            raise RuntimeError("ms-documentos LAB todavía no tiene OCR_REQUEST_SUBJECT=lab.ocr.procesar-archivo")
        env = {**os.environ, "OCR_LAB_MINIO_ACCESS_KEY_ID": access, "OCR_LAB_MINIO_SECRET_ACCESS_KEY": secret}
        compose = Path(__file__).resolve().parents[1] / "docker/docker-compose.ocr-lab.yml"
        command = ["docker", "compose", "--env-file", "/dev/null", "-f", str(compose)]
        subprocess.run(command + ["config", "--quiet"], env=env, check=True, capture_output=True)
        if args.start:
            subprocess.run(command + ["up", "-d", "--build", "--no-deps", "ocr-worker-lab"], env=env, check=True, capture_output=True)
        print("OCR LAB: iniciado" if args.start else "OCR LAB: configuración validada; ningún proceso iniciado")
    except RuntimeError as error:
        raise SystemExit(str(error)) from None
    except (subprocess.SubprocessError, ValueError, KeyError, OSError):
        # Docker/Compose errors must not expose the interpolated environment.
        raise SystemExit("No se pudo preparar OCR LAB; no se muestran configuración ni credenciales") from None


if __name__ == "__main__":
    main()
