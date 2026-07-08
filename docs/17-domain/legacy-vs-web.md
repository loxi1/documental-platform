# Legacy Python vs Web Admin V2

## Propósito

Definir la relación conceptual entre el proyecto histórico Python y el Modelo Documental V2 del Web Admin.

## Proyecto Legacy

Cuando se menciona Legacy Python, se refiere al proyecto:

```text
https://github.com/loxi1/Gestion_Documental_Emisores/
```

Ese proyecto realizó clasificación y renombrado masivo de documentos históricos por empresa y mes.

## Lógica legacy

La lógica principal era:

```text
Empresa / Mes
  -> archivos locales existentes
  -> clasificación documental
  -> OCR / extracción mínima
  -> renombrado
  -> expediente documental en nombre de archivo
  -> trazabilidad en base de datos
```

El valor del legacy está en:

- clasificación histórica
- rutas locales de archivos
- trazabilidad de procesamiento
- extracción previa
- consulta documental histórica

## Regla oficial

```text
El histórico se consulta.
El Modelo Documental V2 gobierna.
```

## Independencia del modelo V2

El Modelo Documental V2 no depende funcionalmente del modelo histórico.

El proyecto Legacy Python conserva valor como repositorio histórico y de consulta, pero no gobierna las reglas del dominio operativo.

## Qué no debe hacer Legacy

Legacy no debe gobernar:

- Contenedor Operativo
- Documento Operativo Principal
- Grupo de Factura
- Adjuntos por Factura
- reglas de R2
- reglas de carga guiada
- reglas de duplicidad V2
- modelo relacional operativo
- UX del Web Admin

## Integración mediante adaptadores

Toda integración con Legacy deberá realizarse mediante adaptadores o servicios de consulta.

El dominio V2 nunca deberá depender funcionalmente del modelo Legacy.

## No subir histórico masivamente a R2

No se recomienda subir masivamente la data histórica local a R2.

El histórico puede consultarse desde un módulo separado, pero no debe mezclarse con el flujo operativo nuevo.

## Separación sugerida

Si se requieren tablas históricas, estas deben estar separadas de las tablas operativas.

Ejemplo conceptual:

```text
historico.documentos_legacy
historico.archivos_legacy
historico.trazabilidad_legacy
```

Estos nombres no son definitivos ni representan SQL.

## Módulo de consulta histórica

Un módulo futuro podría permitir:

- buscar documentos históricos
- ver empresa y mes
- ver nombre original y nombre renombrado
- ver ruta local
- ver clasificación histórica
- ver trazabilidad del proceso Python

Ese módulo no debe modificar el flujo operativo V2.

## Dictamen

Legacy Python sigue teniendo valor, pero como histórico.

El Web Admin V2 define el nuevo dominio documental.

No debe adaptarse el modelo V2 al histórico.
