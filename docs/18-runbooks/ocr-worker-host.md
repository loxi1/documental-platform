# OCR Worker en Host

## Decisión

En producción, el OCR Worker se instala en el sistema operativo de la EC2 como servicio Python.

No corre como contenedor Docker.

## Instalación

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

## Regla

NATS corre en Docker, pero expone `127.0.0.1:4222` para que el OCR Worker en host pueda conectarse.
