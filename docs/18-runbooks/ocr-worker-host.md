# OCR Worker en Host

## Decisión oficial

El OCR Worker corre nativamente en Ubuntu con Python venv + systemd.

No se usa Docker para OCR en producción.

## Instalar

```bash
bash deployment/scripts/install-ocr-host.sh
```

## Iniciar

```bash
sudo systemctl start documental-ocr-worker
sudo systemctl status documental-ocr-worker
```

## Logs

```bash
sudo journalctl -u documental-ocr-worker -f
```

## NATS

NATS corre en Docker pero expone localhost:

```text
127.0.0.1:4222
```

El OCR usa:

```text
OCR_NATS_URL=nats://localhost:4222
```
