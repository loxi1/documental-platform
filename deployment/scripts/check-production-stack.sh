#!/usr/bin/env bash
set -euo pipefail

echo "======================================"
echo " Documental Platform Production Check "
echo "======================================"

echo ""
echo "== Containers =="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "dp_traefik|dp_nats|dp_api_gateway|dp_ms_auth|dp_ms_documentos|dp_web_admin" || true

echo ""
./deployment/scripts/check-backend-health.sh

echo ""
./deployment/scripts/check-swagger-closed.sh

echo ""
./deployment/scripts/check-nats.sh

echo ""
./deployment/scripts/check-traefik-routing.sh

echo ""
echo "======================================"
echo " Production stack validation OK "
echo "======================================"