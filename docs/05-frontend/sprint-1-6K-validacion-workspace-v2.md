# Sprint 1.6K — Validación funcional Workspace V2 con Sandbox Documental

## Estado

**Sprint:** 1.6K  
**Nombre:** Validación Workspace V2 con Sandbox Documental  
**Responsable de este documento:** Maestro Sucesor II — UX / Web Admin / Frontend  
**Estado:** Matriz UX preparada para validación visual con sandbox `900001` a `900006`.

---

## Contexto del Sprint

El Sprint 1.6J dejó publicado el Workspace Documental V2 read-only enriquecido.

Antes de fusionar a `main`, Maestro Intermedio autorizó el Sprint 1.6K para validar el Workspace V2 con más escenarios, usando un **Sandbox Documental**.

El objetivo no es crear funcionalidades nuevas, sino probar la robustez del contrato y de la pantalla frente a casos reales, negativos y de borde.

---

## Decisión final sobre Sandbox

Inicialmente se evaluó usar empresa `BBTI_DEV`, pero el Gateway/Web Admin bloqueó esos expedientes por permisos, ya que el workspace actual está autorizado para:

```text
empresaCodigo = BBTI
```

Por decisión funcional, el sandbox queda bajo empresa autorizada:

```text
empresa_codigo = BBTI
cliente_abreviatura = BBTI
codigo_expediente = 900001–900006
metadata.sandbox = true
metadata.sprint = "1.6K"
metadata.origen = "SEED_CONTROLADO_WORKSPACE_V2"
```

La separación del sandbox no se realiza por empresa, sino por:

```text
códigos 900xxx
metadata.sandbox = true
metadata.sprint = "1.6K"
metadata.origen = "SEED_CONTROLADO_WORKSPACE_V2"
```

Esto permite validar Web Admin y Gateway sin tocar Auth ni crear workspaces adicionales.

---

## Ajuste aplicado por Maestro Sucesor I

Se corrigieron claves documentales sandbox para que no queden prefijadas con `BBTI_DEV`.

Comandos reportados:

```sql
UPDATE documentos.documentos
SET clave_documental = replace(clave_documental, 'BBTI_DEV', 'BBTI'),
    actualizado_en = now()
WHERE metadata->>'sandbox' = 'true'
  AND metadata->>'sprint' = '1.6K'
  AND clave_documental LIKE 'BBTI_DEV%';
```

Y en seed local:

```bash
sed -i 's/BBTI_DEV|/BBTI|/g' infra/postgres/seeds/documental_v2_workspace_cases.sql
```

Desde UX/Web Admin, esta corrección es importante porque evita mostrar o arrastrar una identidad documental no autorizada por el workspace actual.

---

## Alcance del Maestro Sucesor II

Validar en Web Admin:

```text
/workspace/expedientes-v1/:id
/documental-v2/workspace/:id
```

con los expedientes:

```text
41
900001
900002
900003
900004
900005
900006
999999
```

---

## Fuera de alcance

El Maestro Sucesor II no debe:

```text
Crear datos SQL
Modificar seed
Tocar PostgreSQL
Tocar backend
Tocar Gateway
Tocar OCR
Tocar R2
Tocar NATS
Crear eventos
Crear alertas
Implementar edición
Implementar carga
Implementar escritura V2
Hacer merge a main
```

---

## Reglas UX obligatorias

La pantalla debe:

```text
Usar campos normalizados de vista.
No leer metadata OCR.
No inferir proveedor, fecha, monto, serie ni número.
No mostrar IDs técnicos como título si existe titulo/facturaLabel/documentoLabel.
Mostrar "—" o "No informado" si el campo viene null.
Mostrar advertencias como estado informativo.
No tratar una factura sin principal como Documento Operativo Principal.
Mantener la jerarquía V2.
```

Jerarquía esperada:

```text
Contexto Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Adjuntos
```

---

## Endpoint validado por Maestro Sucesor I

```text
GET /api/v1/documental-v2/workspace/expedientes-v1/:id
```

