#!/usr/bin/env bash
set -euo pipefail

echo "Validando Engineering Handbook..."

if [ ! -f mkdocs.yml ]; then
  echo "ERROR: falta mkdocs.yml"
  exit 1
fi

if [ ! -f requirements-docs.txt ]; then
  echo "ERROR: falta requirements-docs.txt"
  exit 1
fi

echo "Archivos base OK"
echo "Ejecuta: pip install -r requirements-docs.txt && mkdocs build --strict"
