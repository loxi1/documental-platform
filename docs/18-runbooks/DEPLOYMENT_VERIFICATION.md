# Verificación R2 — identidad, salud y aceptación separadas

## Continuidad R2 — 23/10/2026

Fuente: paquete MSII `PAQUETE_CODEX_R2_DOCUMENTACION_INVENTARIO_2026-10-23.md` y actualización ME `ACTUALIZACION_BIBLIOTECARIO_TECNICO_R2_2026-10-23.md`, ambos en `/home/loxi1/Descargas/`. Producción R2 = **DEPLOY_TECHNICAL_PASS reportado por PO/MSII**; aceptación funcional integral = **PENDING**, E2E = **NOT_VERIFIED**. Esta actualización documental no accedió a EC2/GHCR/RDS ni autoriza operaciones.

Commit Enterprise R2: `e1f099faeb4dfdc9f2b49b9984fe211935875ff3`. Ver [manifest vigente](../31-governance/RELEASE_MANIFEST.md), [deploy](../18-runbooks/DEPLOYMENT_RUNBOOK.md) y [rollback](../18-runbooks/ROLLBACK_RUNBOOK.md).

Estado reportado al 23/10/2026: identidad R2 4/4 y running; frontend/gateway HTTP 200; OCR activo; NATS/Traefik running; Finanzas visual PO. Aceptación integral pendiente. Para una operación futura autorizada, conservar salida fechada de:

```bash
for name in dp_api_gateway dp_ms_auth dp_ms_documentos dp_web_admin; do
  docker inspect --format '{{.Name}}|{{.State.Status}}|{{.Config.Image}}' "$name"
done
systemctl is-active documental-ocr-worker.service
docker inspect --format '{{.Name}}|{{.State.Status}}' dp_nats dp_traefik
curl -sS -o /dev/null --max-time 15 -w 'FRONTEND_HTTP=%{http_code}\n' https://bbtecnologia.com/
curl -sS -o /dev/null --max-time 15 -w 'GATEWAY_HEALTH_HTTP=%{http_code}\n' https://api.bbtecnologia.com/api/v1/health
```

Estos comandos no se ejecutaron durante la actualización documental. Comparar Config.Image con cada referencia del manifest. Las rutas autenticadas READ_ONLY para baseline son `GET /api/v1/documental-v2/finanzas/ordenes-pago/:ordenPagoId`, `GET /api/v1/documental-v2/grupos-factura/:grupoFacturaId/documentos` y `GET /api/v1/documental-v2/finanzas/grupos-factura/:grupoFacturaId/resumen`; el detalle OP incluye estadoRegularizacion. Acreditar IDs y contexto actuales, no reutilizar testigos históricos sin validación. No crear/cargar/confirmar/materializar operaciones para cerrar este expediente documental.


---

## Registro histórico anterior (conservado)

# Verificación y aceptación — Actions #28

Control: `MVP-RELEASE-DOCUMENTARY-CONSOLIDATION-R11-FINAL`. Fecha: 2026-10-16. Estado: **CONSOLIDADO PARA REVISIÓN FINAL Y PUBLICACIÓN DOCUMENTAL CONTROLADA**. Despliegue NO autorizado.

## Evidencia previa conservada

- PO: Compras PASS; Almacén confirmación/persistencia NI PASS; Finanzas OP/pagos/RH/TEMP→PROMOTED/transferencia OCOS PASS en casos probados; Contabilidad bandejas/obligaciones PASS en casos probados.
- Gateway: 34/34 pruebas focales PASS; Compras: 18/18 PASS; compilación aplicación Gateway/Documentos/frontend PASS R2/R4 sobre árbol exacto preparado. Pruebas backend ajenas al delta tenían errores de tipos al incluir todas las specs; no confundir con compilación de aplicación.
- Bandeja HTTP LAB: ocho controles previos, 11 filas del contexto/mes probado. No se repitieron E2E.
- R9C: cuatro manifests/configs GHCR; R10B: cuatro registros, revisión VCS/config y argumentos frontend. R11: resumen oficial PO confirma #28 SUCCESS, PUSH main y commit esperado.

Estas evidencias no son ejecución productiva de #28 ni aceptación universal de cada endpoint. La comprobación específica de campos nuevos persistencia después de la última imagen LAB quedó pendiente; no inventar PASS.

## Checklist posterior al despliegue, solo autorizado separadamente

- [ ] Comparar cuatro digests efectivos con [RELEASE_MANIFEST.md](../31-governance/RELEASE_MANIFEST.md); no solo tags o IDs locales.
- [ ] Salud según healthchecks reales, readiness y logs saneados; no inventar /health ni equiparar ausencia de healthcheck a healthy.
- [ ] Autenticación legítima y contexto empresa/cliente, no headers arbitrarios ni igualdad obligatoria de workspace de origen.
- [ ] Bandeja Contabilidad por fechaEmision, OCOS+OP, estados, cardinalidad/paginación y detalle; mantener período funcional independiente.
- [ ] Principal real Compras y campos de persistencia; distinguir guardado, OCR y confirmación humana.
- [ ] Preservación de flujos Compras/NI/Finanzas ya aceptados; preferir fixtures existentes/lectura. Escrituras de prueba requieren autorización y datos exclusivamente LAB; no crear pagos productivos para probar.
- [ ] Configuración RDS/R2, OCR systemd y dependencias externas preservadas, sin replay ni OCR58.
- [ ] PO acepta release exacto con fecha, alcance/contexto saneado; guardar evidencia y checksums.

PASS solo para alcance acreditado. FAIL ante regresión demostrada. BLOCKED ante identidad/configuración/backup faltantes. STOP y rollback aprobado ante errores de identidad, contexto o persistencia. No autoriza despliegue este checklist.
