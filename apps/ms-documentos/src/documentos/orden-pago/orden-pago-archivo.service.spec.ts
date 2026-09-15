jest.mock('@documental/database', () => ({ sql: { begin: jest.fn() } }));
import { sql } from '@documental/database';
import { createHash } from 'node:crypto';
import { OrdenPagoService } from '../../documental-v2/finanzas/orden-pago.service';
import { validarOrdenPago } from '../../documental-v2/finanzas/orden-pago.dto';
import { TmpRepository } from '../tmp/tmp.repository';
import { TmpService } from '../tmp/tmp.service';
import { OrdenPagoArchivoRepository } from './orden-pago-archivo.repository';
import { OrdenPagoArchivoService } from './orden-pago-archivo.service';
import { OrdenPagoCreacionController } from './orden-pago-creacion.controller';

const key = '571997eb-0175-4eb1-a287-11a8df3de272';
const otherKey = '671997eb-0175-4eb1-a287-11a8df3de272';
const body = { contenedorOperativoId: 7, fechaEmision: '2026-08-15', monto: '125.50', moneda: 'PEN', tipo: 'SEGUROS' };
const actor = { id: 6, workspaceId: 12, empresaCodigo: 'BBTI', clienteDestinoId: 2, requestId: key, correlationId: key };
const tmpActor = { ...actor, actorId: 6, idempotencyKey: key };
const source = 'documentos/tmp/12/50';
const dest = 'documentos/carga-segura/2026/09/BBTI/50__pago.pdf';

