#!/usr/bin/env bash
set -euo pipefail
sudo ss -tulpn | grep -E ':80|:443|:4222|:8222|:3000|:3001|:3002' || true
echo "Esperado: 80/443 públicos; 4222/8222 solo localhost; 3000/3001/3002 no públicos."
