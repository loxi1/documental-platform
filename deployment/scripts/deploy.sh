#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "== Deploy Documental Platform =="

if [ ! -f deployment/env/.env.production ]; then
  echo "ERROR: falta deployment/env/.env.production"
  exit 1
fi

git pull --ff-only

docker compose \
  --env-file deployment/env/.env.production \
  -f deployment/docker/docker-compose.production.yml \
  build

docker compose \
  --env-file deployment/env/.env.production \
  -f deployment/docker/docker-compose.production.yml \
  up -d

bash deployment/scripts/healthcheck.sh
