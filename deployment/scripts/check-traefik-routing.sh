#!/usr/bin/env bash
set -euo pipefail

echo "== Traefik Routing Check =="

echo ""
echo "[web bbtecnologia.com]"
curl -k -I -H "Host: bbtecnologia.com" https://127.0.0.1 | head -20

echo ""
echo "[api api.bbtecnologia.com health]"
curl -k -H "Host: api.bbtecnologia.com" https://127.0.0.1/api/v1/health

echo ""
echo ""
echo "Traefik routing OK"