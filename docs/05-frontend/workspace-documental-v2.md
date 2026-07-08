# Workspace Documental V2

**Proyecto:** Documental Platform  
**Sprint:** 1.4B — UX Jerarquía Documental V2  
**Rol responsable:** Maestro Sucesor II — Producto / UX / Web Admin  
**Estado:** Entregable para validación del Maestro Intermedio  
**Tipo:** Documento UX, sin implementación React, sin backend, sin migraciones

---

## 1. Propósito

Este documento define cómo debe navegar un usuario dentro del **Workspace Documental V2** desde que ingresa a un **Contenedor Operativo** hasta que termina de revisar o validar un **Grupo de Factura**.

No define tablas, endpoints, componentes React ni estructura relacional. Define el proceso de usuario, la jerarquía visual, el contexto persistente y las acciones disponibles.

El Workspace Documental V2 se basa en la jerarquía oficial aprobada:

```text
Contenedor Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Adjuntos
```

La UI debe representar el negocio, no la implementación técnica.

Este principio queda formalizado como principio oficial del frontend Documental Platform V2.

---

## 2. Principios oficiales de UX

### 2.1 Principio oficial del frontend

```text
La UI debe representar el negocio, no la implementación técnica.
```

Este principio gobierna todos los rediseños del Web Admin. La experiencia no debe depender de nombres de tablas, relaciones SQL, endpoints internos ni estructuras legacy. Debe depender del Modelo Documental V2 y del proceso real del usuario.

### 2.2 La UX no se diseña como pantallas aisladas

El Web Admin no debe partir de la idea de “una tabla por entidad” ni de “una pantalla por tabla”.

Debe diseñarse como un **workspace de navegación documental**, donde el usuario avanza naturalmente por niveles:

```text
Contexto Operativo
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Adjuntos
```

Estos niveles pueden representarse con:

- árbol documental;
- breadcrumbs;
- panel lateral jerárquico;
- tabs contextuales;
- cards de proceso;
- timeline documental;
- panel de validación.

No necesariamente deben ser páginas separadas.

### 2.3 El histórico se consulta; el Modelo V2 gobierna

Principio oficial:

```text
El histórico se consulta.
El Modelo Documental V2 gobierna.
```

El legacy no debe mezclarse con la operación activa. Debe existir diferenciación visual clara:

```text
OPERATIVO V2
HISTÓRICO
```

El usuario podrá consultar documentos históricos, pero la experiencia operativa deberá construirse sobre el Modelo Documental V2.

### 2.4 Principal significa esPrincipal === true

La UI solo debe pintar un documento como principal si:

```text
esPrincipal === true
```

No debe usar como verdad visual:

```text
tipoRelacion.startsWith("principal_")
```

`tipoRelacion` clasifica la relación documental, pero no define por sí solo el documento principal activo.

### 2.5 La factura ya no es documento principal

La factura pertenece al **Grupo de Factura**.

El documento operativo principal puede ser:

- OC;
- OS;
- Requerimiento de Compra;
- otro documento operativo aprobado por negocio.

La factura no debe ser tratada como raíz formal de la operación.

### 2.6 La unidad de trabajo de Contabilidad es el Grupo de Factura

Principio UX obligatorio:

```text
La unidad de trabajo de Contabilidad es el Grupo de Factura, no el Contenedor Operativo.
```

Contabilidad puede consultar el Contenedor Operativo como contexto, pero su trabajo diario consiste en revisar grupos de factura:

```text
Factura
  -> Guía
  -> Nota de ingreso
  -> Transferencia
  -> Detracción
  -> Otros adjuntos
```

---

## 3. Conceptos UX centrales

## 3.1 Contenedor Operativo

El **Contenedor Operativo** es la raíz conceptual del dominio. No necesariamente debe mostrarse con ese nombre al usuario.

Puede representarse funcionalmente como:

- expediente;
- centro de costo;
- orden de producción;
- proyecto;
- PR;
- requerimiento operativo;
- equivalente definido por negocio.

La UI no debe asumir que siempre se llama “Expediente”.

### Regla UX

El Contenedor Operativo da contexto, trazabilidad y agrupación, pero no siempre es la unidad de trabajo diaria de todos los perfiles.

Compras puede iniciar desde el Contenedor Operativo. Contabilidad normalmente trabaja desde Grupos de Factura.

---

## 3.2 Contexto Operativo

El **Contexto Operativo** es la franja persistente que permite al usuario saber siempre dónde está trabajando.

