jest.mock('@documental/database', () => ({ sql: Object.assign(jest.fn(), { begin: jest.fn() }) }));
import { sql } from '@documental/database';
import { OrdenPagoService } from './orden-pago.service';
import { AuditoriaOperativaV2Repository } from '../auditoria-operativa-v2.repository';
import { ConfirmacionDocumentalService } from '../confirmacion-documental.service';

const actor = { id: 7, workspaceId: 3, empresaCodigo: 'TEST', clienteDestinoId: 8, requestId: 'synthetic-observation' };
const identity = { ocrResultadoId: 72, documentoId: 102, archivoId: 103, expedienteId: 26, documentoBaseId: 98, grupoFacturaId: 32 };
const observe = { ocrResultadoId: 72, metadata: { banco: 'BODY MUST NOT REPLACE IDENTITY' }, decisionCorrespondencia: { accion: 'OBSERVAR', motivo: 'Sustento repetido' } };
const bankKey = 'TEST|TRANSFERENCIA|BBVA|SYNTHETIC-001';

// Transacciones, estado y auditoría simulados. No se abre ninguna conexión SQL/R2.
function fixture() {
  let state: any = {
    document: { id: 102, estado: 'pendiente_ocr', tipo_documental: 'TRANSFERENCIA', cliente_abreviatura: 'TEST', clave_documental: bankKey },
    previous: { id: 101, estado: 'confirmado', monto_total: 250, clave_documental: bankKey },
    links: [{ id: 10, documento_id: 101, estado: 'activo' }],
    file: { id: 103, documento_id: 102, workspace_id: 3, empresa_codigo: 'TEST', cliente_destino_id: 8, expediente_id: 26, estado: 'subido',
      metadata: { documentoBaseId: 98, grupoFacturaId: 32, tipoRelacion: 'adjunto_transferencia', tipoDocumental: 'TRANSFERENCIA' } },
    ocr: { id: 72, documento_id: 102, archivo_id: 103, estado: 'editado', clave_documental: bankKey,
      metadata: { metadata: { banco: 'BBVA', numeroOperacion: 'SYNTHETIC-001', moneda: 'USD', montoTotal: '250' }, audit: [{ accion: 'EDITADO_MANUAL' }] } },
    events: [], refs: {},
  };
  let auditFailure = false;
  let rejectConsume = false;
  const queries: string[] = [];
  const lifecycle: string[] = [];
  const tx: any = jest.fn(async (parts: TemplateStringsArray, ...values: any[]) => {
    const q = parts.join('?').replace(/\s+/g, ' ').trim(); queries.push(q);
    if (q.startsWith('SELECT archivo_id, documento_id')) return values[0] === 72 ? [{ archivo_id: 103, documento_id: 102 }] : [];
    if (q.startsWith('SELECT * FROM documentos.documentos_archivos')) return [structuredClone(state.file)];
    if (q.startsWith('SELECT * FROM documentos.documentos WHERE')) return [structuredClone(state.document)];
    if (q.startsWith('SELECT * FROM documentos.ocr_resultados')) return [structuredClone(state.ocr)];
    if (q.includes('FROM documentos.documentos_operativos_principales p')) return values[0] === 31 ? [{ documentoBaseId: 98, grupoFacturaId: 32, expedienteId: 26 }] : [];
    if (q.startsWith('SELECT id FROM core.auditoria_eventos')) return state.events.filter((e: any) => e.entidad === 'documento_archivo' && e.entidadId === String(values[0]) && e.despues.ordenPagoId === 31 && e.despues.ocrResultadoId === 72 && e.despues.archivoId === 103);
    if (q.startsWith('SELECT id, estado FROM documentos.grupo_factura_documentos')) return state.links.filter((v: any) => v.documento_id === values[0]);
    if (q.startsWith('SELECT ') && q.includes('FOR UPDATE')) {
      const table = q.match(/FROM documentos\.(\w+)/)![1]; return state.refs[table] ?? [];
    }
    if (q.startsWith('UPDATE documentos.ocr_resultados')) {
      if (rejectConsume) return [];
      state.ocr.metadata.validacionPendientePago = { ...(state.ocr.metadata.validacionPendientePago ?? {}), version: 1, estado: 'CONSUMIDO', accion: 'OBSERVAR', motivo: values[0], identidad: JSON.parse(values[1]), consumidoEn: 'synthetic-time' };
      return [{ id: 72 }];
    }
    if (q.startsWith('UPDATE documentos.documentos SET estado=')) { state.document.estado = 'observado'; return [{ id: 102 }]; }
    if (q.startsWith('INSERT INTO core.auditoria_eventos')) {
      if (auditFailure) throw Error('audit unavailable');
      state.events.push({ id: state.events.length + 1, entidad: values[8], entidadId: values[9], accion: values[10], usuarioId: values[3], workspaceId: values[0], despues: JSON.parse(values[13]) }); return [];
    }
    throw Error(`Unexpected SQL: ${q}`);
  });
  let queue = Promise.resolve();
  (sql.begin as jest.Mock).mockImplementation((fn: any) => {
    const job = queue.then(async () => {
      const before = structuredClone(state); lifecycle.push('BEGIN');
      try { const value = await fn(tx); lifecycle.push('COMMIT'); return value; }
      catch (error) { state = before; lifecycle.push('ROLLBACK'); throw error; }
    });
    queue = job.catch(() => undefined); return job;
  });
  const confirmation = { confirmarOcrResultadoConExpediente: jest.fn() };
  const service = new OrdenPagoService(new AuditoriaOperativaV2Repository(), null as any, null as any, null as any, null as any, null as any, confirmation as any);
  return { service, tx, queries, lifecycle, confirmation, state: () => state,
    failAudit: () => { auditFailure = true; }, rejectConsume: () => { rejectConsume = true; },
    saldo: () => 400 - state.links.filter((v: any) => v.estado === 'activo').reduce((n: number, v: any) => n + (v.documento_id === state.previous.id ? state.previous.monto_total : 250), 0) };
}

