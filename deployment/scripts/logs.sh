#!/usr/bin/env bash
set -euo pipefail

SERVICE="${1:-}"

if [ -z "$SERVICE" ]; then
  docker compose -f deployment/docker/docker-compose.production.yml logs -f --tail=200
else
  docker logs -f --tail=200 "$SERVICE"
fi
