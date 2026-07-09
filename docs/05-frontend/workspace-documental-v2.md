# Workspace Documental V2 ERP

**Proyecto:** Documental Platform  
**Sprint:** 1.4B — UX Jerarquía Documental V2  
**Responsable:** Maestro Sucesor II  
**Tipo:** Especificación funcional UX  
**Estado:** Actualizado para validación del Maestro Intermedio  

---

## 1. Propósito

Este documento define cómo debe entenderse y navegarse el **Workspace Documental V2 ERP** desde la experiencia de usuario.

El objetivo no es diseñar pantallas aisladas ni tablas técnicas, sino una experiencia común para módulos distintos del ERP que comparten trazabilidad documental.

Principio oficial del frontend:

> **La UI debe representar el negocio, no la implementación técnica.**

El usuario no debe percibir motores documentales diferentes. Debe sentir que trabaja en un único Workspace Documental, aunque el documento de apertura y la estructura interna cambien según el módulo.

---

## 2. Principio rector del Workspace Documental V2

El Workspace Documental V2 se basa en esta idea:

```text
Contexto Operativo
  -> Documento de apertura
      -> Grupos / Rendiciones / documentos relacionados
          -> Adjuntos / sustentos / regularizaciones
              -> Revisión contable
```

La forma exacta cambia por módulo:

```text
Compras
  Contexto Operativo
    -> Documento Operativo Principal
        -> Grupos de Factura
            -> Adjuntos
                -> Revisión contable
```

```text
Caja Chica
  Contexto Operativo
    -> Requerimiento de Fondo
        -> Rendición
            -> Sustentos
                -> Regularizaciones
                    -> Revisión contable
```

```text
Rendición de Requerimientos
  Contexto Operativo
    -> Documento Inicial de Rendición
        -> Documentos rendidos / sustentos
            -> Regularizaciones
                -> Revisión contable
```

Por tanto, el Workspace Documental es común, pero **no todos los módulos deben usar Grupo de Factura**.

---

## 3. Contexto Operativo según empresa

El primer nivel visible para el usuario es el **Contexto Operativo**.

El contexto operativo responde:

```text
¿Dónde estoy trabajando?
¿Para qué empresa?
¿Qué centro de costo, OP, proyecto, consorcio o requerimiento gobierna esta operación?
¿Cuál es el estado actual?
```

### 3.1 Empresas BBTI y BB Tecnología

Para **BBTI** y **BB Tecnología**, el usuario trabajará normalmente con:

- Centro de costo.
- OP.

Antes de crear:

- OC.
- OS.
- Requerimiento de Compra.

el usuario debe seleccionar el contexto correspondiente.

Ejemplo:

```text
Empresa: BBTI
Centro de costo: 050201
OP: PRODUCCION C X DISTRIBUIR
Documento de apertura: OC 007950
```

### 3.2 Consorcios / Obras

Para casos como:

- Consorcio CIMA.
- Huancavelica.
- Kimbiri.

el Centro de costo puede ser único.

En ese caso:

- El usuario no debe seleccionarlo manualmente.
- El sistema debe mostrarlo como contexto ya definido.
- El usuario debe avanzar directamente al documento de apertura o a la operación disponible.

Ejemplo:

```text
Empresa: Consorcio CIMA
Centro de costo: CIMA-UNICO
Estado: Contexto definido automáticamente
```

Regla UX:

> Si el contexto operativo es único para la empresa, la UI no debe pedir al usuario que lo seleccione.

---

## 4. Barra de Contexto Operativo

El Workspace debe tener una **barra de contexto persistente**.

No es solo navegación. Es memoria visual de la operación.

Debe permanecer visible durante toda la navegación.

Ejemplo:

```text
Empresa
BBTI

Contenedor Operativo
050201 · PRODUCCION C X DISTRIBUIR

Documento de apertura
OC 007950

Grupo / Rendición actual
Factura F011-00001135

Estado
Pendiente Contabilidad
```

Para Caja Chica:

```text
Empresa
BBTI

Contexto Operativo
Caja Chica Administración

Documento de apertura
RF-0001 · Requerimiento de Fondo

Rendición actual
Rendición RF-0001

Estado
Pendiente de regularización
```

La barra de contexto debe evitar que el usuario tenga que regresar para recordar en qué operación está.

---

## 5. Estados del Workspace

El Workspace puede estar en distintos estados funcionales. Estos estados deben guiar la UI.

Estados generales:

```text
Sin documento de apertura
Documento de apertura registrado
Con grupos / rendiciones
Con grupos incompletos
Pendiente de regularización
Contabilidad pendiente
Contabilidad observada
Contabilidad validada
Cerrado
Histórico
```

### 5.1 Estados para Compras

```text
Sin Documento Operativo Principal
Documento Operativo Principal registrado
Con Grupos de Factura
Con Grupos de Factura incompletos
Contabilidad pendiente
Contabilidad validada
Cerrado
```

