#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OCR_DIR="$ROOT_DIR/workers/ocr-worker"

sudo apt-get update
sudo apt-get install -y python3-venv python3-pip tesseract-ocr tesseract-ocr-spa poppler-utils ghostscript zbar-tools libzbar0 imagemagick fonts-dejavu

cd "$OCR_DIR"
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

sudo cp "$ROOT_DIR/deployment/systemd/documental-ocr-worker.service" /etc/systemd/system/documental-ocr-worker.service
sudo systemctl daemon-reload
sudo systemctl enable documental-ocr-worker

echo "Listo. Iniciar con:"
echo "sudo systemctl start documental-ocr-worker"
