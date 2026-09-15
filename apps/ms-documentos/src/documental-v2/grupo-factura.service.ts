import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type {
  ActualizarGrupoFacturaInput,
  CrearGrupoFacturaInput,
  GrupoFacturaRow,
  JsonObject,
} from './documental-v2.types';
import { DocumentoOperativoPrincipalRepository } from './documento-operativo-principal.repository';
import { GrupoFacturaRepository } from './grupo-factura.repository';
import { normalizarMoneda } from './mappers/documental-v2-labels';
import { sql } from '@documental/database';
import { GrupoFacturaDocumentoRepository } from './grupo-factura-documento.repository';
import { DocumentoExistenteReadonlyRepository } from './documento-existente-readonly.repository';
import { validarActorOp, OrdenPagoActor } from './finanzas/orden-pago.dto';
import { adaptarFacturaCorrespondencia, adaptarPagoCorrespondencia } from './finanzas/correspondencia-pago-factura.adapter';
import type { ObligacionGrupoRow, PagoGrupoReadRow, ResumenFinancieroGrupo, SustentoFinanciero } from './finanzas/grupo-financiero.dto';
import type { SqlExecutor } from './sql-executor';

@Injectable()
export class GrupoFacturaService {
  constructor(
    private readonly repository: GrupoFacturaRepository,
    private readonly documentoOperativoPrincipalRepository: DocumentoOperativoPrincipalRepository,
    private readonly pagos: GrupoFacturaDocumentoRepository = new GrupoFacturaDocumentoRepository(),
    private readonly documentos: DocumentoExistenteReadonlyRepository = new DocumentoExistenteReadonlyRepository(),
  ) {}

  async obtenerResumenFinanciero(id: number, actor: OrdenPagoActor): Promise<ResumenFinancieroGrupo> {
    validarActorOp(actor);
    if (!Number.isSafeInteger(id) || id <= 0) throw new NotFoundException('Grupo financiero no disponible');
    return sql.begin('isolation level repeatable read read only', async tx => {
      const grupo = await this.repository.buscarObligacionScoped(id, actor, tx);
      if (!grupo) throw new NotFoundException('Grupo financiero no disponible');
      const obligacion = await this.resolverObligacion(grupo, actor.empresaCodigo, tx);
      const pagado = await this.pagos.sumarMontoTransferenciasActivas(id, tx);
      const vinculados = await this.pagos.listarSustentosFinancieros(id, tx);
      const observados = await this.pagos.listarDecisionesObservadas(id, actor.empresaCodigo, tx);
      const items = new Map<number, SustentoFinanciero>();
      // Primero el estado vigente; los históricos no duplican un documento reactivado.
      for (const row of vinculados) {
        if (!items.has(Number(row.documentoId)) && row.estadoVinculo === 'activo' && !['observado', 'anulado'].includes(row.estadoDocumento)) {
          items.set(Number(row.documentoId), this.proyectarSustento(row, 'activo'));
        }
      }
      for (const row of observados) {
        this.validarDecision(row, grupo, id);
        if (!items.has(Number(row.documentoId)) && row.estadoDocumento !== 'anulado') {
          items.set(Number(row.documentoId), this.proyectarSustento(row, 'observado'));
        }
      }
      for (const row of vinculados) {
        if (!items.has(Number(row.documentoId)) && (row.estadoVinculo === 'anulado' || row.estadoDocumento === 'anulado')) {
          items.set(Number(row.documentoId), this.proyectarSustento(row, 'anulado'));
        }
      }
      const sustentos = [...items.values()];
      const sustentosActivos = sustentos.filter(item => item.estado === 'activo');
      const saldo = Math.max(Math.round((Number(obligacion.monto) - pagado) * 100) / 100, 0);
      return { grupoFacturaId: id, origenObligacion: grupo.origenObligacion, obligacion,
        pago: { pagado: pagado.toFixed(2), saldo: saldo.toFixed(2),
          estado: saldo <= 0.01 ? 'COMPLETO' : sustentosActivos.length ? 'PENDIENTE DE PAGO' : 'SIN PAGOS' },
        sustentosActivos, sustentosObservados: sustentos.filter(item => item.estado === 'observado'),
        sustentosAnulados: sustentos.filter(item => item.estado === 'anulado') };
    });
  }

