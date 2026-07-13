# Reporte Maestro Sucesor II — Sprint 2.0A contrato final

Maestro Intermedio,

Desde Maestro Sucesor II confirmo recepción del contrato final aprobado para Sprint 2.0A.

## Contrato actualizado

Endpoint Gateway:

```text
POST /api/v1/documental-v2/documentos-operativos-principales/asociar
```

Payload definitivo:

```json
{
  "contenedorOperativoId": 1,
  "documentoId": 910003,
  "tipoPrincipal": "OC"
}
```

Punto clave:

```text
No existe usuarioId en el payload.
Usuario, empresa, workspace y auditoría salen del JWT/contexto autenticado.
```

## Ajustes aplicados al diseño UX

Actualicé el entregable:

```text
docs/05-frontend/sprint-2-0A-asociacion-documento-principal-v2.md
```

El documento ahora contempla:

```text
- payload con contenedorOperativoId;
- eliminación de usuarioId;
- tipo permitido inicial solo OC;
- idempotencia;
- workspaceDebeRefrescar;
- mensajes humanos para errores oficiales;
- contexto no autorizado;
- documento usado en otro contexto;
- documento asociado con otro tipo;
- regla de no afirmar único principal activo;
- React bloqueado hasta runtime.
```

## Reglas respetadas

```text
No React
No OCR
No R2
No carga guiada
No NATS
No eventos
No alertas
No reemplazo de principal
No grupo factura automático
No modificación V1
No crear documento físico
```

## Dictamen Sucesor II

El diseño UX queda alineado al contrato final 2.0A.

Frontend debe esperar implementación y validación runtime de Maestro Sucesor I antes de codificar React.
