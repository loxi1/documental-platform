import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { sql } from '@documental/database';
import { AuditoriaOperativaV2Repository } from '../auditoria-operativa-v2.repository';
import { validarActorOp,
  validarActorOpLecturaScoped, validarEdicionOrdenPago, validarOrdenPago } from './orden-pago.dto';
import type { EditarOrdenPagoInput, OrdenPagoActor } from './orden-pago.dto';
import type { SqlExecutor } from '../sql-executor';
import { CatalogoConceptosObligacionRepository } from '../catalogo-conceptos-obligacion.repository';
import { ObligacionesSnapshotRepository } from '../obligaciones-snapshot.repository';
import { RegularizadoresObligacionRepository } from '../regularizadores-obligacion.repository';
import { ConfigProveedoresConceptoOpRepository } from '../config-proveedores-concepto-op.repository';
import { ConfigBeneficiariosRendicionOpRepository } from '../config-beneficiarios-rendicion-op.repository';
import { ConfirmacionDocumentalService } from '../confirmacion-documental.service';

@Injectable()
export class OrdenPagoService {
  constructor(
    private readonly auditoria: AuditoriaOperativaV2Repository,
    private readonly catalogoConceptos: CatalogoConceptosObligacionRepository,
    private readonly obligacionesSnapshot: ObligacionesSnapshotRepository,
    private readonly regularizadoresObligacion: RegularizadoresObligacionRepository,
    private readonly configProveedores: ConfigProveedoresConceptoOpRepository,
    private readonly configRendicion: ConfigBeneficiariosRendicionOpRepository,
    private readonly confirmacionDocumental: ConfirmacionDocumentalService,
  ) {}

  async obtenerUploadPendiente(ordenPagoId: number, actor: OrdenPagoActor) {
    validarActorOp(actor);

    if (!Number.isSafeInteger(ordenPagoId) || ordenPagoId <= 0) {
      throw new NotFoundException('Orden de Pago no disponible');
    }

    // La única autoridad externa es ordenPagoId + actor.
    // Todo el contexto estructural se deriva aquí en backend.
    const detalle = await this.obtenerDetalle(ordenPagoId, actor);

    const expedienteId = Number(detalle.expedienteId);
    const documentoBaseId = Number(detalle.documentoId);
    const grupoFacturaId = Number(detalle.grupoFacturaId);

    if (
      !Number.isSafeInteger(expedienteId) ||
      expedienteId <= 0 ||
      !Number.isSafeInteger(documentoBaseId) ||
      documentoBaseId <= 0 ||
      !Number.isSafeInteger(grupoFacturaId) ||
      grupoFacturaId <= 0
    ) {
      throw new ConflictException('ORDEN_PAGO_CONTEXTO_RECUPERACION_INCONSISTENTE');
    }

    /*
     * R4P:
     * - identifica primero el upload por contexto persistido;
     * - excluye únicamente consumo financiero V2 ACTIVO del MISMO documento;
     * - NO usa estado OCR, recencia, MAX, LIMIT 1 ni ausencia global de pagos;
     * - trae todos los OCR del candidato para detectar ambigüedad explícitamente.
     */
    const candidatos = await sql`
      SELECT
        d.id AS "documentoId",
        a.id AS "archivoId",
        a.nombre_archivo AS "nombreArchivo",
        a.metadata->>'contentType' AS "contentType",
        a.estado AS "estadoArchivo",
        COALESCE(
          json_agg(
            json_build_object(
              'ocrResultadoId', o.id,
              'estado', o.estado,
              'validacionPendientePago', o.metadata->'validacionPendientePago'
            )
            ORDER BY o.id
          ) FILTER (WHERE o.id IS NOT NULL),
          '[]'::json
        ) AS "ocrResultados"
      FROM documentos.documentos d
      JOIN documentos.documentos_archivos a
        ON a.documento_id = d.id
      LEFT JOIN documentos.ocr_resultados o
        ON o.documento_id = d.id
       AND o.archivo_id = a.id
      WHERE
        a.workspace_id = ${actor.workspaceId}::bigint
        AND a.empresa_codigo = ${actor.empresaCodigo}::text
        AND a.cliente_destino_id IS NOT DISTINCT FROM ${actor.clienteDestinoId}::bigint
        AND a.expediente_id = ${expedienteId}::bigint
        AND a.metadata->>'tipoDocumental' = 'TRANSFERENCIA'
        AND a.metadata->>'documentoBaseId' = ${String(documentoBaseId)}
        AND a.metadata->>'grupoFacturaId' = ${String(grupoFacturaId)}
        AND a.metadata->>'tipoRelacion' = 'adjunto_transferencia'
        AND COALESCE(a.estado, '') NOT IN ('anulado', 'duplicado_absorbido')
        AND NOT EXISTS (
          SELECT 1
          FROM documentos.ocr_resultados o_resuelto
          WHERE o_resuelto.documento_id = d.id
            AND o_resuelto.archivo_id = a.id
            AND o_resuelto.metadata #>> '{validacionPendientePago,estado}' = 'CONSUMIDO'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM documentos.grupo_factura_documentos gfd
          WHERE gfd.documento_id = d.id
            AND gfd.grupo_factura_id = ${grupoFacturaId}::bigint
            AND gfd.tipo_relacion = 'adjunto_transferencia'
            AND gfd.estado = 'activo'
        )
      GROUP BY
        d.id,
        a.id,
        a.nombre_archivo,
        a.metadata,
        a.estado
      ORDER BY d.id, a.id
    `;

    if (candidatos.length === 0) {
      return {
        existe: false,
        upload: null,
        ocr: null,
      };
    }

    if (candidatos.length > 1) {
      throw new ConflictException({
        message: 'Existe más de un upload pendiente compatible con la Orden de Pago',
        code: 'ORDEN_PAGO_UPLOAD_PENDIENTE_AMBIGUO',
        details: {
          ordenPagoId,
          cantidad: candidatos.length,
        },
      });
    }

    const candidato = candidatos[0];
    const ocrResultados = Array.isArray(candidato.ocrResultados)
      ? candidato.ocrResultados
      : [];

    if (ocrResultados.length > 1) {
      throw new ConflictException({
        message: 'El upload pendiente tiene más de un resultado OCR asociado',
        code: 'ORDEN_PAGO_UPLOAD_OCR_AMBIGUO',
        details: {
          ordenPagoId,
          documentoId: Number(candidato.documentoId),
          archivoId: Number(candidato.archivoId),
          cantidad: ocrResultados.length,
        },
      });
    }

    const ocr = ocrResultados[0] ?? null;

    return {
      existe: true,
      upload: {
        documentoId: Number(candidato.documentoId),
        archivoId: Number(candidato.archivoId),
        nombreArchivo: candidato.nombreArchivo ?? null,
        contentType: candidato.contentType ?? null,
        estadoArchivo: candidato.estadoArchivo ?? null,
        puedePrevisualizar: true,
      },
      ocr: ocr
        ? {
            ocrResultadoId: Number(ocr.ocrResultadoId),
            estado: ocr.estado ?? null,
            puedeRevisar: ['pendiente_validacion', 'editado'].includes(
              String(ocr.estado ?? ''),
            ),
            validacionPendientePago:
              ocr.validacionPendientePago &&
              typeof ocr.validacionPendientePago === 'object'
                ? ocr.validacionPendientePago
                : null,
          }
        : null,
    };
  }

