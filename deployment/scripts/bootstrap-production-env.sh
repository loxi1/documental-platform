#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="deployment/env/.env.production"
EXAMPLE_FILE="deployment/env/.env.production.example"

if [ ! -f "$EXAMPLE_FILE" ]; then
  echo "ERROR: falta $EXAMPLE_FILE"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  cp "$EXAMPLE_FILE" "$ENV_FILE"
  echo "Creado $ENV_FILE"
else
  echo "$ENV_FILE ya existe. No se sobrescribe."
fi

echo "Completar: DATABASE_HOST DATABASE_PASSWORD JWT_SECRET JWT_REFRESH_SECRET R2_* TRAEFIK_DOMAIN TRAEFIK_API_DOMAIN"
