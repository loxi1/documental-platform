#!/usr/bin/env bash
set -euo pipefail

echo "== Rollback básico =="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [ -z "${1:-}" ]; then
  echo "Uso: bash deployment/scripts/rollback.sh <git-ref>"
  exit 1
fi

git fetch --all
git checkout "$1"

docker compose \
  --env-file deployment/env/.env.production \
  -f deployment/docker/docker-compose.production.yml \
  up -d --build

bash deployment/scripts/healthcheck.sh
