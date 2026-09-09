jest.mock('@documental/database', () => ({ sql: Object.assign(jest.fn(), { begin: jest.fn() }) }));
import { sql } from '@documental/database';
import { DocumentosRepository } from './documentos.repository';
import { ExpedientesRepository } from '../expedientes/expedientes.repository';
import { OrquestarConfirmacionDocumentalV2UseCase } from '../documental-v2/use-cases/orquestar-confirmacion-documental-v2.usecase';
const key = 'TEST|FACTURA|20123456789|E001|137';
const scope = { workspaceId: 7, clienteDestinoId: 8, empresa: 'TEST' };
const input = { expedienteId: 1, documentoBaseId: 2, esPrincipal: false, tipoRelacion: 'adjunto_factura',
  metadata: { tipoDocumental: 'FACTURA', rucProveedor: '20123456789', proveedor: 'Proveedor', serie: 'E001', numero: '137',
    montoTotal: '2730.02', fechaEmision: '2026-01-01',
    contextoValidacion: { origen: 'COMPRAS_EDITAR_MODAL', confirmadoDesde: 'compras_editar' } } };
// Logical E2E: actual confirmation/orchestration/classification/version methods,
// SQL and V2 collaborators simulated in memory. No database or storage calls.
function fixture(options: { confirmed?: boolean; extra?: boolean; mismatch?: string } = {}) {
  const doc = (id: number) => ({ id, estado: 'pendiente_ocr', tipo_documental: 'FACTURA', clave_documental: null as string | null });
  let state: any = { docs: [doc(10), doc(20)], files: [10, 20].map(id => ({ id: id + 1, documento_id: id, estado: 'activo',
    workspace_id: 7, empresa_codigo: 'TEST', cliente_destino_id: 8, expediente_id: 1,
    metadata: { documentoBaseId: 2, tipoRelacion: 'adjunto_factura', tipoDocumental: 'FACTURA' } })),
    ocr: [10, 20].map(id => ({ id: id + 2, documento_id: id, archivo_id: id + 1, estado: 'pendiente_validacion',
      tipo_propuesto: 'FACTURA', clave_documental: key, metadata: { metadata: input.metadata } })), groups: [] };
  if (options.confirmed) { state.docs[0].estado = 'confirmado'; state.docs[0].clave_documental = key; state.groups.push(10); }
  if (options.extra) state.docs.push(doc(30));
  const queries: string[] = [];
  const tx = jest.fn(async (strings: TemplateStringsArray, ...values: any[]) => {
    const q = strings.join('?').replace(/\s+/g, ' ').trim(); queries.push(q);
    if (q.startsWith('SELECT archivo_id, documento_id')) return state.ocr.filter((o: any) => o.id === values[0]);
    if (q.startsWith('SELECT * FROM documentos.documentos_archivos')) {
      return state.files.filter((a: any) => a.id === values[0] || (q.includes('OR documento_id') && a.documento_id === values[1]));
    }
    if (q.startsWith('SELECT * FROM documentos.documentos ')) return state.docs.filter((d: any) => d.id === values[0]);
    if (q.startsWith('SELECT * FROM documentos.ocr_resultados')) return state.ocr.filter((o: any) => o.id === values[0]);
    if (q.includes('FROM documentos.expedientes e')) return [{ id: 1, empresa_codigo: 'TEST', cliente_destino_id: 8, cliente_abreviatura: 'TEST', codigo_expediente: 'EXP' }];
    if (q.includes('FROM documentos.expediente_documentos ed JOIN documentos.documentos d')) return [{ documento_id: 2, tipo_documental: 'OC', estado: 'confirmado', es_principal: true }];
    if (q.includes('LEFT JOIN LATERAL')) return state.docs.filter((d: any) => d.id !== values[1] && !['anulado', 'duplicado_versionado'].includes(d.estado))
      .map((d: any) => ({ documento_id: d.id, estado: d.estado, tipo_documental: 'FACTURA', clave_documental: key }));
    if (q.startsWith('WITH principal')) return [{ autorizado: true,
      destinos: state.docs.filter((d: any) => d.estado === 'confirmado' && state.groups.includes(d.id))
        .map((d: any) => ({ id: d.id, clave_documental: d.clave_documental, vinculos: 1 })),
      candidatos: state.docs.filter((d: any) => d.estado === 'pendiente_ocr' && !(options.mismatch && d.id === 10))
        .map((d: any) => ({ documentoId: d.id, archivoId: d.id + 1, actuales: 1, estadoDocumento: d.estado,
          documentoMetadata: {}, ocr: state.ocr.filter((o: any) => o.documento_id === d.id) })),
    }];
    if (q.startsWith('UPDATE documentos.documentos d SET')) {
      const d = state.docs.find((d: any) => d.id === values.at(-1)); d.estado = 'confirmado'; d.clave_documental = key; return [d];
    }
    if (q.startsWith('INSERT INTO documentos.expediente_documentos')) return [{ documento_id: values[1], expediente_id: 1, es_principal: false }];
    if (q.startsWith('UPDATE documentos.ocr_resultados SET estado')) {
      const o = state.ocr.find((o: any) => o.id === values.at(-1)); o.estado = 'confirmado'; return [o];
    }
    if (q.includes('AS siguiente_version')) return [{ siguiente_version: 2 }];
    if (q.startsWith('UPDATE documentos.documentos_archivos SET documento_id')) {
      const a = state.files.find((a: any) => a.id === values.at(-1)); a.documento_id = values[0]; a.version = 2; a.es_version_actual = true; return [a];
    }
    if (q.startsWith("UPDATE documentos.documentos SET estado = 'duplicado_versionado'")) {
      state.docs.find((d: any) => d.id === values.at(-1)).estado = 'duplicado_versionado'; return [];
    }
    if (q.startsWith('UPDATE documentos.ocr_resultados SET documento_id')) {
      const o = state.ocr.find((o: any) => o.archivo_id === values.at(-1)); o.documento_id = values[0]; o.estado = 'confirmado_como_version'; return [o];
    }
    return [];
  });
  (sql as unknown as jest.Mock).mockImplementation(tx);
  (sql.begin as jest.Mock).mockImplementation(async (...args: any[]) => {
    const snapshot = JSON.parse(JSON.stringify(state));
    try { return await args.at(-1)(tx); } catch (e) { state = snapshot; throw e; }
  });
  const repo = new DocumentosRepository();
  const group = { execute: jest.fn(async (args: any, executor: any) => {
    expect(executor).toBe(tx); state.groups.push(args.facturaDocumentoId);
    return { grupoFactura: { id: 1 }, idempotente: false };
  }) };
  const usecase = new OrquestarConfirmacionDocumentalV2UseCase(repo,
    { buscarPorId: async () => ({ id: 2, tipoDocumental: 'OC' }) } as any, {} as any,
    { execute: async () => ({ contenedorOperativo: { id: 1 } }) } as any,
    { execute: async () => ({ documentoOperativoPrincipal: { id: 2 } }) } as any, group as any, {} as any);
  return { repo, usecase, queries, state: () => state };
}
describe('Recuperación de dos facturas provisionales iguales', () => {
  it('confirma B, mantiene A, reclasifica A y solo luego versiona A en B', async () => {
    const f = fixture();
    await f.usecase.execute(22, input);
    expect(f.state().docs.map((d: any) => d.estado)).toEqual(['pendiente_ocr', 'confirmado']);
    expect(f.state().files.map((a: any) => a.documento_id)).toEqual([10, 20]);
    const pendientes = await new ExpedientesRepository().findFacturasPendientes(1, 2, scope);
    expect(pendientes.data).toHaveLength(1);
    expect(pendientes.data[0]).toMatchObject({ documentoId: 10, clasificacion: 'IDENTIFICADO', accionSugerida: 'AGREGAR_VERSION', documentoIdDestino: 20 });
    await f.repo.agregarArchivoComoVersion({ documentoId: 20, archivoId: 11,
      recuperacionCompras: { expedienteId: 1, principalId: 2, documentoIdCandidato: 10, scope } });
    expect(f.state().docs.map((d: any) => d.estado)).toEqual(['duplicado_versionado', 'confirmado']);
    expect(f.state().files).toHaveLength(2);
    expect(f.state().files.map((a: any) => a.documento_id)).toEqual([20, 20]);
    expect(f.state().ocr[0].estado).toBe('confirmado_como_version');
    expect(f.state().groups).toEqual([20]);
    expect(f.queries.some(q => q.includes('ORDER BY a.id FOR UPDATE'))).toBe(true);
  });
  it.each([{ confirmed: true }, { extra: true }, ...['expediente', 'principal', 'workspace', 'empresa', 'cliente'].map(mismatch => ({ mismatch }))])(
    'no habilita excepción frente a confirmado, ambigüedad o fuera de scope: %s', async options => {
      const f = fixture(options);
      await expect(f.usecase.execute(22, input)).rejects.toMatchObject({ code: 'DOCUMENTO_DUPLICADO_EN_EXPEDIENTE' });
      expect(f.state().docs[1].estado).toBe('pendiente_ocr');
      expect(f.state().files[0].documento_id).toBe(10);
    });
  it('fuera del flujo explícito Compras mantiene rechazo anterior', async () => {
    const f = fixture();
    await expect(f.usecase.execute(22, { ...input, metadata: { ...input.metadata, contextoValidacion: { origen: 'ALMACEN' } } }))
      .rejects.toMatchObject({ code: 'DOCUMENTO_DUPLICADO_EN_EXPEDIENTE' });
    expect(f.queries.some(q => q.includes('ORDER BY a.id FOR UPDATE'))).toBe(false);
  });
});