// Adaptador SQL transaccional en memoria. Usa los servicios y repositorios reales;
// falla ante cualquier consulta no prevista (incluidos inserts OCR/outbox/documentos extra).
describe('OP-01B T1/T2 y recuperación', () => {
  let state: any, snapshot: any, inTransaction: boolean, events: string[], fail: string | null;
  let service: OrdenPagoArchivoService, tmp: TmpService, repo: TmpRepository, files: Map<string, any>, storage: any, tx: any;
  beforeEach(() => {
    events = []; fail = null; inTransaction = false;
    state = { row: { id: 50, actor_id: 6, workspace_id: 12, empresa_codigo: 'BBTI', cliente_destino_id: 2,
      estado: 'almacenada', metadata: {}, hash_sha256: 'a'.repeat(64), tamano_bytes: 9, storage_key: source,
      storage_bucket: 'lab', iniciada_en: '2026-09-15T12:00:00Z', nombre_archivo_original: 'pago.pdf', content_type: 'application/pdf' },
      doc: null, principal: null, group: null, file: null, audits: [] };
    tx = jest.fn(async (parts: TemplateStringsArray, ...v: any[]) => {
      const q = parts.join('?').replace(/\s+/g, ' ').trim();
      if (q.includes('pg_advisory_xact_lock')) return [];
      if (q.startsWith('SELECT p.id AS')) return state.principal ? [{ ...state.principal, grupoFacturaId: 12 }] : [];
      if (q.startsWith('SELECT * FROM documentos.contenedores_operativos')) return v[0] === 7 ? [{ id: 7 }] : [];
      if (q.startsWith('SELECT codigo FROM core.monedas')) return [{ codigo: 'PEN' }];
      if (q.startsWith('INSERT INTO documentos.documentos ')) {
        state.doc = { id: 10, creado_en: '2026-09-15T12:00:00Z', estado: 'confirmado' }; return [state.doc];
      }
      if (q.startsWith('INSERT INTO documentos.documentos_operativos_principales')) {
        state.principal = { id: 11, ordenPagoId: 11, documentoId: 10, contenedorOperativoId: 7, estado: 'activo', op_payload_hash: v.at(-1) }; return [{ id: 11 }];
      }
      if (q.startsWith('INSERT INTO documentos.grupos_factura')) { state.group = { id: 12 }; return [state.group]; }
      if (q.startsWith('SELECT * FROM documentos.carga_operaciones')) {
        if (v.length > 1 && [v[1],v[2],v[3],v[4]].join('|') !== '6|12|BBTI|2') return [];
        return [structuredClone(state.row)];
      }
      if (q.startsWith('UPDATE documentos.carga_operaciones SET documento_id=')) {
        state.row.documento_id = v[0]; state.row.metadata = JSON.parse(v[1]); return [];
      }
      if (q.startsWith('UPDATE documentos.carga_operaciones SET metadata=')) {
        if (q.includes('jsonb_set')) state.row.metadata.integration.completed = true;
        else state.row.metadata = JSON.parse(v[0]); return [];
      }
      if (q.startsWith('UPDATE documentos.documentos_operativos_principales')) { state.principal.archivoInicial = JSON.parse(v[0]); return []; }
      if (q.startsWith('SELECT p.id, c.expediente_v1_id')) return [{ id: 11, expediente_v1_id: 17 }];
      if (q.startsWith('SELECT * FROM documentos.documentos_archivos')) return state.file ? [state.file] : [];
      if (q.startsWith('INSERT INTO documentos.documentos_archivos')) {
        if (fail === 'association') throw new Error('association');
        state.file = { id: 20, documento_id: v[0], carga_operacion_id: v[1], storage_key: v[5], storage_bucket: v[4],
          hash_sha256: v[6], metadata: JSON.parse(v[7]), creado_en: '2026-09-15T12:01:00Z' }; return [state.file];
      }
      if (q.startsWith('UPDATE documentos.carga_operaciones SET archivo_id=')) { state.row.archivo_id = v[0]; return []; }
      if (q.includes("SET estado='requiere_reconciliacion'")) {
        state.row.promovida_en = '2026-09-15T12:01:00Z'; state.row.destino_storage_key = v[0]; state.row.estado = 'requiere_reconciliacion'; return [];
      }
      if (q.startsWith('INSERT INTO core.auditoria_eventos')) { state.audits.push({ accion: v[5] }); return []; }
      if (q.includes("SET estado='completada'")) { state.row.estado = 'completada'; return []; }
      throw new Error(`Unexpected SQL: ${q}`);
    });
    tx.unsafe = jest.fn(async (q: string) => {
      events.push(q);
      if (q === 'BEGIN') { expect(inTransaction).toBe(false); snapshot = structuredClone(state); inTransaction = true; }
      if (q === 'ROLLBACK') { state = snapshot; inTransaction = false; }
      if (q === 'COMMIT') inTransaction = false;
    });
    repo = new TmpRepository();
    jest.spyOn(repo, 'locked').mockImplementation(async (_key, work) => work(tx));
    (sql.begin as jest.Mock).mockImplementation(work => repo.transaction(tx, work));
    const audit: any = { registrarCreacion: jest.fn(async (input: any, executor: any) => {
      expect(executor).toBe(tx); expect(inTransaction).toBe(true);
      if (fail === 'audit' && input.accion === 'ASOCIAR_ARCHIVO_INICIAL_OP') throw new Error('audit');
      if (fail === 'creation') throw new Error('creation');
      state.audits.push(input);
    }) };
    files = new Map([[source, { exists: true, tamanoBytes: 9, hashSha256: 'a'.repeat(64) }]]);
    storage = {
      statObject: jest.fn(async ({ key: k }) => files.get(k) || { exists: false }),
      copyObject: jest.fn(async () => {
        expect(inTransaction).toBe(false); events.push('COPY');
        if (fail === 'copy') throw new Error('copy');
        files.set(dest, { ...files.get(source), ...(fail === 'hash' ? { hashSha256: 'b'.repeat(64) } : {}),
          ...(fail === 'size' ? { tamanoBytes: 8 } : {}) });
      }),
      deleteObject: jest.fn(async () => {
        expect(inTransaction).toBe(false); expect(events.at(-1)).toBe('COMMIT');
        expect(state.file).not.toBeNull(); expect(state.row.metadata.integration.completed).toBe(true);
        if (fail === 'delete') throw new Error('delete'); files.delete(source);
      }),
    };
    tmp = new TmpService(repo, {} as any, storage);
    service = new OrdenPagoArchivoService(new OrdenPagoService(audit), new OrdenPagoArchivoRepository(audit), repo, tmp);
  });
  const withFile = () => ({ ...body, tempId: 50 });
  function counts() {
    expect(state.doc.id).toBe(10); expect(state.principal.id).toBe(11); expect(state.group.id).toBe(12);
    expect(state.file.documento_id).toBe(10);
    expect(state.audits.map((a: any) => a.accion)).toEqual(['ASOCIAR_DOCUMENTO_PRINCIPAL','ASOCIAR_ARCHIVO_INICIAL_OP','TMP_PROMOVIDO']);
    expect(storage.copyObject).toHaveBeenCalledTimes(1);
  }
  it('A: sin temp mantiene respuesta y fingerprint OP-01A', async () => {
    expect(await service.crear(body, key, actor)).toEqual({ documentoId: 10, ordenPagoId: 11, grupoFacturaId: 12, contenedorOperativoId: 7, idempotente: false });
    const expected = createHash('sha256').update(JSON.stringify({ input: { contenedorOperativoId: 7,
      fechaEmision: '2026-08-15', monto: '125.50', moneda: 'PEN', tipo: 'SEGUROS', subtipo: null, observacion: null },
      actorId: 6, workspaceId: 12, empresa: 'BBTI', cliente: 2 })).digest('hex');
    expect(state.principal.op_payload_hash).toBe(expected);
    expect(await service.crear({ ...body, tempId: null }, key, actor)).toMatchObject({ idempotente: true });
    expect(state.file).toBeNull(); expect(storage.copyObject).not.toHaveBeenCalled();
  });
  it('B/G/L: una OP, archivo propio, actor/fecha y replay sin OCR ni duplicados', async () => {
    const first = await service.crear(withFile(), key, actor);
    const replay = await service.crear(withFile(), key, actor);
    expect(replay).toEqual({ ...first, idempotente: true }); counts();
    expect(files.has(source)).toBe(false); expect(files.has(dest)).toBe(true);
    expect(first.archivoInicial).toEqual({ tempId: 50, archivoId: 20, estado: 'PROMOTED', destinoStorageKey: dest });
    expect(state.audits[1]).toMatchObject({ usuario: actor, despues: { tempId: 50, archivoId: 20, documentoId: 10,
      ordenPagoId: 11, grupoFacturaId: 12, workspaceId: 12, clienteDestinoId: 2, creadoEn: '2026-09-15T12:01:00Z' } });
    expect(tx.mock.calls.map((c: any[]) => c[0].join(' ')).join('\n')).not.toMatch(/pending_ocr|outbox|ocr_resultados|documentos_factura/);
  });
  it('T1 fallida revierte OP y reserva, TEMP reutilizable', async () => {
    fail = 'creation'; await expect(service.crear(withFile(), key, actor)).rejects.toThrow('creation');
    expect(state.doc).toBeNull(); expect(state.row.metadata).toEqual({}); expect(state.audits).toHaveLength(0);
    expect(files.has(source)).toBe(true); expect(storage.copyObject).not.toHaveBeenCalled();
  });
  it('C: COPY falla, reserva durable y retry recupera', async () => {
    fail = 'copy'; await expect(service.crear(withFile(), key, actor)).rejects.toThrow('copy');
    expect(state.row.documento_id).toBe(10); expect(state.file).toBeNull(); expect(files.has(source)).toBe(true);
    fail = null; expect(await service.crear(withFile(), key, actor)).toMatchObject({ idempotente: true, archivoInicial: { estado: 'PROMOTED' } });
    expect(state.audits).toHaveLength(3);
  });
  it.each(['hash','size'])('D: VERIFY %s falla sin asociación/delete', async failure => {
    fail = failure; await expect(service.crear(withFile(), key, actor)).rejects.toThrow('TMP_STORAGE_VERIFICATION_FAILED');
    expect(state.file).toBeNull(); expect(state.audits).toHaveLength(1); expect(storage.deleteObject).not.toHaveBeenCalled();
  });
  it.each(['association','audit'])('E/G: T2 %s falla, rollback y retry sin COPY duplicado', async failure => {
    fail = failure; await expect(service.crear(withFile(), key, actor)).rejects.toThrow(failure);
    expect(state.file).toBeNull(); expect(state.row.metadata.integration.completed).toBe(false);
    expect(state.audits).toHaveLength(1); expect(storage.deleteObject).not.toHaveBeenCalled(); expect(files.has(source)).toBe(true);
    fail = null; await service.crear(withFile(), key, actor); counts();
  });
  it('F: DELETE falla, asociación válida y retry solo cleanup', async () => {
    fail = 'delete'; expect(await service.crear(withFile(), key, actor)).toMatchObject({ archivoInicial: { estado: 'CLEANUP_PENDING' } });
    counts(); expect(files.has(source)).toBe(true);
    fail = null; expect(await service.crear(withFile(), key, actor)).toMatchObject({ archivoInicial: { estado: 'PROMOTED' } });
    counts(); expect(files.has(source)).toBe(false);
  });
  it('H: otra OP no puede apropiarse del TEMP reservado', async () => {
    fail = 'copy'; await expect(service.crear(withFile(), key, actor)).rejects.toThrow('copy');
    await expect(service.crear(withFile(), otherKey, actor)).rejects.toThrow('OP_TEMP_ALREADY_RESERVED');
    expect(state.audits).toHaveLength(1);
  });
  it.each([{ ...actor, id: 8 }, { ...actor, workspaceId: 13 }, { ...actor, empresaCodigo: 'OTRA' }, { ...actor, clienteDestinoId: 3 }])('I: ownership/scope ajeno rechazado antes de OP %#', async a => {
    await expect(service.crear(withFile(), key, a)).rejects.toThrow('TEMP no disponible');
    expect(state.doc).toBeNull(); expect(storage.copyObject).not.toHaveBeenCalled();
  });
  it('J: promoción genérica no salta asociación, incluso usando destino e identidad correctos', async () => {
    fail = 'copy'; await expect(service.crear(withFile(), key, actor)).rejects.toThrow('copy');
    await expect(tmp.promote(50, tmpActor, dest)).rejects.toThrow('TMP_INTEGRATION_REQUIRED');
    expect(storage.copyObject).toHaveBeenCalledTimes(1); expect(storage.deleteObject).not.toHaveBeenCalled();
  });
  it.each(['iniciada', 'completada', 'fallida'])('TEMP %s no crea OP', async estado => {
    state.row.estado = estado;
    await expect(service.crear(withFile(), key, actor)).rejects.toThrow('OP_TEMP_NOT_AVAILABLE'); expect(state.doc).toBeNull();
  });
  it.each([0, -1, 1.5, '50', true])('tempId inválido %s', tempId => {
    expect(() => validarOrdenPago({ ...body, tempId }, key)).toThrow('tempId');
  });
  it.each(['actor','bucket','storageKey','hash','destino','workspaceId'])('no acepta %s desde body', field => {
    expect(() => validarOrdenPago({ ...body, [field]: 'injected' }, key)).toThrow('Campo no autorizado');
  });
  it('controller usa headers de Gateway y permite el mismo endpoint', async () => {
    const orchestrator: any = { crear: jest.fn() };
    new OrdenPagoCreacionController(orchestrator).crear({ 'x-user-id': '6', 'x-workspace-id': '12',
      'x-empresa-codigo': 'BBTI', 'x-cliente-destino-id': '2', 'idempotency-key': key }, withFile());
    expect(orchestrator.crear).toHaveBeenCalledWith(withFile(), key, expect.objectContaining({ id: 6, workspaceId: 12, empresaCodigo: 'BBTI', clienteDestinoId: 2 }));
  });
});
