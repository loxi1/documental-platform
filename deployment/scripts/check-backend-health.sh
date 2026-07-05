#!/usr/bin/env bash
set -euo pipefail

echo "== Backend Health Check =="

echo ""
echo "[api-gateway]"
docker exec dp_api_gateway wget -qO- http://localhost:3000/api/v1/health
echo ""

echo ""
echo "[ms-auth]"
docker exec dp_ms_auth wget -qO- http://localhost:3001/api/v1/health
echo ""

echo ""
echo "[ms-documentos]"
docker exec dp_ms_documentos wget -qO- http://localhost:3002/api/v1/health
echo ""

echo ""
echo "Backend health OK"