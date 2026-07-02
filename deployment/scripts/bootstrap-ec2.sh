#!/usr/bin/env bash
set -euo pipefail

echo "== Bootstrap EC2 Ubuntu para Documental Platform =="
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y curl wget git unzip ca-certificates gnupg lsb-release htop ufw jq nano

bash deployment/scripts/install-docker.sh

sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

mkdir -p deployment/env deployment/logs storage /tmp/documental-ocr

echo "Bootstrap EC2 completado."
