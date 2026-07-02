# Production Readiness Pack 03 — EC2 Bootstrap + OCR Host

Prepara una EC2 Ubuntu para Documental Platform.

Decisión oficial:

```text
Docker:
- Traefik
- NATS
- Web Admin
- API Gateway
- ms-auth
- ms-documentos

Host Ubuntu + systemd:
- OCR Worker Python
```

## Integración

```bash
unzip documental-platform-production-readiness-pack-03-ec2-ocr.zip
cp -r documental-platform-production-readiness-pack-03-ec2-ocr/* .
chmod +x deployment/scripts/*.sh

git add deployment/ docs/18-runbooks/ CHANGELOG-PRODUCTION-READINESS-PACK-03.md
git commit -m "infra: add ec2 bootstrap and native ocr worker setup"
```