### 5.2 Estados para Caja Chica

```text
Requerimiento de Fondo creado
Fondo entregado
Rendición iniciada
Rendición parcial
Pendiente de regularización
Transferencia pendiente
Transferencia adjuntada
Contabilidad pendiente
Contabilidad observada
Contabilidad validada
Cerrado
```

### 5.3 Estados para Rendición de Requerimientos

```text
Documento inicial creado
Documentos rendidos cargados
Sustentos incompletos
Pendiente de regularización
Contabilidad pendiente
Contabilidad observada
Contabilidad validada
Cerrado
```

El estado **Pendiente de regularización** es clave para Caja Chica y Rendiciones.

Significa que la operación puede continuar, aunque todavía falte un documento posterior como transferencia bancaria u otro sustento de cierre.

---

## 6. Compras: estructura UX

En Compras, el flujo sigue esta jerarquía:

```text
Contexto Operativo
  -> Documento Operativo Principal
      -> Grupos de Factura
          -> Adjuntos
              -> Revisión contable
```

### 6.1 Documento Operativo Principal

Puede ser:

- OC.
- OS.
- Requerimiento de Compra.

La factura no es documento principal.

Regla visual:

> Principal activo se muestra solo si `esPrincipal === true`.

No debe inferirse por:

```text
tipoRelacion.startsWith("principal_")
```

### 6.2 Grupo de Factura

Cada factura abre un grupo documental.

Ejemplo:

```text
OC 007950
  -> Grupo Factura F011-00001135
      -> Factura
      -> Guía
      -> Nota de ingreso
      -> Transferencia
      -> Detracción
```

La revisión contable en Compras se organiza por Grupo de Factura, no por expediente plano.

### 6.3 Acciones principales en Compras

Acciones permitidas:

- Seleccionar contexto operativo.
- Crear documento operativo principal.
- Agregar factura.
- Abrir grupo de factura.
- Adjuntar documentos relacionados.
- Enviar a revisión contable.

Acciones que desaparecen o quedan bloqueadas:

- Crear múltiples principales sin validación.
- Reemplazar principal automáticamente.
- Mover documentos silenciosamente.
- Confirmar un documento contra otro contexto sin advertencia.
- Pintar Principal solo por tipoRelacion.

---

## 7. Caja Chica: estructura UX corregida

Caja Chica no debe agruparse por factura.

La unidad de trabajo no es el Grupo de Factura. La unidad de trabajo es la **Rendición** asociada a un **Requerimiento de Fondo**.

Estructura UX:

```text
Contexto Operativo
  -> Requerimiento de Fondo
      -> Rendición
          -> Sustentos
              -> Regularizaciones
                  -> Revisión contable
```

### 7.1 Ejemplo visual esperado

```text
Rendición RF-0001

Monto entregado: S/ 1,000.00
Monto rendido:   S/   850.00
Pendiente:       S/   150.00
Transferencia:   Pendiente de regularización

Sustentos:
- Factura F001-123
- Boleta B001-88
- Recibo caja chica RC-15
- Recibo por honorarios E001-555
- Movilidad
```

Esto debe comunicar que existen muchos sustentos, no una jerarquía de factura.

### 7.2 Sustentos de Caja Chica

Los sustentos pueden ser:

- Factura.
- Boleta.
- Recibo de caja chica.
- Recibo por honorarios.
- Movilidad.
- Declaración simple, si negocio lo permite.
- Otros documentos de sustento.

La factura en Caja Chica es un sustento más. No gobierna la navegación.

### 7.3 Transferencia pendiente

La transferencia bancaria puede no existir al inicio.

La UI debe permitir continuar.

Debe mostrarse estado:

```text
Pendiente de regularización
```

Posteriormente el usuario podrá adjuntar la transferencia sin romper la rendición.

Regla UX:

> La falta de transferencia no debe bloquear la rendición si el negocio permite regularización posterior.

---

## 8. Rendición de Requerimientos

Rendición de Requerimientos seguirá una lógica parecida a Caja Chica.

No debe copiar la jerarquía de Compras.

Estructura UX:

```text
Contexto Operativo
  -> Documento Inicial de Rendición
      -> Documentos rendidos / sustentos
          -> Regularizaciones
              -> Revisión contable
```

### 8.1 Documento inicial

Puede representar:

- Requerimiento aprobado.
- Solicitud de gasto.
- Orden interna.
- Documento de apertura de rendición.

### 8.2 Documentos rendidos

Pueden incluir:

- Facturas.
- Boletas.
- Recibos.
- Movilidad.
- Evidencias.
- Transferencias posteriores.
- Otros sustentos.

La UI debe mostrar montos y avance de rendición:

```text
Monto solicitado
Monto rendido
Monto pendiente
Estado de regularización
```

---

## 9. Un solo Workspace, distintas estructuras

