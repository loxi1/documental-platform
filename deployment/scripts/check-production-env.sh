#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="deployment/env/.env.production"
[ -f "$ENV_FILE" ] || { echo "ERROR: no existe $ENV_FILE"; exit 1; }

required=(
  TRAEFIK_DOMAIN
  TRAEFIK_API_DOMAIN
  DATABASE_HOST
  DATABASE_NAME
  DATABASE_USER
  DATABASE_PASSWORD
  JWT_SECRET
  JWT_REFRESH_SECRET
  R2_ENDPOINT
  R2_BUCKET
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY
  NEXT_PUBLIC_APP_URL
  NEXT_PUBLIC_API_URL
)

missing=0
for key in "${required[@]}"; do
  value="$(grep -E "^${key}=" "$ENV_FILE" | tail -n1 | cut -d= -f2- || true)"
  if [ -z "$value" ] || [[ "$value" == "change_me"* ]] || [[ "$value" == your-* ]]; then
    echo "FALTA/PLACEHOLDER: $key"
    missing=1
  fi
done

[ "$missing" -eq 0 ] || exit 1

app_url="$(grep -E "^NEXT_PUBLIC_APP_URL=" "$ENV_FILE" | tail -n1 | cut -d= -f2- || true)"
api_url="$(grep -E "^NEXT_PUBLIC_API_URL=" "$ENV_FILE" | tail -n1 | cut -d= -f2- || true)"

if [[ "$app_url" == *"localhost"* ]] || [[ "$app_url" == *"127.0.0.1"* ]] || [[ "$app_url" == *"192.168."* ]] || [[ "$app_url" != https://* ]]; then
  echo "ERROR: NEXT_PUBLIC_APP_URL debe ser una URL HTTPS pública y no local: $app_url"
  exit 1
fi

if [[ "$api_url" == *"localhost"* ]] || [[ "$api_url" == *"127.0.0.1"* ]] || [[ "$api_url" == *"192.168."* ]] || [[ "$api_url" != https://* ]]; then
  echo "ERROR: NEXT_PUBLIC_API_URL debe ser una URL HTTPS pública y no local: $api_url"
  exit 1
fi

echo "Variables obligatorias OK."