Los expedientes `900001` a `900006` ya responden por Gateway con `success=true`.

El expediente `999999` responde `NOT_FOUND`, como caso negativo esperado.

---

## Matriz UX / Web Admin

| Caso | Expediente | Escenario | Resultado backend reportado | Resultado Web Admin esperado | Estado UX | Observación |
|---|---:|---|---|---|---|---|
| Base real | 41 | OC + Factura real existente | 1 principal, 1 grupo factura, 0 adjuntos, 0 advertencias | Mostrar OC 007950, Factura F011-00001135, adjuntos 0 | Pendiente de revalidación 1.6K | No alterar expediente 41 |
| A | 900001 | OC + Factura | `success=true`; 1 principal; 1 grupo factura; 0 advertencias | Mostrar contexto sandbox, OC enriquecida y Factura enriquecida | Pendiente validación visual | Caso feliz sandbox |
| B | 900002 | OC sin factura | `success=true`; 1 principal; 0 grupos; advertencia `EXPEDIENTE_V1_SIN_FACTURA` | Mostrar OC y estado/advertencia de factura pendiente | Pendiente validación visual | No debe mostrarse como error fatal |
| C | 900003 | Factura sin Documento Operativo Principal | `success=true`; 0 principales; 1 grupo factura; advertencia `EXPEDIENTE_V1_SIN_DOCUMENTO_PRINCIPAL` | Mostrar inconsistencia; factura no debe convertirse en principal | Pendiente validación visual | Caso importante de dominio |
| D | 900004 | OC + Factura + Guía + NI + Transferencia + Detracción | `success=true`; 1 principal; 1 grupo; 4 documentos de grupo; 0 advertencias | Mostrar grupo con 4 adjuntos clasificados | Pendiente validación visual | Caso completo |
| E | 900005 | OC + múltiples facturas | `success=true`; 1 principal; 3 grupos factura; advertencia de múltiples facturas | Mostrar 3 tarjetas de Grupo de Factura y advertencia informativa | Pendiente validación visual | Validar legibilidad vertical |
| F | 900006 | Expediente vacío | `success=true`; 0 principales; 0 grupos; 2 advertencias | Mostrar contexto, empty states y advertencias | Pendiente validación visual | No debe romper layout |
| G | 999999 | Expediente inexistente | `success=false`; `NOT_FOUND` | Mostrar error controlado de expediente inexistente | Pendiente validación visual | No debe romper layout |

---

## Checklist visual por expediente

Para cada expediente:

```text
[ ] Abre /workspace/expedientes-v1/:id
[ ] Carga sin error inesperado
[ ] Contexto Operativo visible
[ ] Documento Operativo Principal visible o empty state correcto
[ ] Grupo(s) de Factura visibles o empty state correcto
[ ] Adjuntos dentro del grupo correcto
[ ] Advertencias visibles como información
[ ] No se muestran IDs técnicos como título si hay label
[ ] No se inventan datos ausentes
[ ] Moneda null no rompe la presentación
[ ] Fechas se muestran sin desfase de zona horaria
[ ] Se mantiene jerarquía V2
```

---

## Riesgos UX a observar

### Caso 900003 — Factura sin principal

La UI no debe dar a entender que la factura es Documento Operativo Principal.

Debe verse como inconsistencia o estado incompleto.

### Caso 900005 — múltiples facturas

La UI debe soportar varias tarjetas de Grupo de Factura sin perder claridad.

### Caso 900006 — vacío

Debe verse como estado vacío/incompleto, no como pantalla rota.

### Caso 999999 — no existe

Debe mostrar error controlado.

---

## Criterio de cierre desde Maestro Sucesor II

El Sprint 1.6K podrá cerrarse desde UX/Web Admin cuando:

```text
900001 a 900006 se validen visualmente.
999999 muestre error controlado.
La matriz quede completa.
No se detecten errores visuales bloqueantes.
Si hay ajustes menores, queden documentados o corregidos en commit separado.
```

---

## Resultado final

Pendiente de validación visual en Web Admin.
