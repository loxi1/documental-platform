#!/usr/bin/env bash
set -euo pipefail
sudo systemctl status documental-ocr-worker --no-pager || true
sudo journalctl -u documental-ocr-worker -n 100 --no-pager