  private async resolverObligacion(g: ObligacionGrupoRow, empresa: string, tx: SqlExecutor): Promise<ResumenFinancieroGrupo['obligacion']> {
    const op = g.origenObligacion === 'ORDEN_PAGO';
    if ((op && (g.tipoPrincipal !== 'ORDEN_PAGO' || g.facturaDocumentoId != null)) ||
      (!op && (g.origenObligacion !== 'FACTURA' || !['OC', 'OS'].includes(g.tipoPrincipal) || !g.facturaDocumentoId))) {
      throw new NotFoundException('Grupo financiero no disponible');
    }
    const documentoId = Number(op ? g.documentoPrincipalId : g.facturaDocumentoId);
    const doc = await this.documentos.buscarPorId(documentoId, tx);
    if (!doc || doc.tipoDocumental !== g.origenObligacion || doc.estado === 'anulado' || doc.clienteAbreviatura !== empresa) {
      throw new NotFoundException('Grupo financiero no disponible');
    }
    const factura = adaptarFacturaCorrespondencia(doc);
    const monto = op ? doc.montoTotal : factura.importe;
    const moneda = normalizarMoneda(op ? doc.moneda : factura.moneda);
    if (monto == null || !Number.isFinite(Number(monto)) || Number(monto) < 0 || (op && Number(monto) === 0) || !moneda || !/^[A-Z]{3}$/.test(moneda)) {
      throw new ConflictException('Obligación sin monto/moneda válidos');
    }
    return { tipo: g.origenObligacion, documentoId, referencia: op ? `OP-${g.principalId}` : factura.documento ?? null,
      monto: Number(monto).toFixed(2), moneda };
  }

  private validarDecision(row: PagoGrupoReadRow, g: ObligacionGrupoRow, id: number): void {
    const decision = row.decision ?? {};
    const identidad = decision.identidad ?? decision;
    const coincide = (value: unknown, expected: number | null) =>
      expected == null ? value == null : value != null && Number(value) === Number(expected);
    if (decision.estado !== 'CONSUMIDO' || decision.accion !== 'OBSERVAR' ||
      !coincide(identidad.grupoFacturaId, id) || !coincide(row.grupoArchivo, id) ||
      !coincide(identidad.expedienteId, g.expedienteId) ||
      !coincide(identidad.facturaDocumentoId, g.facturaDocumentoId) ||
      (identidad.documentoId != null && !coincide(identidad.documentoId, Number(row.documentoId))) ||
      (identidad.archivoId != null && !coincide(identidad.archivoId, Number(row.archivoId))) ||
      (identidad.contenedorOperativoId != null && !coincide(identidad.contenedorOperativoId, g.contenedorId)) ||
      (identidad.documentoBaseId != null && !coincide(identidad.documentoBaseId, g.documentoPrincipalId))) {
      throw new ConflictException('Identidad de decisión de pago inconsistente');
    }
  }

  private proyectarSustento(row: PagoGrupoReadRow, estado: SustentoFinanciero['estado']): SustentoFinanciero {
    const m = row.metadata ?? {};
    const ocr = m.ocr?.metadata ?? {};
    const pago = adaptarPagoCorrespondencia({ id: Number(row.documentoId), tipoDocumental: 'TRANSFERENCIA',
      montoTotal: row.monto == null ? null : Number(row.monto), moneda: row.moneda, metadata: m });
    const texto = (...values: unknown[]): string | null => {
      const value = values.find(v => (typeof v === 'string' && v.trim()) || typeof v === 'number');
      return value == null ? null : String(value);
    };
    return { vinculoId: row.vinculoId == null ? null : Number(row.vinculoId), documentoId: Number(row.documentoId),
      archivoId: row.archivoId == null ? null : Number(row.archivoId), estado,
      banco: texto(ocr.banco, m.banco), fecha: texto(estado === 'anulado' ? row.fechaAnulacion : null,
        estado === 'observado' ? row.decision?.consumidoEn : null, ocr.fechaPago, ocr.fechaEmision, row.fecha),
      monto: pago.importe == null || !Number.isFinite(Number(pago.importe)) ? null : Number(pago.importe).toFixed(2),
      moneda: pago.moneda ?? null, numeroReferencia: texto(ocr.numeroOperacion, ocr.numero, m.numeroOperacion, m.numero_operacion, row.numero),
      observacion: texto(row.decision?.request?.observacion, m.observacion, ocr.observacion),
      motivo: texto(row.decision?.motivo, row.motivo) };
  }

