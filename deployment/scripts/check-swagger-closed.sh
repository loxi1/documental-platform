#!/usr/bin/env bash
set -euo pipefail

echo "== Swagger Closed Check =="

check_404() {
  local name="$1"
  local cmd="$2"

  echo ""
  echo "[$name]"
  set +e
  output=$(eval "$cmd" 2>&1)
  status=$?
  set -e

  echo "$output" | head -20

  if echo "$output" | grep -q "404 Not Found"; then
    echo "$name OK: /docs cerrado"
  else
    echo "$name ERROR: /docs no devuelve 404"
    exit 1
  fi
}

check_404 "api-gateway" "docker exec dp_api_gateway wget -S -O- http://localhost:3000/docs"
check_404 "ms-auth" "docker exec dp_ms_auth wget -S -O- http://localhost:3001/docs"
check_404 "ms-documentos" "docker exec dp_ms_documentos wget -S -O- http://localhost:3002/docs"

echo ""
echo "[traefik api.bbtecnologia.com/docs]"
set +e
traefik_output=$(curl -k -I -H 'Host: api.bbtecnologia.com' https://127.0.0.1/docs 2>&1)
set -e

echo "$traefik_output"

if echo "$traefik_output" | grep -q "HTTP/2 404"; then
  echo "Traefik OK: /docs cerrado"
else
  echo "Traefik ERROR: /docs no devuelve HTTP/2 404"
  exit 1
fi

echo ""
echo "Swagger cerrado OK"