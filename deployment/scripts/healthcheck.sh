#!/usr/bin/env bash
set -euo pipefail

echo "== Healthcheck =="

docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "Servicios esperados:"
echo "- dp_traefik"
echo "- dp_nats"
echo "- dp_api_gateway"
echo "- dp_ms_auth"
echo "- dp_ms_documentos"
echo "- dp_ocr_worker"