  async obtenerDetalle(ordenPagoId: number, actor: OrdenPagoActor) {
    validarActorOp(actor);
    return this.obtenerDetalleScoped(ordenPagoId, actor);
  }

  async obtenerDetalleRevisionContable(
    ordenPagoId: number,
    actor: OrdenPagoActor,
  ) {
    validarActorOpLecturaScoped(actor);
    return this.obtenerDetalleScoped(ordenPagoId, actor);
  }

  private async obtenerDetalleScoped(
    ordenPagoId: number,
    actor: OrdenPagoActor,
  ) {
    if (!Number.isSafeInteger(ordenPagoId) || ordenPagoId <= 0) throw new NotFoundException('Orden de Pago no disponible');
    const [row] = await sql`
      SELECT p.id AS "ordenPagoId", d.id AS "documentoId", g.id AS "grupoFacturaId",
        c.id AS "contenedorOperativoId", c.expediente_v1_id AS "expedienteId",
        c.empresa_codigo AS "empresaCodigo",
        d.numero AS "numeroDocumental",
        d.fecha_emision::text AS "fechaEmision",
        d.monto_total::text AS monto, d.moneda, d.estado,
        d.metadata->'ordenPago'->>'tipo' AS tipo,
        d.metadata->'ordenPago'->>'subtipo' AS subtipo,
        os.grupo_factura_id IS NOT NULL AS "tieneSnapshot",
        co.codigo AS "conceptoCodigo",
        co.nombre AS "conceptoNombre",
        os.requiere_regularizacion_aplicada AS "requiereRegularizacion",
        os.estado_regularizacion AS "estadoRegularizacion",
        os.periodo_anio AS "periodoAnio",
        os.periodo_mes AS "periodoMes",
        os.codigo_pago AS "codigoPago",
        os.tipo_beneficiario_aplicado AS "tipoBeneficiario",
        os.uso_beneficiario_aplicado AS "usoBeneficiario",
        p.proveedor_id AS "proveedorId",
        prov.ruc AS "proveedorRuc",
        prov.razon_social AS "proveedorRazonSocial",
        p.beneficiario_cliente_destino_id AS "beneficiarioClienteDestinoId",
        p.beneficiario_usuario_id AS "beneficiarioUsuarioId",
        p.beneficiario_nombre_libre AS "beneficiarioNombreLibre",
        d.metadata->'ordenPago'->>'observacion' AS observacion,
        json_build_object('codigo', c.codigo, 'nombre', c.nombre,
          'centroCostoCodigo', c.centro_costo_codigo) AS contexto,
        CASE WHEN a.id IS NULL THEN NULL ELSE json_build_object(
          'archivoId', a.id, 'nombreArchivo', a.nombre_archivo,
          'mime', a.metadata->>'contentType', 'tamanoBytes', (a.metadata->>'tamanoBytes')::bigint,
          'hashSha256', a.hash_sha256, 'storageKey', a.storage_key
        ) END AS "archivoInicial"
      FROM documentos.documentos_operativos_principales p
      JOIN documentos.documentos d ON d.id=p.documento_id AND d.tipo_documental='ORDEN_PAGO'
      JOIN documentos.contenedores_operativos c ON c.id=p.contenedor_operativo_id
      JOIN documentos.grupos_factura g ON g.documento_operativo_principal_id=p.id
        AND g.origen_obligacion='ORDEN_PAGO'
      LEFT JOIN documentos.obligaciones_snapshot os
        ON os.grupo_factura_id=g.id
      LEFT JOIN documentos.catalogo_conceptos_obligacion co
        ON co.id=os.concepto_id
      LEFT JOIN core.proveedores prov
        ON prov.id=p.proveedor_id
      LEFT JOIN documentos.documentos_archivos a ON a.documento_id=d.id
        AND a.origen_archivo='OP_INICIAL' AND a.es_version_actual=true
      WHERE p.id=${ordenPagoId} AND p.tipo_principal='ORDEN_PAGO'
        AND p.estado='activo' AND p.es_principal_activo=true AND c.estado='activo'
        AND c.empresa_codigo=${actor.empresaCodigo}
        AND c.cliente_destino_id IS NOT DISTINCT FROM ${actor.clienteDestinoId}::bigint
    `;
    if (!row) throw new NotFoundException('Orden de Pago no disponible');
    if (row.tieneSnapshot && (!row.conceptoCodigo || !row.conceptoNombre)) {
      throw new ConflictException('OBLIGACION_SNAPSHOT_INCONSISTENTE');
    }

    const conceptoCodigo = row.tieneSnapshot
      ? String(row.conceptoCodigo)
      : null;

    const conceptoNombre = row.tieneSnapshot
      ? String(row.conceptoNombre)
      : null;

    const tipo = row.tieneSnapshot ? null : row.tipo;
    const subtipo = row.tieneSnapshot ? null : row.subtipo;
    const tiposDocumentalesRegularizadoresPermitidos = row.tieneSnapshot
      ? await this.regularizadoresObligacion.listarCongeladosPorGrupoFacturaId(
          Number(row.grupoFacturaId),
        )
      : [];

    return {
      ...row,
      ordenPagoId: Number(row.ordenPagoId),
      documentoId: Number(row.documentoId),
      grupoFacturaId: Number(row.grupoFacturaId),
      contenedorOperativoId: Number(row.contenedorOperativoId),
      expedienteId: row.expedienteId == null ? null : Number(row.expedienteId),
      empresaCodigo: row.empresaCodigo == null ? null : String(row.empresaCodigo),
      numero:
        row.numeroDocumental != null && String(row.numeroDocumental).trim()
          ? String(row.numeroDocumental)
          : `OP-${row.ordenPagoId}`,
      conceptoCodigo,
      conceptoNombre,
      tiposDocumentalesRegularizadoresPermitidos,
      tipo,
      subtipo,
    };
  }

  async confirmarPago(
    ordenPagoId: number,
    body: unknown,
    actor: OrdenPagoActor,
  ) {
    validarActorOp(actor);

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Body de confirmación de pago inválido');
    }

    const input = body as Record<string, unknown>;
    const permitidos = new Set([
      'ocrResultadoId',
      'metadata',
      'observacion',
      'decisionCorrespondencia',
    ]);
    const noPermitidos = Object.keys(input).filter(key => !permitidos.has(key));
    if (noPermitidos.length) {
      throw new BadRequestException(
        `Campos no permitidos en confirmación de pago OP: ${noPermitidos.join(', ')}`,
      );
    }

