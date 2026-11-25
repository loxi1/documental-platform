**Estado:** Base inicial  
**Responsable:** Viejo Maestro

---
# Preview Seguro

Antes de emitir Signed URL se valida Workspace, empresa, permisos, documento y archivo.


---

## 2026-11-25 — Cierre institucional documental NAS R1

Repository=SOURCE. Esta adenda prevalece únicamente sobre estados históricos incompatibles de NAS; no reescribe antecedentes ni autoriza acciones por su lectura.

SOURCE conserva excluidos los scripts locales de recuperación no rastreados.

### Visor NAS y CSP corregidos

Incidencia histórica `NS_ERROR_CSP_FRAME_ANCESTOR_VIOLATION`: la excepción Gateway anterior solo operaba en development. SOURCE `4776f2e907e64e3eaaacf5d6cff2874a907a3785` corrigió `apps/api-gateway/src/documentos/documentos.controller.ts` y `documentos.archivado-csp.spec.ts`; equivalencia Enterprise 2/2 blobs y modos PASS. Pruebas13/13 y build Gateway PASS_REPORTED, no repetidos.
Solo en preview NAS exitoso `/api/v1/documentos/archivado/preview/:archivoId`, tras validar MIME PDF/PNG/JPEG y con CSP existente, production sustituye exclusivamente `frame-ancestors https://bbtecnologia.com` y retira X-Frame-Options en esa respuesta. Otras directivas/rutas mantienen seguridad. DEV conserva `'self' http://localhost:3005`. No derivar autorización de Origin, Referer ni R2_NAS_PUBLIC_GATEWAY_ALLOWED_ORIGINS; sin comodines. Tickets firmados, expiración, autorización contextual y aislamiento preservados.
No se capturaron en esta intervención cabeceras productivas HTTP200; el cierre funcional del navegador es PASS_PO. Un401 sin ticket conserva protecciones y no representa la respuesta autorizada del visor.
### Disponibilidad

VisualizaciónNAS verificada/autorizada; R2 se conserva en producción. No emitir URL NAS por mera copia sin acreditar integridad/disponibilidad. El ticket nunca se registra en manuales, URLs de evidencia ni logs compartidos. Aceptación transversal PO 25/11 PASS; flagruntimeVIEWER_ACCEPTEDfalsepreservado.