beforeEach(() => jest.clearAllMocks());
it.each([false, true])('observa duplicado pendiente con draft=%s, persiste estado y auditoría sin confirmar pago', async draft => {
  const f = fixture();
  if (draft) f.state().ocr.metadata.validacionPendientePago = { estado: 'PENDIENTE_DECISION', identidad: identity, request: { metadata: { moneda: 'USD' } } };
  const bankData = structuredClone(f.state().ocr.metadata.metadata);
  const previous = structuredClone(f.state().previous), links = structuredClone(f.state().links);
  const result = await f.service.confirmarPago(31, observe, actor);
  expect(result).toMatchObject({ ...identity, estado: 'OBSERVADO', idempotente: false });
  expect(f.state().document).toMatchObject({ estado: 'observado', clave_documental: bankKey });
  expect(f.state().ocr).toMatchObject({ estado: 'editado', clave_documental: bankKey });
  expect(f.state().ocr.metadata.validacionPendientePago).toMatchObject({ estado: 'CONSUMIDO', accion: 'OBSERVAR', motivo: 'Sustento repetido', identidad: identity });
  expect(f.state().ocr.metadata.metadata).toEqual(bankData);
  expect(f.state().events).toHaveLength(1);
  expect(f.state().events[0]).toMatchObject({ entidad: 'documento_archivo', entidadId: '103', usuarioId: 7, workspaceId: 3, accion: 'CORRESPONDENCIA_PAGO_FACTURA_DECIDIDA', despues: { requestId: 'synthetic-observation', ordenPagoId: 31, accion: 'OBSERVAR', estadoResultante: 'OBSERVADA', asociacionCreada: false } });
  expect(f.state().previous).toEqual(previous); expect(f.state().links).toEqual(links); expect(f.saldo()).toBe(150);
  expect(f.confirmation.confirmarOcrResultadoConExpediente).not.toHaveBeenCalled();
  expect(f.queries.filter(q => /^(UPDATE|INSERT)/.test(q))).toHaveLength(3);
  expect(f.queries.join('\n')).not.toMatch(/INSERT INTO documentos|SET saldo|SET monto|SET clave_documental/);
  expect(f.lifecycle).toEqual(['BEGIN', 'COMMIT']);
});
it('reintento conserva motivo original y auditoría única', async () => {
  const f = fixture(); await f.service.confirmarPago(31, observe, actor);
  const before = structuredClone(f.state());
  expect(await f.service.confirmarPago(31, { ...observe, decisionCorrespondencia: { accion: 'OBSERVAR', motivo: 'Otro motivo' } }, actor)).toMatchObject({ idempotente: true, motivo: 'Sustento repetido' });
  expect(f.state()).toEqual(before); expect(f.state().events).toHaveLength(1); expect(f.saldo()).toBe(150);
});
it('dos observadores serializados tienen una transición y un replay', async () => {
  const f = fixture(); const results = await Promise.all([f.service.confirmarPago(31, observe, actor), f.service.confirmarPago(31, observe, actor)]);
  expect(results.map(r => r.idempotente)).toEqual([false, true]); expect(f.state().events).toHaveLength(1); expect(f.saldo()).toBe(150);
});
it.each(['audit', 'consume'])('fallo de %s revierte toda la transición', async kind => {
  const f = fixture(), before = structuredClone(f.state());
  if (kind === 'audit') f.failAudit(); else f.rejectConsume();
  await expect(f.service.confirmarPago(31, observe, actor)).rejects.toThrow();
  expect(f.state()).toEqual(before); expect(f.lifecycle).toEqual(['BEGIN', 'ROLLBACK']);
});
it.each(['confirmed', 'consumed', 'foreign', 'linked', 'draft', 'missing-audit', 'shared'])('rechaza %s sin efectos', async kind => {
  const f = fixture();
  if (kind === 'confirmed') f.state().document.estado = 'confirmado';
  if (kind === 'consumed') f.state().ocr.metadata.validacionPendientePago = { estado: 'CONSUMIDO', accion: 'ACEPTAR', identidad: identity };
  if (kind === 'foreign') f.state().file.workspace_id = 99;
  if (kind === 'linked') f.state().links.push({ id: 11, documento_id: 102, estado: 'activo' });
  if (kind === 'draft') f.state().ocr.metadata.validacionPendientePago = { estado: 'PENDIENTE_DECISION', identidad: { ...identity, grupoFacturaId: 999 } };
  if (kind === 'missing-audit') { f.state().document.estado = 'observado'; f.state().ocr.metadata.validacionPendientePago = { estado: 'CONSUMIDO', accion: 'OBSERVAR', motivo: 'Original', identidad: identity }; }
  if (kind === 'shared') f.state().refs.asientos_documentos = [{ id: 99 }];
  const before = structuredClone(f.state());
  await expect(f.service.confirmarPago(31, observe, actor)).rejects.toThrow();
  expect(f.state()).toEqual(before); expect(f.queries.some(q => /^(UPDATE|INSERT|DELETE)/.test(q))).toBe(false);
});
it.each(['', ' ', null])('motivo %j no abre transacción', async motivo => {
  const f = fixture(); await expect(f.service.confirmarPago(31, { ...observe, decisionCorrespondencia: { accion: 'OBSERVAR', motivo } }, actor)).rejects.toThrow();
  expect(sql.begin).not.toHaveBeenCalled();
});
it('OP ajena no permite observar el sustento', async () => {
  const f = fixture(); await expect(f.service.confirmarPago(999, observe, actor)).rejects.toThrow(); expect(f.state().events).toHaveLength(0);
});
it('confirmar duplicado conserva la capacidad común y su HTTP409', async () => {
  const f = fixture();
  const duplicate = Object.assign(new Error('Duplicate'), { code: 'DOCUMENTO_DUPLICADO_EN_EXPEDIENTE' });
  const shared = new ConfirmacionDocumentalService({} as any, { execute: jest.fn().mockRejectedValue(duplicate) } as any, {} as any);
  f.confirmation.confirmarOcrResultadoConExpediente.mockImplementation((...args: any[]) => shared.confirmarOcrResultadoConExpediente(args[0], args[1], args[2]));
  jest.spyOn(f.service, 'obtenerDetalle').mockResolvedValue({ expedienteId: 26, documentoId: 98, grupoFacturaId: 32 } as any);
  await expect(f.service.confirmarPago(31, { ocrResultadoId: 72, metadata: {} }, actor)).rejects.toMatchObject({ status: 409, response: { code: 'DOCUMENTO_DUPLICADO_EN_EXPEDIENTE' } });
  expect(f.confirmation.confirmarOcrResultadoConExpediente).toHaveBeenCalledTimes(1);
  expect(sql.begin).not.toHaveBeenCalled(); expect(f.saldo()).toBe(150);
});
