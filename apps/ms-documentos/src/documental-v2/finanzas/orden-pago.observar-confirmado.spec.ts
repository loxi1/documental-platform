jest.mock('@documental/database', () => ({ sql: { begin: jest.fn() } }));
import { sql } from '@documental/database';
import { OrdenPagoService } from './orden-pago.service';

const actor = { id: 7, workspaceId: 3, empresaCodigo: 'LAB', clienteDestinoId: 8 };
function fixture() {
  let row: any = { id: 35, documentoId: 93, archivoId: 94, ocrResultadoId: 66, grupoFacturaId:31, documentoBaseId:31, expedienteId:2, estado: 'activo', estadoDocumento: 'confirmado' };
  const queries: string[] = [];
  let audit = false;
  const refs: Record<string, any[]> = {};
  const tx: any = jest.fn(async (parts: TemplateStringsArray, ...values: any[]) => {
    const q = parts.join('?'); queries.push(q);
    if (/^\s*SELECT/.test(q) && q.includes('FOR UPDATE') && !q.includes('FROM documentos.grupo_factura_documentos v')) { const table = q.match(/FROM documentos\.(\w+)/)![1]; return refs[table] ?? []; }
    if (q.includes('FROM documentos.grupo_factura_documentos v')) return row ? [{ ...row }] : [];
    if (q.includes('FROM core.auditoria_eventos')) return audit ? [{ id: 1 }] : [];
    if (q.includes('UPDATE documentos.grupo_factura_documentos')) { row.estado = 'anulado'; row.motivo = values[0]; row.usuarioId = actor.id; row.fecha = 'original'; return [{ id: 35 }]; }
    if (q.includes('UPDATE documentos.ocr_resultados')) { row.decision = {estado:'CONSUMIDO',accion:'OBSERVAR'}; return [{id:66}]; }
    if (q.includes('UPDATE documentos.documentos')) { row.estadoDocumento = 'observado'; return []; }
    throw Error(q);
  });
  const auditoria = { registrarDecisionCorrespondencia: jest.fn(async () => { audit = true; }) };
  const service = new OrdenPagoService(auditoria as any, null as any, null as any, null as any, null as any, null as any, null as any);
  // Serialize transactions as PostgreSQL row locks do; SQL lock clauses are checked separately.
  let queue = Promise.resolve();
  (sql.begin as jest.Mock).mockImplementation((fn: any) => {
    const job = queue.then(async () => { const before = row && { ...row }; const oldAudit = audit; try { return await fn(tx); } catch (e) { row = before; audit = oldAudit; throw e; } });
    queue = job.catch(() => undefined); return job;
  });
  return { service, tx, queries, auditoria, refs, row: () => row, remove: () => { row = null; } };
}
beforeEach(() => jest.clearAllMocks());
it('reverses only the link, preserves file/OCR, and audits with the same executor', async () => {
  const f = fixture(); const result = await f.service.observarPagoConfirmado(31, 35, { motivo: 'No corresponde' }, actor);
  expect(result).toMatchObject({ documentoId: 93, archivoId: 94, estado: 'OBSERVADO', idempotente: false });
  expect(f.auditoria.registrarDecisionCorrespondencia).toHaveBeenCalledWith(expect.objectContaining({ accion: 'CORRESPONDENCIA_PAGO_FACTURA_DECIDIDA', entidadId: 35, despues: expect.objectContaining({ accion: 'OBSERVAR', motivo: 'No corresponde' }) }), f.tx);
  const q = f.queries.join('\n');
  for (const guard of ["g.origen_obligacion='ORDEN_PAGO'", "v.tipo_relacion='adjunto_transferencia'", 'a.workspace_id=', 'a.cliente_destino_id IS NOT DISTINCT FROM', 'p.id=', 'FOR UPDATE OF a, d, o, v', "AND estado='activo'"]) expect(q).toContain(guard);
  expect(q).not.toMatch(/DELETE|UPDATE documentos\.documentos_archivos|SET monto|SET saldo|SET resultado|SET texto/i);
});
it('retry preserves original reason, actor, date and only one audit event', async () => {
  const f = fixture(); await f.service.observarPagoConfirmado(31,35,{motivo:'Primero'},actor);
  const before = { ...f.row() }; const r = await f.service.observarPagoConfirmado(31,35,{motivo:'Otro'},actor);
  expect(r.idempotente).toBe(true); expect(r.motivo).toBe('Primero'); expect(f.row()).toEqual(before); expect(f.auditoria.registrarDecisionCorrespondencia).toHaveBeenCalledTimes(1);
});
it('two concurrent requests have one reversal and one replay under the locked transaction model', async () => {
  const f = fixture(); const r = await Promise.all([f.service.observarPagoConfirmado(31,35,{motivo:'A'},actor),f.service.observarPagoConfirmado(31,35,{motivo:'B'},actor)]);
  expect(r.map(x => x.idempotente)).toEqual([false,true]); expect(f.queries.filter(q=>q.includes('UPDATE documentos.grupo_factura_documentos'))).toHaveLength(1); expect(f.auditoria.registrarDecisionCorrespondencia).toHaveBeenCalledTimes(1);
});
it.each(['', '   ', null, 22])('requires reason without beginning a transaction: %s', async motivo => {
  const f = fixture(); await expect(f.service.observarPagoConfirmado(31,35,{motivo},actor)).rejects.toThrow(); expect(sql.begin).not.toHaveBeenCalled();
});
it('rejects invalid actor or identity and foreign OP payment without writes', async () => {
  const f = fixture(); await expect(f.service.observarPagoConfirmado(31,35,{motivo:'X'},{...actor,workspaceId:0})).rejects.toThrow();
  f.remove(); await expect(f.service.observarPagoConfirmado(99,35,{motivo:'X'},actor)).rejects.toThrow(); expect(f.queries.some(q=>/^\s*UPDATE/.test(q))).toBe(false);
});
it('ordinary annulment cannot be replayed as an accredited observation', async () => {
  const f = fixture(); Object.assign(f.row(),{estado:'anulado',estadoDocumento:'confirmado'}); await expect(f.service.observarPagoConfirmado(31,35,{motivo:'X'},actor)).rejects.toThrow(); expect(f.auditoria.registrarDecisionCorrespondencia).not.toHaveBeenCalled();
});
it('failure of audit rolls back both states', async () => {
  const f = fixture(); f.auditoria.registrarDecisionCorrespondencia.mockRejectedValueOnce(Error('audit unavailable') as never);
  await expect(f.service.observarPagoConfirmado(31,35,{motivo:'X'},actor)).rejects.toThrow('audit unavailable'); expect(f.row()).toMatchObject({estado:'activo',estadoDocumento:'confirmado'});
});