    const ocrResultadoId = Number(input.ocrResultadoId);
    if (!Number.isSafeInteger(ocrResultadoId) || ocrResultadoId <= 0) {
      throw new BadRequestException('ocrResultadoId inválido');
    }

    if (
      input.metadata !== undefined &&
      (input.metadata === null ||
        typeof input.metadata !== 'object' ||
        Array.isArray(input.metadata))
    ) {
      throw new BadRequestException('metadata inválida');
    }

    if (
      input.observacion !== undefined &&
      typeof input.observacion !== 'string'
    ) {
      throw new BadRequestException('observacion inválida');
    }

    let decisionCorrespondencia:
      | {
          accion: 'ACEPTAR' | 'OBSERVAR' | 'AUTORIZAR_EXCEPCION';
          motivo?: string | null;
        }
      | undefined;

    if (input.decisionCorrespondencia !== undefined) {
      if (
        !input.decisionCorrespondencia ||
        typeof input.decisionCorrespondencia !== 'object' ||
        Array.isArray(input.decisionCorrespondencia)
      ) {
        throw new BadRequestException('decisionCorrespondencia inválida');
      }

      const decision = input.decisionCorrespondencia as Record<string, unknown>;
      const decisionKeys = Object.keys(decision);
      if (
        decisionKeys.some(key => !['accion', 'motivo'].includes(key)) ||
        !['ACEPTAR', 'OBSERVAR', 'AUTORIZAR_EXCEPCION'].includes(
          String(decision.accion ?? ''),
        ) ||
        (decision.motivo !== undefined &&
          decision.motivo !== null &&
          typeof decision.motivo !== 'string')
      ) {
        throw new BadRequestException('decisionCorrespondencia inválida');
      }

      decisionCorrespondencia = {
        accion: decision.accion as
          | 'ACEPTAR'
          | 'OBSERVAR'
          | 'AUTORIZAR_EXCEPCION',
        motivo:
          decision.motivo === undefined
            ? undefined
            : (decision.motivo as string | null),
      };
    }

    const detalle = await this.obtenerDetalle(ordenPagoId, actor);
    const expedienteId = Number(detalle.expedienteId);

    if (!Number.isSafeInteger(expedienteId) || expedienteId <= 0) {
      throw new ConflictException('ORDEN_PAGO_SIN_EXPEDIENTE_COMPATIBLE');
    }

