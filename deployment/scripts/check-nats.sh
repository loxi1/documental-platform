#!/usr/bin/env bash
set -euo pipefail

echo "== NATS Check =="

echo ""
echo "[container]"
docker ps --filter "name=dp_nats" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "[internal connectivity from api-gateway]"
docker exec dp_api_gateway sh -lc "wget -qO- http://dp_nats:8222/varz | head -40"

echo ""
echo "NATS OK"