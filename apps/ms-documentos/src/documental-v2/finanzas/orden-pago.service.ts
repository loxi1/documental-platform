import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { sql } from '@documental/database';
import { AuditoriaOperativaV2Repository } from '../auditoria-operativa-v2.repository';
import { validarActorOp, validarOrdenPago } from './orden-pago.dto';
import type { OrdenPagoActor } from './orden-pago.dto';
import type { SqlExecutor } from '../sql-executor';
import { CatalogoConceptosObligacionRepository } from '../catalogo-conceptos-obligacion.repository';
import { ObligacionesSnapshotRepository } from '../obligaciones-snapshot.repository';
import { RegularizadoresObligacionRepository } from '../regularizadores-obligacion.repository';
import { ConfigProveedoresConceptoOpRepository } from '../config-proveedores-concepto-op.repository';
import { ConfigBeneficiariosRendicionOpRepository } from '../config-beneficiarios-rendicion-op.repository';

@Injectable()
export class OrdenPagoService {
  constructor(
    private readonly auditoria: AuditoriaOperativaV2Repository,
    private readonly catalogoConceptos: CatalogoConceptosObligacionRepository,
    private readonly obligacionesSnapshot: ObligacionesSnapshotRepository,
    private readonly regularizadoresObligacion: RegularizadoresObligacionRepository,
    private readonly configProveedores: ConfigProveedoresConceptoOpRepository,
    private readonly configRendicion: ConfigBeneficiariosRendicionOpRepository,
  ) {}

  async obtenerDetalle(ordenPagoId: number, actor: OrdenPagoActor) {
    validarActorOp(actor);
    if (!Number.isSafeInteger(ordenPagoId) || ordenPagoId <= 0) throw new NotFoundException('Orden de Pago no disponible');
    const [row] = await sql`
      SELECT p.id AS "ordenPagoId", d.id AS "documentoId", g.id AS "grupoFacturaId",
        c.id AS "contenedorOperativoId", d.fecha_emision::text AS "fechaEmision",
        d.monto_total::text AS monto, d.moneda, d.estado,
        d.metadata->'ordenPago'->>'tipo' AS tipo,
        d.metadata->'ordenPago'->>'subtipo' AS subtipo,
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
      LEFT JOIN documentos.documentos_archivos a ON a.documento_id=d.id
        AND a.origen_archivo='OP_INICIAL' AND a.es_version_actual=true
      WHERE p.id=${ordenPagoId} AND p.tipo_principal='ORDEN_PAGO'
        AND p.estado='activo' AND p.es_principal_activo=true AND c.estado='activo'
        AND c.empresa_codigo=${actor.empresaCodigo}
        AND c.cliente_destino_id IS NOT DISTINCT FROM ${actor.clienteDestinoId}::bigint
    `;
    if (!row) throw new NotFoundException('Orden de Pago no disponible');
    return { ...row, ordenPagoId: Number(row.ordenPagoId), documentoId: Number(row.documentoId),
      grupoFacturaId: Number(row.grupoFacturaId), contenedorOperativoId: Number(row.contenedorOperativoId),
      numero: `OP-${row.ordenPagoId}` };
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
