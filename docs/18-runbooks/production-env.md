# Production Environment

## Crear `.env.production`

```bash
bash deployment/scripts/bootstrap-production-env.sh
```

## Validar variables

```bash
bash deployment/scripts/check-production-env.sh
```

## Regla

Producción utiliza `R2_ENDPOINT_URL=https://2d1fe7144a1af728a30f4953ce53e650.r2.cloudflarestorage.com`
y `R2_BUCKET=proyectos-prod`. El endpoint S3 no incluye el bucket. Si se define
`R2_ENDPOINT` para el backend, debe coincidir con `R2_ENDPOINT_URL`, que utiliza OCR.
Las credenciales deben pertenecer a esa cuenta y permitir acceder a `proyectos-prod`.

La URL pública del bucket es `https://pub-c2f4fdc415bf4c5597adc1a974cd841f.r2.dev`;
no se utiliza como endpoint S3. Las cargas y OCR usan la API S3 autenticada.
La clave del objeto conserva su estructura, por ejemplo
`documentos/2026/08/BBTI/035838b5-9db8-4d2a-ba3f-46d09b0f6be3__03_pago_96691608.pdf`.
El bucket no forma parte de `storageKey`.

Docker carga `deployment/env/.env.production` y el servicio systemd de OCR carga
el mismo archivo. El `.env` de `apps/ms-documentos` corresponde al desarrollo local.
Después de actualizar producción, recrear `ms-documentos` y reiniciar el servicio
`documental-ocr-worker` para aplicar las variables. Cambiar el bucket no migra
objetos existentes ni actualiza sus referencias en la base de datos.

Nunca subir `.env.production` al repositorio.