    return this.confirmacionDocumental.confirmarOcrResultadoConExpediente(
      ocrResultadoId,
      {
        expedienteId,
        documentoBaseId: detalle.documentoId,
        grupoFacturaId: detalle.grupoFacturaId,
        origenObligacion: 'ORDEN_PAGO',
        metadata: input.metadata as Record<string, any> | undefined,
        observacion: input.observacion as string | undefined,
        decisionCorrespondencia,
      },
      {
        usuarioId: actor.id,
        requestId: actor.requestId ?? null,
        correlationId: actor.correlationId ?? actor.requestId ?? null,
      },
    );
  }

  async opciones(actor: OrdenPagoActor) {
    validarActorOp(actor);
    const contextos = await sql`
      SELECT id, codigo, nombre, centro_costo_codigo AS "centroCostoCodigo"
      FROM documentos.contenedores_operativos
      WHERE estado = 'activo' AND empresa_codigo = ${actor.empresaCodigo}
        AND cliente_destino_id IS NOT DISTINCT FROM ${actor.clienteDestinoId}::bigint
      ORDER BY codigo, id
    `;
    const monedas = await sql`SELECT codigo, nombre FROM core.monedas
      WHERE activo = true AND codigo IN ('PEN', 'USD') ORDER BY orden, codigo`;
    const conceptosDisponibles =
      await this.catalogoConceptos.listarRepresentablesParaOrdenPago(sql);
    const conceptos = conceptosDisponibles.map(({
      codigo,
      nombre,
      clasificacion,
      usoCodigoPago,
      tipoBeneficiario,
      usoBeneficiario,
      modoSeleccionBeneficiario,
    }) => ({
      codigo,
      nombre,
      clasificacion,
      usoCodigoPago,
      tipoBeneficiario,
      usoBeneficiario,
      modoSeleccionBeneficiario,
    }));
    return { contextos, monedas, conceptos };
  }

  async beneficiariosElegibles(
    actor: OrdenPagoActor,
    query: { contenedorOperativoId?: string; conceptoCodigo?: string },
  ) {
    validarActorOp(actor);

    const contenedorOperativoId = Number(query.contenedorOperativoId);
    const conceptoCodigo = String(query.conceptoCodigo ?? '').trim();

    if (!Number.isSafeInteger(contenedorOperativoId) || contenedorOperativoId <= 0) {
      throw new BadRequestException('Contexto requerido');
    }
    if (!conceptoCodigo) {
      throw new BadRequestException('Concepto OP requerido');
    }

    const [contexto] = await sql`
      SELECT id, cliente_destino_id AS "clienteDestinoId"
      FROM documentos.contenedores_operativos
      WHERE id = ${contenedorOperativoId}
        AND estado = 'activo'
        AND empresa_codigo = ${actor.empresaCodigo}
        AND cliente_destino_id IS NOT DISTINCT FROM ${actor.clienteDestinoId}::bigint
      LIMIT 1
    `;
    if (!contexto) throw new BadRequestException('Contexto no habilitado');

    const concepto = await this.catalogoConceptos.buscarPorCodigo(
      conceptoCodigo,
      sql,
    );
    if (!concepto) throw new BadRequestException('Concepto OP no habilitado');

    const base = {
      tipoBeneficiario: concepto.tipoBeneficiario,
      usoBeneficiario: concepto.usoBeneficiario,
      items: [] as Array<Record<string, unknown>>,
    };

    if (concepto.tipoBeneficiario === 'NO_APLICA') return base;

    if (concepto.tipoBeneficiario === 'NOMBRE_LIBRE') return base;

    if (concepto.tipoBeneficiario === 'PROVEEDOR') {
      if (concepto.modoSeleccionBeneficiario === 'AUTOCOMPLETE') {
        return base;
      }

      if (concepto.modoSeleccionBeneficiario !== 'CONFIGURADO') {
        throw new ConflictException('MODO_SELECCION_BENEFICIARIO_INVALIDO');
      }

      const configurados = await this.configProveedores.listarActivos(
        concepto.id,
        contenedorOperativoId,
        sql,
      );
      return {
        ...base,
        items: configurados.map(p => ({
          id: p.proveedorId,
          nombre: p.razonSocial,
          detalle: p.ruc,
        })),
      };
    }

    if (concepto.tipoBeneficiario === 'USUARIO') {
      const configurados = await this.configRendicion.listarActivos(
        contenedorOperativoId,
        sql,
      );
      const ids = configurados.map(u => u.usuarioId);
      if (ids.length === 0) return base;

      const usuarios = await sql`
        SELECT
          id,
          trim(concat_ws(' ', nombres, apellidos)) AS nombre,
          email
        FROM auth.usuarios
        WHERE estado = 'activo'
          AND id = ANY(${ids}::int[])
        ORDER BY nombres, apellidos, id
      `;
      return {
        ...base,
        items: usuarios.map(u => ({
          id: Number(u.id),
          nombre: String(u.nombre),
          detalle: String(u.email),
        })),
      };
    }

    if (concepto.tipoBeneficiario === 'CLIENTE_DESTINO') {
      const clienteDestinoContextoId =
        contexto.clienteDestinoId == null ? null : Number(contexto.clienteDestinoId);

      const clientes = await sql`
        SELECT id, nombre_oficial AS nombre, abreviatura, ruc
        FROM core.clientes_destino
        WHERE estado = true
          AND (
            ${clienteDestinoContextoId}::int IS NULL
            OR id <> ${clienteDestinoContextoId}::int
          )
        ORDER BY abreviatura, nombre_oficial, id
      `;
      return {
        ...base,
        items: clientes.map(c => ({
          id: Number(c.id),
          nombre: String(c.nombre ?? c.abreviatura ?? `Cliente ${c.id}`),
          detalle: [c.abreviatura, c.ruc].filter(Boolean).join(' · ') || null,
        })),
      };
    }

    throw new ConflictException('REGLA_TIPO_BENEFICIARIO_INVALIDA');
  }

  private validarReferenciaConcepto(
    usoCodigoPago: string,
    codigoPago: string | null,
  ): void {
    if (usoCodigoPago === 'REQUERIDO' && !codigoPago) {
      throw new BadRequestException('REFERENCIA_FUNCIONAL_REQUERIDA');
    }

    if (usoCodigoPago === 'NO_APLICA' && codigoPago) {
      throw new BadRequestException('REFERENCIA_FUNCIONAL_NO_APLICA');
    }

    if (!['NO_APLICA', 'OPCIONAL', 'REQUERIDO'].includes(usoCodigoPago)) {
      throw new ConflictException('REGLA_REFERENCIA_FUNCIONAL_INVALIDA');
    }
  }

  private async resolverBeneficiarioConcepto(
    concepto: {
      id: number;
      tipoBeneficiario: string;
      usoBeneficiario: string;
      modoSeleccionBeneficiario: string;
    },
    input: {
      contenedorOperativoId: number;
      proveedorId: number | null;
      beneficiarioClienteDestinoId: number | null;
      beneficiarioUsuarioId: number | null;
      beneficiarioNombreLibre: string | null;
    },
    clienteDestinoContextoId: number | null,
    tx: SqlExecutor,
  ): Promise<{
    proveedorId: number | null;
    beneficiarioClienteDestinoId: number | null;
    beneficiarioUsuarioId: number | null;
    beneficiarioNombreLibre: string | null;
  }> {
    const vacio = {
      proveedorId: null,
      beneficiarioClienteDestinoId: null,
      beneficiarioUsuarioId: null,
      beneficiarioNombreLibre: null,
    };

    const seleccionados = [
      input.proveedorId,
      input.beneficiarioClienteDestinoId,
      input.beneficiarioUsuarioId,
      input.beneficiarioNombreLibre,
    ].filter(valor => valor != null).length;

    if (!['NO_APLICA', 'OPCIONAL', 'REQUERIDO'].includes(concepto.usoBeneficiario)) {
      throw new ConflictException('REGLA_USO_BENEFICIARIO_INVALIDA');
    }

    if (![
      'NO_APLICA',
      'PROVEEDOR',
      'CLIENTE_DESTINO',
      'USUARIO',
      'NOMBRE_LIBRE',
    ].includes(concepto.tipoBeneficiario)) {
      throw new ConflictException('REGLA_TIPO_BENEFICIARIO_INVALIDA');
    }

    if (
      (concepto.tipoBeneficiario === 'NO_APLICA') !==
      (concepto.usoBeneficiario === 'NO_APLICA')
    ) {
      throw new ConflictException('REGLA_BENEFICIARIO_INCONSISTENTE');
    }

    if (concepto.usoBeneficiario === 'NO_APLICA') {
      if (seleccionados !== 0) {
        throw new BadRequestException('BENEFICIARIO_NO_APLICA');
      }
      return vacio;
    }

    if (seleccionados > 1) {
      throw new BadRequestException('BENEFICIARIO_INVALIDO');
    }

    if (concepto.tipoBeneficiario === 'PROVEEDOR') {
      if (
        input.beneficiarioClienteDestinoId != null ||
        input.beneficiarioUsuarioId != null ||
        input.beneficiarioNombreLibre != null
      ) {
        throw new BadRequestException('BENEFICIARIO_TIPO_NO_CORRESPONDE');
      }

      if (input.proveedorId == null && concepto.usoBeneficiario === 'OPCIONAL') {
        return vacio;
      }

      if (concepto.modoSeleccionBeneficiario === 'AUTOCOMPLETE') {
        if (input.proveedorId == null) {
          throw new BadRequestException('BENEFICIARIO_PROVEEDOR_SELECCION_REQUERIDA');
        }

        const rows = await tx`
          SELECT id
          FROM core.proveedores
          WHERE id = ${input.proveedorId}::integer
          LIMIT 1
        `;

        if (!rows[0]) {
          throw new BadRequestException('PROVEEDOR_NO_EXISTE_EN_CATALOGO');
        }

        return { ...vacio, proveedorId: input.proveedorId };
      }

      if (concepto.modoSeleccionBeneficiario !== 'CONFIGURADO') {
        throw new ConflictException('MODO_SELECCION_BENEFICIARIO_INVALIDO');
      }

      const configurados = await this.configProveedores.listarActivos(
        concepto.id,
        input.contenedorOperativoId,
        tx,
      );

      if (configurados.length === 0) {
        throw new ConflictException('CONCEPTO_SIN_PROVEEDOR_CONFIGURADO');
      }

      if (input.proveedorId != null) {
        if (!configurados.some(p => p.proveedorId === input.proveedorId)) {
          throw new BadRequestException('PROVEEDOR_NO_HABILITADO_PARA_CONCEPTO');
        }
        return { ...vacio, proveedorId: input.proveedorId };
      }

      if (configurados.length === 1) {
        return { ...vacio, proveedorId: configurados[0].proveedorId };
      }

      throw new BadRequestException('BENEFICIARIO_PROVEEDOR_SELECCION_REQUERIDA');
    }

    if (concepto.tipoBeneficiario === 'CLIENTE_DESTINO') {
      if (
        input.proveedorId != null ||
        input.beneficiarioUsuarioId != null ||
        input.beneficiarioNombreLibre != null
      ) {
        throw new BadRequestException('BENEFICIARIO_TIPO_NO_CORRESPONDE');
      }

      if (input.beneficiarioClienteDestinoId == null) {
        if (concepto.usoBeneficiario === 'OPCIONAL') {
          return vacio;
        }
        throw new BadRequestException('BENEFICIARIO_CLIENTE_DESTINO_REQUERIDO');
      }

      if (
        clienteDestinoContextoId != null &&
        input.beneficiarioClienteDestinoId === clienteDestinoContextoId
      ) {
        throw new BadRequestException('BENEFICIARIO_CLIENTE_DESTINO_ES_CONTEXTO_ACTUAL');
      }

      const rows = await tx`
        SELECT 1
        FROM core.clientes_destino
        WHERE id = ${input.beneficiarioClienteDestinoId}
          AND estado = true
        LIMIT 1
      `;

      if (rows.length === 0) {
        throw new BadRequestException('BENEFICIARIO_CLIENTE_DESTINO_NO_HABILITADO');
      }

      return {
        ...vacio,
        beneficiarioClienteDestinoId: input.beneficiarioClienteDestinoId,
      };
    }

    if (concepto.tipoBeneficiario === 'USUARIO') {
      if (
        input.proveedorId != null ||
        input.beneficiarioClienteDestinoId != null ||
        input.beneficiarioNombreLibre != null
      ) {
        throw new BadRequestException('BENEFICIARIO_TIPO_NO_CORRESPONDE');
      }

      if (input.beneficiarioUsuarioId == null && concepto.usoBeneficiario === 'OPCIONAL') {
        return vacio;
      }

      const configurados = await this.configRendicion.listarActivos(
        input.contenedorOperativoId,
        tx,
      );

      if (configurados.length === 0) {
        throw new ConflictException('RENDICION_SIN_USUARIO_CONFIGURADO');
      }

      if (input.beneficiarioUsuarioId != null) {
        if (!configurados.some(u => u.usuarioId === input.beneficiarioUsuarioId)) {
          throw new BadRequestException('BENEFICIARIO_USUARIO_NO_HABILITADO');
        }
        return { ...vacio, beneficiarioUsuarioId: input.beneficiarioUsuarioId };
      }

      if (configurados.length === 1) {
        return { ...vacio, beneficiarioUsuarioId: configurados[0].usuarioId };
      }

      throw new BadRequestException('BENEFICIARIO_USUARIO_SELECCION_REQUERIDA');
    }

    if (concepto.tipoBeneficiario === 'NOMBRE_LIBRE') {
      if (
        input.proveedorId != null ||
        input.beneficiarioClienteDestinoId != null ||
        input.beneficiarioUsuarioId != null
      ) {
        throw new BadRequestException('BENEFICIARIO_TIPO_NO_CORRESPONDE');
      }

      if (!input.beneficiarioNombreLibre) {
        if (concepto.usoBeneficiario === 'OPCIONAL') {
          return vacio;
        }
        throw new BadRequestException('BENEFICIARIO_NOMBRE_LIBRE_REQUERIDO');
      }

      return {
        ...vacio,
        beneficiarioNombreLibre: input.beneficiarioNombreLibre,
      };
    }

    throw new ConflictException('REGLA_BENEFICIARIO_INCONSISTENTE');
  }

  async editar(
    ordenPagoId: number,
    body: unknown,
    actor: OrdenPagoActor,
    executor?: SqlExecutor,
  ) {
    validarActorOp(actor);

    if (!Number.isSafeInteger(ordenPagoId) || ordenPagoId <= 0) {
      throw new NotFoundException('Orden de Pago no disponible');
    }

    const input = validarEdicionOrdenPago(body);

    const earlyFields: Array<keyof EditarOrdenPagoInput> = [
      'periodoAnio',
      'periodoMes',
      'codigoPago',
      'conceptoCodigo',
      'proveedorId',
      'beneficiarioClienteDestinoId',
      'beneficiarioUsuarioId',
      'beneficiarioNombreLibre',
    ];

    const requiereEdicionTemprana = earlyFields.some(
      campo => Object.prototype.hasOwnProperty.call(input, campo),
    );

    const edit = async (tx: SqlExecutor) => {
      const rows = await tx`
        SELECT
          p.id AS "ordenPagoId",
          p.documento_id AS "documentoId",
          p.contenedor_operativo_id AS "contenedorOperativoId",
          p.proveedor_id AS "proveedorId",
          p.beneficiario_cliente_destino_id AS "beneficiarioClienteDestinoId",
          p.beneficiario_usuario_id AS "beneficiarioUsuarioId",
          p.beneficiario_nombre_libre AS "beneficiarioNombreLibre",
          g.id AS "grupoFacturaId",
          g.origen_obligacion AS "origenObligacion",
          g.factura_documento_id AS "facturaDocumentoId",
          c.empresa_codigo AS "empresaCodigo",
          c.cliente_destino_id AS "clienteDestinoId",
          d.fecha_emision::text AS "fechaEmision",
          d.monto_total::text AS monto,
          d.moneda,
          d.metadata->'ordenPago'->>'observacion' AS observacion,
          os.concepto_id AS "conceptoId",
          co.codigo AS "conceptoCodigo",
          os.requiere_regularizacion_aplicada AS "requiereRegularizacionAplicada",
          os.estado_regularizacion AS "estadoRegularizacion",
          os.periodo_anio AS "periodoAnio",
          os.periodo_mes AS "periodoMes",
          os.codigo_pago AS "codigoPago",
          os.tipo_beneficiario_aplicado AS "tipoBeneficiarioAplicado",
          os.uso_beneficiario_aplicado AS "usoBeneficiarioAplicado"
        FROM documentos.documentos_operativos_principales p
        JOIN documentos.documentos d
          ON d.id = p.documento_id
         AND d.tipo_documental = 'ORDEN_PAGO'
        JOIN documentos.contenedores_operativos c
          ON c.id = p.contenedor_operativo_id
        JOIN documentos.grupos_factura g
          ON g.documento_operativo_principal_id = p.id
         AND g.origen_obligacion = 'ORDEN_PAGO'
        JOIN documentos.obligaciones_snapshot os
          ON os.grupo_factura_id = g.id
        LEFT JOIN documentos.catalogo_conceptos_obligacion co
          ON co.id = os.concepto_id
        WHERE p.id = ${ordenPagoId}
          AND p.tipo_principal = 'ORDEN_PAGO'
          AND p.estado = 'activo'
          AND p.es_principal_activo = true
          AND c.estado = 'activo'
          AND c.empresa_codigo = ${actor.empresaCodigo}
          AND c.cliente_destino_id IS NOT DISTINCT FROM ${actor.clienteDestinoId}::bigint
        FOR UPDATE OF p, d, g, os
      `;

      const actual = rows[0];

      if (!actual) {
        throw new NotFoundException('Orden de Pago no disponible');
      }

      if (
        actual.origenObligacion !== 'ORDEN_PAGO' ||
        actual.facturaDocumentoId != null
      ) {
        throw new ConflictException('OP_ESTRUCTURA_NO_EDITABLE');
      }

      if (!actual.conceptoId || !actual.conceptoCodigo) {
        throw new ConflictException('OBLIGACION_SNAPSHOT_INCONSISTENTE');
      }

      if (requiereEdicionTemprana) {
        if (String(actual.estadoRegularizacion) === 'REGULARIZADO') {
          throw new ConflictException('OP_REGULARIZADA_NO_PERMITE_EDICION_TEMPRANA');
        }

        const asociaciones = await tx`
          SELECT id, tipo_relacion
          FROM documentos.grupo_factura_documentos
          WHERE grupo_factura_id = ${Number(actual.grupoFacturaId)}::bigint
            AND estado = 'activo'
            AND tipo_relacion IN (
              'adjunto_guia',
              'adjunto_nota_ingreso',
              'adjunto_transferencia',
              'adjunto_detraccion',
              'regularizador_factura'
            )
          LIMIT 1
        `;

        if (asociaciones.length > 0) {
          throw new ConflictException('OP_FUERA_DE_VENTANA_EDICION_TEMPRANA');
        }
      }

      if (input.moneda !== undefined) {
        const monedas = await tx`
          SELECT codigo
          FROM core.monedas
          WHERE codigo = ${input.moneda}
            AND activo = true
        `;
        if (!monedas.length) {
          throw new ConflictException('Moneda no disponible');
        }
      }

      const fechaEmision = input.fechaEmision ?? String(actual.fechaEmision);
      const monto = input.monto ?? String(actual.monto);
      const moneda = input.moneda ?? String(actual.moneda);
      const observacion =
        input.observacion !== undefined
          ? input.observacion
          : actual.observacion == null
            ? null
            : String(actual.observacion);

      let conceptoId = Number(actual.conceptoId);
      let conceptoCodigo = String(actual.conceptoCodigo);
      let requiereRegularizacion =
        Boolean(actual.requiereRegularizacionAplicada);
      let estadoRegularizacion = String(actual.estadoRegularizacion) as
        'NO_REQUIERE' | 'PENDIENTE' | 'REGULARIZADO';
      let tipoBeneficiarioAplicado =
        actual.tipoBeneficiarioAplicado == null
          ? null
          : String(actual.tipoBeneficiarioAplicado);
      let usoBeneficiarioAplicado =
        actual.usoBeneficiarioAplicado == null
          ? null
          : String(actual.usoBeneficiarioAplicado);

      const periodoAnio =
        input.periodoAnio !== undefined
          ? input.periodoAnio
          : actual.periodoAnio == null
            ? null
            : Number(actual.periodoAnio);

      const periodoMes =
        input.periodoMes !== undefined
          ? input.periodoMes
          : actual.periodoMes == null
            ? null
            : Number(actual.periodoMes);

      if ((periodoAnio == null) !== (periodoMes == null)) {
        throw new BadRequestException('Período incompleto');
      }

      const codigoPago =
        input.codigoPago !== undefined
          ? input.codigoPago
          : actual.codigoPago == null
            ? null
            : String(actual.codigoPago);

      let beneficiario = {
        proveedorId:
          actual.proveedorId == null ? null : Number(actual.proveedorId),
        beneficiarioClienteDestinoId:
          actual.beneficiarioClienteDestinoId == null
            ? null
            : Number(actual.beneficiarioClienteDestinoId),
        beneficiarioUsuarioId:
          actual.beneficiarioUsuarioId == null
            ? null
            : Number(actual.beneficiarioUsuarioId),
        beneficiarioNombreLibre:
          actual.beneficiarioNombreLibre == null
            ? null
            : String(actual.beneficiarioNombreLibre),
      };

      let tiposRegularizadores: string[] | null = null;
      const cambiaConcepto =
        input.conceptoCodigo !== undefined &&
        input.conceptoCodigo !== conceptoCodigo;

      const tocaBeneficiario = [
        'proveedorId',
        'beneficiarioClienteDestinoId',
        'beneficiarioUsuarioId',
        'beneficiarioNombreLibre',
      ].some(campo => Object.prototype.hasOwnProperty.call(input, campo));

      const tocaCodigoPago =
        Object.prototype.hasOwnProperty.call(input, 'codigoPago');

      /*
       * El período por sí solo no reinterpreta la semántica histórica.
       * Concepto, referencia funcional y beneficiario sólo se resuelven
       * cuando el usuario modifica alguno de esos elementos.
       */
      if (cambiaConcepto || tocaBeneficiario || tocaCodigoPago) {
        const concepto = await this.catalogoConceptos.buscarPorCodigo(
          input.conceptoCodigo ?? conceptoCodigo,
          tx,
        );

        if (!concepto) {
          throw new ConflictException('CONCEPTO_OBLIGACION_NO_RESUELTO');
        }

        if (!concepto.activo) {
          throw new ConflictException('CONCEPTO_OBLIGACION_INACTIVO');
        }

        /*
         * La referencia funcional depende de la regla canónica del concepto.
         * Se valida tanto al cambiar concepto como al editar codigoPago.
         */
        if (cambiaConcepto || tocaCodigoPago) {
          this.validarReferenciaConcepto(
            concepto.usoCodigoPago,
            codigoPago,
          );
        }

        /*
         * Un cambio de concepto o una edición explícita de beneficiario
         * obliga a resolver nuevamente el beneficiario.
         *
         * Si el usuario toca cualquier campo de beneficiario, la selección
         * es atómica: los tipos no enviados quedan NULL. Así no se arrastra
         * un beneficiario incompatible de la selección anterior.
         *
         * Al cambiar concepto también partimos de una selección vacía para
         * que las reglas canónicas puedan autoseleccionar cuando corresponda.
         */
        if (cambiaConcepto || tocaBeneficiario) {
          const beneficiarioSolicitado = {
            contenedorOperativoId: Number(actual.contenedorOperativoId),
            proveedorId:
              input.proveedorId !== undefined ? input.proveedorId : null,
            beneficiarioClienteDestinoId:
              input.beneficiarioClienteDestinoId !== undefined
                ? input.beneficiarioClienteDestinoId
                : null,
            beneficiarioUsuarioId:
              input.beneficiarioUsuarioId !== undefined
                ? input.beneficiarioUsuarioId
                : null,
            beneficiarioNombreLibre:
              input.beneficiarioNombreLibre !== undefined
                ? input.beneficiarioNombreLibre
                : null,
          };

          beneficiario = await this.resolverBeneficiarioConcepto(
            concepto,
            beneficiarioSolicitado,
            actual.clienteDestinoId == null
              ? null
              : Number(actual.clienteDestinoId),
            tx,
          );
        }

        /*
         * Sólo cambiar el concepto reconstruye la semántica congelada de
         * la obligación. Período, referencia o beneficiario no deben
         * recalcular estado de regularización ni regularizadores.
         */
        if (cambiaConcepto) {
          conceptoId = concepto.id;
          conceptoCodigo = String(concepto.codigo);

          tiposRegularizadores =
            await this.regularizadoresObligacion.listarConfiguradosActivosPorConcepto(
              concepto.id,
              tx,
            );

          if (
            concepto.requiereRegularizacion &&
            tiposRegularizadores.length === 0
          ) {
            throw new ConflictException(
              'CONCEPTO_OBLIGACION_SIN_REGULARIZADOR_CONFIGURADO',
            );
          }

          requiereRegularizacion = concepto.requiereRegularizacion;
          estadoRegularizacion =
            concepto.requiereRegularizacion ? 'PENDIENTE' : 'NO_REQUIERE';
          tipoBeneficiarioAplicado = concepto.tipoBeneficiario;
          usoBeneficiarioAplicado = concepto.usoBeneficiario;
        }
      }

      const antes = {
        fechaEmision: String(actual.fechaEmision),
        monto: String(actual.monto),
        moneda: String(actual.moneda),
        observacion:
          actual.observacion == null ? null : String(actual.observacion),
        conceptoCodigo: String(actual.conceptoCodigo),
        periodoAnio:
          actual.periodoAnio == null ? null : Number(actual.periodoAnio),
        periodoMes:
          actual.periodoMes == null ? null : Number(actual.periodoMes),
        codigoPago:
          actual.codigoPago == null ? null : String(actual.codigoPago),
        proveedorId:
          actual.proveedorId == null ? null : Number(actual.proveedorId),
        beneficiarioClienteDestinoId:
          actual.beneficiarioClienteDestinoId == null
            ? null
            : Number(actual.beneficiarioClienteDestinoId),
        beneficiarioUsuarioId:
          actual.beneficiarioUsuarioId == null
            ? null
            : Number(actual.beneficiarioUsuarioId),
        beneficiarioNombreLibre:
          actual.beneficiarioNombreLibre == null
            ? null
            : String(actual.beneficiarioNombreLibre),
        estadoRegularizacion: String(actual.estadoRegularizacion),
      };

      await tx`
        UPDATE documentos.documentos
        SET fecha_emision = ${fechaEmision}::date,
            monto_total = ${monto}::numeric(14,2),
            moneda = ${moneda},
            metadata = jsonb_set(
              COALESCE(metadata, '{}'::jsonb),
              '{ordenPago,observacion}',
              ${JSON.stringify(observacion)}::jsonb,
              true
            )
        WHERE id = ${Number(actual.documentoId)}::bigint
      `;

      if (requiereEdicionTemprana) {
        await tx`
          UPDATE documentos.documentos_operativos_principales
          SET proveedor_id = ${beneficiario.proveedorId}::integer,
              beneficiario_cliente_destino_id =
                ${beneficiario.beneficiarioClienteDestinoId}::integer,
              beneficiario_usuario_id =
                ${beneficiario.beneficiarioUsuarioId}::integer,
              beneficiario_nombre_libre =
                ${beneficiario.beneficiarioNombreLibre}::text
          WHERE id = ${ordenPagoId}::bigint
        `;

        const snapshotActualizado =
          await this.obligacionesSnapshot.actualizarTemprano(
            {
              grupoFacturaId: Number(actual.grupoFacturaId),
              conceptoId,
              requiereRegularizacionAplicada: requiereRegularizacion,
              estadoRegularizacion,
              periodoAnio,
              periodoMes,
              codigoPago,
              tipoBeneficiarioAplicado,
              usoBeneficiarioAplicado,
            },
            tx,
          );

        if (!snapshotActualizado) {
          throw new ConflictException('OP_SNAPSHOT_NO_EDITABLE');
        }

        if (cambiaConcepto) {
          await this.regularizadoresObligacion.reemplazarCongeladosTemprano(
            Number(actual.grupoFacturaId),
            requiereRegularizacion ? (tiposRegularizadores ?? []) : [],
            tx,
          );
        }
      }

      const despues = {
        fechaEmision,
        monto,
        moneda,
        observacion,
        conceptoCodigo,
        periodoAnio,
        periodoMes,
        codigoPago,
        ...beneficiario,
        estadoRegularizacion,
      };

      const camposModificados = Object.keys(input);

      await this.auditoria.registrarEdicion(
        {
          accion: 'EDITAR_OP',
          entidad: 'documento_operativo_principal',
          entidadId: ordenPagoId,
          descripcion: 'Orden de Pago editada en Finanzas.',
          empresaCodigo: actor.empresaCodigo,
          usuario: { ...actor, origen: 'finanzas-op-editar' },
          antes: {
            ...antes,
            ordenPagoId,
            documentoId: Number(actual.documentoId),
            grupoFacturaId: Number(actual.grupoFacturaId),
          },
          despues: {
            ...despues,
            ordenPagoId,
            documentoId: Number(actual.documentoId),
            grupoFacturaId: Number(actual.grupoFacturaId),
            camposModificados,
          },
        },
        tx,
      );

      return {
        ordenPagoId,
        documentoId: Number(actual.documentoId),
        grupoFacturaId: Number(actual.grupoFacturaId),
        contenedorOperativoId: Number(actual.contenedorOperativoId),
        camposModificados,
      };
    };

    return executor ? edit(executor) : sql.begin(edit);
  }

  async crear(body: unknown, key: string, actor: OrdenPagoActor, executor?: SqlExecutor) {
    validarActorOp(actor);
    const input = validarOrdenPago(body, key);
    key = key.toLowerCase();
    const hash = createHash('sha256').update(JSON.stringify({ input, actorId: actor.id,
      workspaceId: actor.workspaceId, empresa: actor.empresaCodigo, cliente: actor.clienteDestinoId })).digest('hex');
    const create = async (tx: SqlExecutor) => {
      // Serializa reintentos, incluso simultáneos. La unicidad física es defensa adicional.
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
      const anteriores = await tx`
        SELECT p.id AS "ordenPagoId", p.documento_id AS "documentoId",
          p.contenedor_operativo_id AS "contenedorOperativoId", p.op_payload_hash,
          p.estado, g.id AS "grupoFacturaId"
        FROM documentos.documentos_operativos_principales p
        LEFT JOIN documentos.grupos_factura g ON g.documento_operativo_principal_id = p.id
        WHERE p.op_clave_creacion = ${key}::uuid
      `;
      if (anteriores.length) {
        const row = anteriores[0];
        if (row.op_payload_hash !== hash) throw new ConflictException('OP_IDEMPOTENCY_CONFLICT');
        if (anteriores.length !== 1 || !row.grupoFacturaId || row.estado !== 'activo') throw new ConflictException('OP_REQUIERE_REVISION');
        return { ordenPagoId: Number(row.ordenPagoId), documentoId: Number(row.documentoId),
          contenedorOperativoId: Number(row.contenedorOperativoId), grupoFacturaId: Number(row.grupoFacturaId),
          idempotente: true };
      }
      const contextos = await tx`
        SELECT * FROM documentos.contenedores_operativos
        WHERE id = ${input.contenedorOperativoId} AND estado = 'activo'
          AND empresa_codigo = ${actor.empresaCodigo}
          AND cliente_destino_id IS NOT DISTINCT FROM ${actor.clienteDestinoId}::bigint
        FOR SHARE
      `;
      if (!contextos.length) throw new NotFoundException('Contexto OP no disponible en este workspace');
      const monedas = await tx`SELECT codigo FROM core.monedas WHERE codigo = ${input.moneda} AND activo = true`;
      if (!monedas.length) throw new ConflictException('Moneda no disponible');
      const concepto = await this.catalogoConceptos.buscarPorCodigo(input.conceptoCodigo, tx);
      if (!concepto) throw new ConflictException('CONCEPTO_OBLIGACION_NO_RESUELTO');
      if (!concepto.activo) throw new ConflictException('CONCEPTO_OBLIGACION_INACTIVO');

      this.validarReferenciaConcepto(concepto.usoCodigoPago, input.codigoPago);

      const clienteDestinoContextoId =
        contextos[0].cliente_destino_id == null
          ? null
          : Number(contextos[0].cliente_destino_id);

      const beneficiario = await this.resolverBeneficiarioConcepto(
        concepto,
        input,
        clienteDestinoContextoId,
        tx,
      );

      const tiposRegularizadores =
        await this.regularizadoresObligacion.listarConfiguradosActivosPorConcepto(
          concepto.id,
          tx,
        );

      if (concepto.requiereRegularizacion && tiposRegularizadores.length === 0) {
        throw new ConflictException(
          'CONCEPTO_OBLIGACION_SIN_REGULARIZADOR_CONFIGURADO',
        );
      }

      const metadata = { ordenPago: { observacion: input.observacion },
        workspaceId: actor.workspaceId, empresaCodigo: actor.empresaCodigo, clienteDestinoId: actor.clienteDestinoId,
        origen: 'FINANZAS_OP_01A' };
      const docs = await tx`
        INSERT INTO documentos.documentos
          (cliente_abreviatura, tipo_documental, fecha_emision, monto_total, moneda,
           estado, clave_documental, metadata, validado_por, validado_en)
        VALUES (${actor.empresaCodigo}, 'ORDEN_PAGO', ${input.fechaEmision}::date,
          ${input.monto}::numeric(14,2), ${input.moneda}, 'confirmado', ${'OP|' + key},
          ${JSON.stringify(metadata)}::jsonb, ${actor.id}, now()) RETURNING id, creado_en
      `;
      const documentoId = Number(docs[0].id);
      const principales = await tx`
        INSERT INTO documentos.documentos_operativos_principales
          (contenedor_operativo_id, documento_id, tipo_principal, es_principal_activo,
           proveedor_id, beneficiario_cliente_destino_id, beneficiario_usuario_id,
           beneficiario_nombre_libre,
           estado, metadata, creado_por, op_clave_creacion, op_payload_hash)
        VALUES (${input.contenedorOperativoId}, ${documentoId}, 'ORDEN_PAGO', true,
          ${beneficiario.proveedorId}::integer,
          ${beneficiario.beneficiarioClienteDestinoId}::integer,
          ${beneficiario.beneficiarioUsuarioId}::integer,
          ${beneficiario.beneficiarioNombreLibre}::text,
          'activo', ${JSON.stringify(metadata)}::jsonb, ${actor.id}, ${key}::uuid, ${hash}) RETURNING id
      `;
      const ordenPagoId = Number(principales[0].id);
      const numeroDocumentalOp = String(ordenPagoId).padStart(10, '0');

      if (!/^\d{10}$/.test(numeroDocumentalOp)) {
        throw new ConflictException(
          'NUMERO_DOCUMENTAL_OP_FUERA_DE_RANGO',
        );
      }

      const numeroPersistidoRows = await tx`
        UPDATE documentos.documentos
        SET numero=${numeroDocumentalOp}
        WHERE id=${documentoId}
          AND tipo_documental='ORDEN_PAGO'
          AND numero IS NULL
        RETURNING numero
      `;

      if (
        numeroPersistidoRows.length !== 1 ||
        String(numeroPersistidoRows[0]?.numero ?? '') !== numeroDocumentalOp
      ) {
        throw new ConflictException(
          'NUMERO_DOCUMENTAL_OP_NO_PERSISTIDO',
        );
      }

      const grupos = await tx`
        INSERT INTO documentos.grupos_factura
          (documento_operativo_principal_id, factura_documento_id, origen_obligacion, estado, metadata, creado_por)
        VALUES (${ordenPagoId}, NULL, 'ORDEN_PAGO', 'pendiente_revision',
          ${JSON.stringify({ origen: 'FINANZAS_OP_01A', workspaceId: actor.workspaceId })}::jsonb, ${actor.id}) RETURNING id
      `;
      const grupoFacturaId = Number(grupos[0].id);
      await this.obligacionesSnapshot.crear({
        grupoFacturaId,
        conceptoId: concepto.id,
        requiereRegularizacionAplicada: concepto.requiereRegularizacion,
        estadoRegularizacion: concepto.requiereRegularizacion ? 'PENDIENTE' : 'NO_REQUIERE',
        periodoAnio: input.periodoAnio ?? null,
        periodoMes: input.periodoMes ?? null,
        codigoPago: input.codigoPago,
        tipoBeneficiarioAplicado: concepto.tipoBeneficiario,
        usoBeneficiarioAplicado: concepto.usoBeneficiario,
      }, tx);

      if (concepto.requiereRegularizacion) {
        await this.regularizadoresObligacion.congelarParaObligacion(
          grupoFacturaId,
          tiposRegularizadores,
          tx,
        );
      }

      const ids = { documentoId, ordenPagoId, grupoFacturaId, contenedorOperativoId: input.contenedorOperativoId };
      await this.auditoria.registrarCreacion({ accion: 'ASOCIAR_DOCUMENTO_PRINCIPAL',
        entidad: 'documento_operativo_principal', entidadId: ordenPagoId,
        descripcion: 'Orden de Pago acreditada en Finanzas con grupo económico único.',
        empresaCodigo: actor.empresaCodigo, usuario: { ...actor, origen: 'finanzas-op' },
        despues: { ...ids, tipoPrincipal: 'ORDEN_PAGO', fechaEmision: input.fechaEmision,
          creadoEn: docs[0].creado_en, monto: input.monto, moneda: input.moneda,
          workspaceId: actor.workspaceId, empresaCodigo: actor.empresaCodigo,
          requestId: actor.requestId, correlationId: actor.correlationId },
      }, tx);
      return { ...ids, idempotente: false };
    };
    return executor ? create(executor) : sql.begin(create);
  }
}
