# OCR LAB aislado por subjects

Preparación únicamente; no ejecutar estos pasos sobre servicios productivos.
El broker sigue siendo compartido. Los subjects LAB no son una barrera ACL.

1. Construir ms-documentos con el soporte `OCR_REQUEST_SUBJECT` y, en su
   procedimiento existente de arranque **LAB**, añadir al final:
   `--env-file deployment/docker/ms-documentos.ocr-lab.env`.
   El contenedor LAB actual no tiene etiquetas Compose; este archivo no intenta
   reconstruir su configuración ni recrearlo. No cambiar `.env.production`.
2. Tras autorizar la actualización exclusiva de Node LAB, validar con
   `python3 deployment/scripts/ocr-lab.py`. No inicia procesos.
3. Solo con autorización para levantar el worker:
   `python3 deployment/scripts/ocr-lab.py --start`.
   Levanta únicamente `dp_ocr_worker_lab`; no reinicia NATS, MinIO ni el worker host.
   Usa las credenciales existentes de `dp_minio_documental_lab` en memoria;
   nunca consulta credenciales Cloudflare ni las escribe a un archivo.
4. Verificar mediante el monitor NATS que el nuevo worker se suscriba solamente
   a `lab.ocr.procesar-archivo`. Sus eventos usan `lab.documento.clasificado`.
   No ejecutar el smoke OCR hasta una autorización posterior.

La imagen copia solo `app` y requirements. No monta el `.env` del worker host
ni storage existente. El endpoint MinIO es explícito; no se activa path-style global.
No imprimir `docker compose config` sin `--quiet`, ni el entorno del contenedor.