Debe permanecer visible durante toda la navegación del workspace.

Debe mostrar, según disponibilidad:

```text
Empresa
Unidad operativa visible: Centro de costo / OP / PR / Proyecto / Expediente
Periodo
Estado del contenedor
Documento Operativo Principal seleccionado
Grupo de Factura seleccionado
```

Ejemplo visual conceptual:

```text
BBTI · Centro de costo 050201 · PRODUCCION C X DISTRIBUIR · Estado abierto
OC 007950 · Proveedor CORPORACION ACEROS AREQUIPA
Factura F011-00001135 · Emitida 04/05/2026
```

### Regla UX

El usuario no debe tener que volver a la bandeja para recordar:

- en qué empresa está;
- qué centro de costo u operación está revisando;
- qué documento operativo gobierna el grupo;
- qué factura está validando.

---

## 3.3 Workspace = Contexto

El Workspace Documental V2 no es solamente navegación. Es, sobre todo, **contexto operativo persistente**.

El usuario puede ingresar al mismo workspace desde Compras, Almacén, Finanzas o Contabilidad, y también puede entrar directamente desde un Grupo de Factura. Por eso la interfaz debe reconstruir siempre el contexto completo.

### Barra de Contexto Operativo

Debe existir una barra superior o bloque persistente equivalente a:

```text
Empresa: BBTI
Contenedor Operativo: 050201 / PRODUCCION C X DISTRIBUIR
Documento Principal: OC 007950
Grupo de Factura: F001-00125
Estado: Pendiente Contabilidad
```

Esta barra no reemplaza al breadcrumb. El breadcrumb indica navegación; la barra de contexto indica **dónde está trabajando el usuario**.

### Regla UX

La Barra de Contexto Operativo debe permanecer visible durante toda la navegación dentro del workspace, incluyendo:

- navegación por árbol documental;
- apertura de grupo de factura;
- visualización de adjuntos;
- validación contable;
- observación o aprobación del grupo;
- consulta de histórico.

Si algún nivel todavía no existe, debe mostrarse como pendiente o no seleccionado.

Ejemplo:

```text
Empresa: BBTI
Contenedor Operativo: 050201
Documento Principal: Sin registrar
Grupo de Factura: No seleccionado
Estado: Sin Documento Principal
```

---

## 3.4 Documento Operativo Principal

Representa el documento operativo que inicia o gobierna una línea de trabajo documental.

Puede ser:

- OC;
- OS;
- Requerimiento de Compra;
- equivalente aprobado.

### Regla pendiente

Aún no está cerrado si un Contenedor Operativo tendrá:

- un solo Documento Operativo Principal; o
- varios Documentos Operativos Principales.

Por tanto, la UX debe permitir evolución sin romper componentes.

Diseño recomendado:

```text
Contenedor Operativo
  -> Documentos Operativos
      -> OC 007950
      -> OS 000262
      -> RC 000123
```

Si luego negocio define un único principal activo, la UI puede marcarlo como:

```text
Principal activo
```

Si se permiten varios documentos operativos, la UI ya soporta la lista.

---

## 3.5 Grupo de Factura

El **Grupo de Factura** es la unidad documental que agrupa una factura y sus documentos asociados.

Contiene:

- factura;
- guía;
- nota de ingreso;
- transferencia;
- detracción;
- otros adjuntos aprobados.

### Regla UX

El Grupo de Factura debe verse como una unidad de trabajo.

No debe presentarse como una fila perdida dentro de una tabla plana de documentos.

Ejemplo conceptual:

```text
Grupo Factura F011-00001135
  Estado: incompleto
  Factura: validada
  Guía: pendiente
  Nota ingreso: pendiente
  Transferencia: cargada
  Detracción: no aplica / pendiente
```

---

## 3.6 Adjuntos

Los adjuntos son documentos asociados a un Grupo de Factura.

No deben flotar directamente debajo del Contenedor Operativo si corresponden a una factura específica.

Ejemplos:

```text
Factura F011-00001135
  -> Guía T001-123
  -> NI 000456
  -> Transferencia OP-9823
  -> Detracción 88912
```

### Regla UX

Almacén y Finanzas no “adjuntan al expediente”; adjuntan al Grupo de Factura correspondiente.

---

## 4. Estados del Workspace

El usuario puede ingresar al Workspace Documental V2 desde distintos puntos. Por eso el sistema debe mostrar un estado global del workspace que ayude a entender el avance del proceso.