El usuario no debe percibir tres motores distintos.

Debe percibir:

```text
Un solo Workspace Documental.
Distintos documentos de apertura.
Distintas estructuras internas.
Un mismo cierre hacia Revisión Contable.
```

Comparación:

| Módulo | Documento de apertura | Unidad de trabajo | Documentos posteriores | Cierre |
|---|---|---|---|---|
| Compras | OC / OS / Requerimiento de Compra | Grupo de Factura | Guía, NI, pagos, detracciones | Revisión contable |
| Caja Chica | Requerimiento de Fondo | Rendición | Sustentos y regularizaciones | Revisión contable |
| Rendiciones | Documento inicial de rendición | Rendición / lote rendido | Sustentos y regularizaciones | Revisión contable |

---

## 10. Navegación común hacia Contabilidad

Todo flujo debe converger en Revisión Contable.

Pero la unidad revisada cambia por módulo.

### 10.1 Contabilidad en Compras

Unidad de trabajo:

```text
Grupo de Factura
```

Contabilidad valida:

- Factura.
- Guía.
- Nota de ingreso.
- Transferencia.
- Detracción.
- OCR.
- Consistencia documental.

### 10.2 Contabilidad en Caja Chica

Unidad de trabajo:

```text
Rendición
```

Contabilidad valida:

- Monto entregado.
- Monto rendido.
- Monto pendiente.
- Sustentos.
- Transferencia, si existe.
- Regularizaciones pendientes.
- Observaciones.

### 10.3 Contabilidad en Rendiciones

Unidad de trabajo:

```text
Rendición / lote de sustentos
```

Contabilidad valida:

- Documento inicial.
- Sustentos cargados.
- Regularizaciones.
- Montos.
- Estados.

---

## 11. Legacy

Principio oficial:

> **El histórico se consulta. El Modelo V2 gobierna.**

El legacy no debe condicionar la UX operativa V2.

Debe existir diferenciación visual clara:

```text
OPERATIVO V2
HISTÓRICO
```

Los documentos históricos pueden consultarse, pero no deben mezclarse con la operación activa del Workspace Documental V2.

---

## 12. Relación con otros sistemas frontend

Caja Chica y Rendición de Requerimientos podrán ser sistemas frontend distintos, con sus propias tablas operativas.

Sin embargo, deben compartir el `schema documentos` para trazabilidad documental.

Regla de arquitectura UX:

> Caja Chica y Rendiciones no deben forzarse a parecer Compras, pero sí deben sentirse parte del mismo Workspace Documental ERP.

Esto permite:

- Propias tablas operativas por módulo.
- Misma trazabilidad documental.
- Mismo cierre hacia Contabilidad.
- Mismo principio de documentos, sustentos, regularizaciones y estados.

---

## 13. Búsqueda y filtros

La búsqueda debe adaptarse al módulo.

### Compras

Filtros sugeridos:

- Contexto operativo.
- Documento operativo principal.
- Grupo de factura.
- Proveedor.
- Fecha emisión factura.
- Estado contable.
- OCR.

### Caja Chica

Filtros sugeridos:

- Requerimiento de Fondo.
- Responsable.
- Estado de rendición.
- Pendiente de regularización.
- Monto pendiente.
- Fecha de entrega.
- Fecha de rendición.

### Rendiciones

Filtros sugeridos:

- Documento inicial.
- Responsable.
- Estado.
- Monto rendido.
- Pendiente de regularización.
- Fecha.

---

## 14. Acciones comunes

Acciones comunes del Workspace:

- Abrir contexto.
- Ver documento de apertura.
- Adjuntar documento.
- Ver sustentos.
- Regularizar documento pendiente.
- Enviar a revisión contable.
- Observar.
- Validar.
- Cerrar.

Acciones específicas por módulo:

### Compras

- Agregar grupo de factura.
- Abrir grupo de factura.
- Adjuntar guía.
- Adjuntar nota de ingreso.
- Adjuntar transferencia.
- Adjuntar detracción.

### Caja Chica

- Registrar monto entregado.
- Registrar sustento.
- Marcar pendiente de regularización.
- Adjuntar transferencia posterior.
- Cerrar rendición.

### Rendiciones

- Registrar documento inicial.
- Agregar documento rendido.
- Regularizar sustento.
- Cerrar rendición.

---

## 15. Conclusión

El Workspace Documental V2 ERP debe ser único en experiencia, pero flexible en estructura.

No todos los módulos se organizan por Factura.

La regla final es:

```text
Compras se organiza por Documento Operativo Principal y Grupos de Factura.
Caja Chica se organiza por Requerimiento de Fondo y Rendición.
Rendiciones se organizan por Documento Inicial y Sustentos.
Todos convergen en Revisión Contable.
```

Esta especificación debe servir como base funcional para futuros sprints de React, backend e integración con sistemas ERP.