it('preserves previously consumed acceptance and its OCR metadata', async () => {
 const f=fixture(); f.row().decision={estado:'CONSUMIDO',accion:'AUTORIZAR_EXCEPCION',motivo:'Original'}; const before={...f.row().decision};
 await f.service.observarPagoConfirmado(31,35,{motivo:'Nueva observación'},actor);
 expect(f.row().decision).toEqual(before);expect(f.queries.some(q=>q.includes('UPDATE documentos.ocr_resultados'))).toBe(false);
});
it('ordinary confirmed payment without draft consumes the existing financial fence without changing OCR payload', async () => {
 const f=fixture();await f.service.observarPagoConfirmado(31,35,{motivo:'X'},actor);
 expect(f.row().decision).toMatchObject({estado:'CONSUMIDO',accion:'OBSERVAR'});
 expect(f.queries.find(q=>q.includes('UPDATE documentos.ocr_resultados'))).toContain("<>'CONSUMIDO'");
});

it.each([
 ['grupo_factura_documentos',{id:999,estado:'activo'}],
 ['documentos_operativos_principales',{estado:'activo'}],
 ['grupos_factura',{estado:'pendiente_revision'}],
 ['expediente_documentos',{expediente_id:999,tipo_relacion:'adjunto_transferencia',es_principal:false}],
 ['expediente_documentos',{expediente_id:2,tipo_relacion:'principal_oc',es_principal:true}],
 ['grupo_documentos',{id:99}], ['documento_relaciones',{id:99}], ['asientos_documentos',{id:99}],
])('rejects shared %s before any effect, preserving original audit and paid inputs', async (table, reference) => {
 const f=fixture(); f.refs[table as string]=[reference]; const before=JSON.stringify(f.row());
 await expect(f.service.observarPagoConfirmado(31,35,{motivo:'X'},actor)).rejects.toMatchObject({response:{code:'OP_PAGO_DOCUMENTO_COMPARTIDO'}});
 expect(JSON.stringify(f.row())).toBe(before);expect(f.queries.some(q=>/^\s*UPDATE/.test(q))).toBe(false);
 expect(f.auditoria.registrarDecisionCorrespondencia).not.toHaveBeenCalled();
 // The same active amount/document and link survive, so the existing read sum has unchanged inputs.
 expect(f.row()).toMatchObject({estado:'activo',estadoDocumento:'confirmado'});
});
it('allows the canonical OP expediente reference and inactive historic financial links', async () => {
 const f=fixture();f.refs.expediente_documentos=[{expediente_id:2,tipo_relacion:'adjunto_transferencia',es_principal:false}];
 f.refs.grupo_factura_documentos=[{id:35,estado:'activo'},{id:34,estado:'anulado'}];
 await expect(f.service.observarPagoConfirmado(31,35,{motivo:'X'},actor)).resolves.toMatchObject({estado:'OBSERVADO',idempotente:false});
});
it('locks every checked reference before transition without filtering out rows that could be reactivated', async () => {
 const f=fixture(); await f.service.observarPagoConfirmado(31,35,{motivo:'X'},actor);
 const update=f.queries.findIndex(q=>/^\s*UPDATE/.test(q));const checks=f.queries.slice(1,update);
 expect(checks).toHaveLength(7);for(const q of checks){expect(q).toContain('FOR UPDATE');expect(q).not.toMatch(/WHERE.*estado\s*=/);}
 expect(f.queries[0]).toContain('FOR UPDATE OF a, d, o, v');
});