Estos estados no reemplazan los estados técnicos de documentos individuales. Sirven para orientar la experiencia del usuario.

### 4.1 Estados recomendados

```text
Sin Documento Principal
Documento Principal registrado
Con Facturas
Con Facturas incompletas
Contabilidad pendiente
Contabilidad validada
Cerrado
Histórico
```

### 4.2 Definición UX de cada estado

| Estado del Workspace | Significado para el usuario | Acción principal sugerida |
|---|---|---|
| Sin Documento Principal | El contenedor existe, pero aún no tiene OC/OS/RC registrado. | Agregar documento operativo. |
| Documento Principal registrado | Ya existe documento operativo, pero aún no hay grupos de factura. | Agregar factura. |
| Con Facturas | Existe al menos un Grupo de Factura. | Abrir grupo. |
| Con Facturas incompletas | Hay grupos con adjuntos pendientes. | Completar adjuntos. |
| Contabilidad pendiente | El grupo tiene documentos suficientes para revisión, pero aún no está validado. | Validar grupo. |
| Contabilidad validada | El grupo fue revisado y aprobado por Contabilidad. | Pasar al siguiente grupo o cerrar. |
| Cerrado | El proceso operativo-documental terminó. | Consultar. |
| Histórico | Información heredada o no operativa V2. | Consultar histórico. |

### 4.3 Relación entre estado global y estado de Grupo de Factura

El Workspace puede estar abierto aunque un Grupo de Factura esté validado.

Ejemplo:

```text
Contenedor Operativo 050201
  Estado Workspace: Con Facturas incompletas
  Grupo Factura F001-00125: Validado
  Grupo Factura F001-00126: Pendiente de guía
  Grupo Factura F001-00127: Contabilidad pendiente
```

Por eso la UX debe mostrar estados en dos niveles:

- estado global del Workspace;
- estado individual de cada Grupo de Factura.

### 4.4 Estado visible en la Barra de Contexto

La Barra de Contexto Operativo debe mostrar el estado más relevante para el usuario según el nivel actual.

Si el usuario está en Contabilidad validando una factura, el estado visible debe ser el del Grupo de Factura, no solamente el del Contenedor Operativo.

Ejemplo:

```text
Empresa: BBTI
Contenedor Operativo: 050201
Documento Principal: OC 007950
Grupo de Factura: F001-00125
Estado: Contabilidad pendiente
```

---

## 5. Navegación del Workspace Documental V2

## 5.1 Estructura general

El workspace debe tener tres zonas principales:

```text
[Contexto Operativo persistente]
[Panel de jerarquía documental]
[Área de trabajo del nivel seleccionado]
```

### Zona 1: Contexto Operativo

Muestra la ubicación funcional del usuario.

Debe ser persistente al navegar entre documento operativo, grupos de factura y adjuntos.

### Zona 2: Panel de jerarquía documental

Muestra el árbol:

```text
Contenedor Operativo
  Documento Operativo Principal
    Grupo Factura 1
      Adjuntos
    Grupo Factura 2
      Adjuntos
```

Debe permitir saltar entre grupos sin volver a una tabla.

### Zona 3: Área de trabajo

Cambia según el nivel seleccionado:

- resumen del contenedor;
- detalle del documento operativo;
- revisión de grupo de factura;
- visor de adjunto;
- historial o timeline.

---

## 5.2 Breadcrumbs

Los breadcrumbs deben mostrar la ruta funcional, no la ruta técnica.

Ejemplo:

```text
Compras > Centro de costo 050201 > OC 007950 > Factura F011-00001135
```

Para Contabilidad:

```text
Revisión contable > Mayo 2026 > Factura F011-00001135 > Validación
```

### Regla UX

Los breadcrumbs deben permitir volver al nivel anterior sin perder filtros ni contexto.

---

## 5.3 Búsqueda

La búsqueda debe adaptarse al proceso del perfil.

### Compras

Busca por:

- centro de costo / OP / PR;
- OC / OS / RC;
- proveedor;
- código operativo;
- estado de carga documental.

### Almacén

Busca por:

- factura;
- guía;
- OC;
- proveedor;
- estado de recepción.

### Finanzas

Busca por:

- factura;
- proveedor;
- monto;
- estado de pago;
- detracción;
- transferencia.

### Contabilidad

Busca por:

- fecha de emisión de factura;
- proveedor;
- estado del Grupo de Factura;
- estado OCR;
- estado de validación.

---

## 5.4 Estados UX

Estados recomendados para el Grupo de Factura:

```text
incompleto
pendiente_validacion
observado
validado
cerrado
```

Estados para Documento Operativo:

```text
abierto
con_facturas
observado
cerrado
```

Estados para Contenedor Operativo:

```text
abierto
en_proceso
cerrado
histórico
```

Los nombres finales pueden ajustarse con negocio, pero la UX debe distinguir claramente:

- operación activa;
- grupo incompleto;
- grupo listo para validar;
- grupo observado;
- grupo validado;
- histórico.

---

## 6. Flujo de usuario: desde Contenedor hasta validación de Factura

## 6.1 Entrada al workspace

El usuario ingresa desde su bandeja operativa.

Ejemplos:

```text
Compras -> buscar operación -> abrir workspace
Almacén -> documentos pendientes de recepción -> abrir grupo factura
Finanzas -> pagos pendientes -> abrir grupo factura
Contabilidad -> facturas por validar -> abrir grupo factura
```

No todos los usuarios empiezan en el mismo nivel.

### Regla UX

El Workspace Documental V2 debe permitir entrada contextual:

- desde Contenedor Operativo;
- desde Documento Operativo Principal;
- desde Grupo de Factura;
- desde un adjunto específico.

Siempre debe reconstruir el Contexto Operativo.

---

## 6.2 Flujo Compras

Compras normalmente trabaja así:

```text
Buscar o crear Contenedor Operativo
  -> crear o seleccionar Documento Operativo Principal
      -> registrar OC / OS / RC
      -> agregar una o varias facturas
      -> abrir Grupo de Factura
      -> revisar adjuntos asociados
```

### Acciones disponibles para Compras

- gestionar contenedor operativo;
- crear documento operativo principal;
- agregar factura al documento operativo;
- abrir grupo de factura;
- adjuntar factura;
- consultar adjuntos relacionados;
- ver versiones;
- solicitar corrección si el documento no corresponde.

### Acciones que desaparecen del flujo anterior

- Abrir sin cargar;
- Cargar OC principal sin contexto;
- reemplazar principal automáticamente;
- mover documentos entre contenedores sin confirmación;
- cargar factura como documento principal;
- mostrar todos los documentos como tabla plana.

---

## 6.3 Flujo Almacén

Almacén trabaja sobre recepción documental asociada a factura.

Flujo:

```text
Buscar factura o grupo pendiente de recepción
  -> abrir Grupo de Factura
      -> cargar Guía
      -> cargar Nota de ingreso
      -> confirmar recepción documental
      -> observar si no corresponde
```

### Regla UX

La guía y la nota de ingreso siempre deben asociarse a un Grupo de Factura.

Almacén no debe cargar documentos sueltos contra el Contenedor Operativo si ya existe factura asociada.

---

## 6.4 Flujo Finanzas

Finanzas trabaja sobre pagos asociados a factura.

Flujo:

```text
Buscar Grupo de Factura pendiente de pago
  -> abrir grupo
      -> adjuntar transferencia
      -> adjuntar detracción
      -> confirmar pago documentado
      -> observar si falta sustento
```

### Regla UX

Transferencia y detracción pertenecen al Grupo de Factura.

No deben visualizarse como documentos generales del expediente.

---

## 6.5 Flujo Contabilidad

Contabilidad no trabaja por expediente plano. El Contenedor Operativo funciona como contexto, pero la acción diaria de Contabilidad es recorrer y validar Grupos de Factura.

Flujo oficial:

```text
Filtrar Grupos de Factura
  -> abrir Grupo de Factura
      -> revisar Documento Operativo Principal como contexto
      -> validar Factura
      -> validar Guía
      -> validar Nota de ingreso
      -> validar Transferencia / Detracción
      -> observar o aprobar el grupo
      -> pasar al siguiente Grupo de Factura
```

### Principio obligatorio

```text
La unidad de trabajo de Contabilidad es el Grupo de Factura, no el Contenedor Operativo.
```

### Filtros contables

- fecha de emisión de factura;
- proveedor;
- empresa;
- estado del Grupo de Factura;
- estado OCR;
- estado de validación;
- existencia de guía;
- existencia de nota de ingreso;
- existencia de pago;
- observado / pendiente / validado.

### Acciones contables