  async crear(input: CrearGrupoFacturaInput): Promise<GrupoFacturaRow> {
    const data = this.normalizeCrearInput(input);
    const documentoOperativo = await this.documentoOperativoPrincipalRepository.buscarPorId(
      data.documentoOperativoPrincipalId,
    );

    if (!documentoOperativo || documentoOperativo.estado !== 'activo') {
      throw new NotFoundException(
        `Documento operativo principal ${data.documentoOperativoPrincipalId} no encontrado o no activo`,
      );
    }

    const existente = await this.repository.buscarPorFacturaDocumentoId(data.facturaDocumentoId);

    if (existente && existente.estado !== 'anulado') {
      throw new ConflictException({
        code: 'FACTURA_YA_TIENE_GRUPO_ACTIVO',
        message: 'La factura ya pertenece a un Grupo de Factura activo o vigente.',
        details: {
          grupoFacturaId: existente.id,
          facturaDocumentoId: data.facturaDocumentoId,
        },
      });
    }

    return this.repository.crear(data);
  }

  async buscarPorId(id: number): Promise<GrupoFacturaRow> {
    const normalizedId = this.normalizeId(id, 'grupoFacturaId');
    const row = await this.repository.buscarPorId(normalizedId);

    if (!row) {
      throw new NotFoundException(`Grupo de Factura ${normalizedId} no encontrado`);
    }

    return row;
  }

  async buscarPorFacturaDocumentoId(facturaDocumentoId: number): Promise<GrupoFacturaRow | null> {
    return this.repository.buscarPorFacturaDocumentoId(
      this.normalizeId(facturaDocumentoId, 'facturaDocumentoId'),
    );
  }

  async listarPorDocumentoOperativoPrincipal(
    documentoOperativoPrincipalId: number,
  ): Promise<GrupoFacturaRow[]> {
    const id = this.normalizeId(documentoOperativoPrincipalId, 'documentoOperativoPrincipalId');
    return this.repository.listarPorDocumentoOperativoPrincipal(id);
  }

  async actualizar(input: ActualizarGrupoFacturaInput): Promise<GrupoFacturaRow> {
    const id = this.normalizeId(input.id, 'grupoFacturaId');
    await this.buscarPorId(id);

    const row = await this.repository.actualizar({
      ...input,
      id,
      estado: input.estado?.trim().toLowerCase(),
      metadata: this.normalizeMetadata(input.metadata),
    });

    if (!row) {
      throw new NotFoundException(`Grupo de Factura ${id} no encontrado`);
    }

    return row;
  }

  async anular(params: {
    id: number;
    usuarioId?: number | null;
    motivo?: string | null;
  }): Promise<GrupoFacturaRow> {
    const id = this.normalizeId(params.id, 'grupoFacturaId');
    await this.buscarPorId(id);

    const row = await this.repository.anular({
      id,
      usuarioId: this.normalizeOptionalId(params.usuarioId),
      motivo: params.motivo?.trim() || null,
    });

    if (!row) {
      throw new NotFoundException(`Grupo de Factura ${id} no encontrado`);
    }

    return row;
  }

  private normalizeCrearInput(input: CrearGrupoFacturaInput): CrearGrupoFacturaInput {
    return {
      ...input,
      documentoOperativoPrincipalId: this.normalizeId(
        input.documentoOperativoPrincipalId,
        'documentoOperativoPrincipalId',
      ),
      facturaDocumentoId: this.normalizeId(input.facturaDocumentoId, 'facturaDocumentoId'),
      estado: input.estado?.trim().toLowerCase() || 'pendiente_revision',
      metadata: this.normalizeMetadata(input.metadata),
      creadoPor: this.normalizeOptionalId(input.creadoPor),
    };
  }

  private normalizeId(value: unknown, field: string): number {
    const normalized = Number(value);

    if (!Number.isInteger(normalized) || normalized <= 0) {
      throw new BadRequestException(`${field} debe ser un entero positivo`);
    }

    return normalized;
  }

  private normalizeOptionalId(value: unknown): number | null {
    if (value === null || value === undefined) return null;

    const normalized = Number(value);
    return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
  }

  private normalizeMetadata(metadata?: JsonObject | null): JsonObject {
    return metadata && typeof metadata === 'object' ? metadata : {};
  }
}