- abrir grupo;
- validar factura;
- validar adjunto;
- observar grupo;
- aprobar grupo;
- generar alerta;
- pasar al siguiente grupo;
- consultar histórico.

---

## 7. Árbol documental

El árbol debe mostrar jerarquía real:

```text
Centro de costo 050201
  OC 007950
    Factura F011-00001135
      Guía EG07-00000165
      Nota ingreso NI-123
      Transferencia OP-999
    Factura F011-00001140
      Guía pendiente
      NI pendiente
```

### Reglas visuales

- Documento Operativo Principal debe estar por encima de los grupos de factura.
- Cada factura debe abrir su propio grupo.
- Adjuntos deben colgar de la factura a la que pertenecen.
- Legacy debe mostrarse separado.
- El estado debe verse a nivel de grupo, no solo a nivel de documento individual.

---

## 8. Timeline documental

El timeline debe narrar el proceso, no la tabla.

Ejemplo:

```text
OC cargada por Compras
Factura agregada
Guía cargada por Almacén
Nota de ingreso validada
Transferencia adjuntada por Finanzas
Grupo observado por Contabilidad
Grupo validado
```

### Regla UX

El timeline debe poder filtrarse por:

- Contenedor Operativo;
- Documento Operativo Principal;
- Grupo de Factura;
- adjunto específico.

---

## 9. Legacy

El histórico debe mostrarse como consulta separada.

Ejemplo:

```text
[OPERATIVO V2]
Documentos actuales organizados por jerarquía.

[HISTÓRICO]
Documentos heredados del flujo Python anterior.
```

### Reglas Legacy

- No mezclar histórico con operación activa.
- No permitir que legacy gobierne estados del Modelo V2.
- No adaptar nuevas pantallas al modelo Python.
- Permitir consulta y trazabilidad.
- Mostrar advertencia visual cuando el usuario esté viendo información histórica.

---

## 10. Acciones nuevas del Workspace V2

Acciones nuevas sugeridas:

- abrir workspace documental;
- seleccionar Documento Operativo;
- crear Grupo de Factura;
- abrir Grupo de Factura;
- adjuntar documento al Grupo de Factura;
- validar Grupo de Factura;
- observar Grupo de Factura;
- pasar al siguiente grupo;
- ver histórico;
- ver timeline por grupo;
- cambiar de documento operativo sin salir del contexto.

---

## 11. Acciones que desaparecen

Deben desaparecer o cambiar de nombre:

```text
Abrir sin cargar
Cargar OC principal
Cargar factura principal
Confirmar silenciosamente
Reemplazar principal automáticamente
Mover documento a otro expediente sin confirmación
Ver todos los documentos como tabla plana
```

Nuevos nombres sugeridos:

```text
Gestionar operación
Abrir workspace
Agregar documento operativo
Crear grupo de factura
Adjuntar al grupo
Validar grupo
Observar grupo
```

---

## 12. Resultado esperado para Sprint 1.5

Este documento debe guiar la implementación React del Sprint 1.5.

Antes de programar, las pantallas deben derivarse del workspace, no de tablas.

Sprint 1.5 deberá tomar como referencia:

```text
docs/17-domain/contenedor-operativo.md
docs/05-frontend/workspace-documental-v2.md
```

---

## 13. Dictamen Maestro Sucesor II

El Workspace Documental V2 debe permitir que Compras, Almacén, Finanzas y Contabilidad trabajen sobre el mismo dominio documental, pero desde procesos distintos.

La jerarquía visual debe ser:

```text
Contexto Operativo persistente
  -> Documento Operativo Principal
      -> Grupo de Factura
          -> Adjuntos
```

La Contabilidad deberá recorrer Grupos de Factura.

Compras deberá gestionar documentos operativos y facturas.

Almacén deberá completar recepción documental asociada a factura.

Finanzas deberá completar sustento de pago asociado a factura.

El histórico se consulta.
El Modelo Documental V2 gobierna.


---

## 14. Mejoras incorporadas por dictamen del Maestro Intermedio

Este documento incorpora las tres precisiones solicitadas para cerrar Sprint 1.4B:

1. Cambiar el enfoque de “vistas” a **Workspace Documental**.
2. Introducir formalmente **Workspace = Contexto** mediante la Barra de Contexto Operativo persistente.
3. Agregar **Estados del Workspace** para guiar la navegación desde distintos puntos de entrada.

Con estas mejoras, el documento queda preparado como base UX para Sprint 1.5 — Implementación React.
