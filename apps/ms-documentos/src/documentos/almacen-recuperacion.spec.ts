jest.mock('@documental/database', () => ({ sql: Object.assign(jest.fn(), { begin: jest.fn() }) }));
import { sql } from '@documental/database';
import { AlmacenRecuperacionRepository, identidadAlmacen } from './almacen-recuperacion.repository';
import { DocumentosRepository } from './documentos.repository';
const contexto = { expedienteId: 9, grupoFacturaId: 50, documentoBaseId: 106, facturaDocumentoId: 212 };
const scope = { empresa: 'TEST', workspaceId: 7, clienteDestinoId: 8 };
const fuente = { rucEmisor: '20123456789', serie: 'T001', numero: '12', proveedor: 'Proveedor', fechaEmision: '2026-01-01' };
function candidato(tipo = 'GUIA_REMISION', estado: string | null = 'pendiente_validacion') {
  return { documentoId: 10, archivoId: 11, tipoDocumental: tipo, estadoDocumento: 'pendiente_ocr', actuales: 1,
    archivoMetadata: { grupoFacturaId: 50, tipoRelacionSugerida: tipo === 'FACTURA' ? 'adjunto_factura' : tipo === 'GUIA_REMISION' ? 'adjunto_guia' : 'adjunto_nota_ingreso' },
    documentoMetadata: {}, workspace_id: null, empresa_codigo: null, cliente_destino_id: null, expediente_id: null,
    ocr: estado ? [{ id: 20, estado, tipo_propuesto: tipo, metadata: { metadata: fuente } }] : [] };
}
const destino = { id: 99, tipo_documental: 'GUIA_REMISION', clave_documental: 'TEST|GUIA_REMISION|20123456789|T001|12', vinculos: 1 };
async function listar(row: any, destinos: any[] = []) {
  (sql as unknown as jest.Mock).mockResolvedValue([{ autorizados: 1, candidatos: [row], destinos }]);
  return new AlmacenRecuperacionRepository().listar(contexto, scope);
}
describe('Almacén recuperación persistida', () => {
  it.each(['GUIA_REMISION','NOTA_INGRESO'].flatMap(tipo => ['pendiente_validacion','editado'].map(estado => [tipo, estado])))('recupera %s %s legacy', async (tipo, estado) => {
    const result = await listar(candidato(tipo, estado));
    expect(result.data[0]).toMatchObject({ tipoDocumental: tipo, estadoOcr: estado, clasificacion: 'IDENTIFICADO', accionSugerida: 'VALIDAR_OCR' });
  });
  it('sin OCR permite manual, sin inferir del filename', async () => {
    expect((await listar({ ...candidato('NOTA_INGRESO', null), filename: 'NI-123.pdf' })).data[0])
      .toMatchObject({ clasificacion: 'PENDIENTE_OCR', accionSugerida: 'VALIDAR_MANUAL', ocrResultadoId: null });
  });
  it.each(['rechazado','confirmado','confirmado_como_version'])('excluye OCR %s', async estado => {
    expect((await listar(candidato('GUIA_REMISION', estado))).data).toEqual([]);
  });
  it('OCR múltiples no accionables', async () => {
    const row = candidato(); row.ocr.push({ ...row.ocr[0], id: 21 });
    expect((await listar(row)).conflictos[0].codigo).toBe('OCR_MULTIPLE');
  });
  it.each(['workspace_id','empresa_codigo','cliente_destino_id','expediente_id'])('columna %s contradictoria no recuperable', async field => {
    expect((await listar({ ...candidato(), [field]: '999' })).data).toEqual([]);
  });
  it('grupo/principal contradictorio no recuperable', async () => {
    const row = candidato(); (row.archivoMetadata as any).documentoBaseId = 99;
    expect((await listar(row)).data).toEqual([]);
  });
  it('guía equivalente única permite versión; NI nunca', async () => {
    expect((await listar(candidato(), [destino])).data[0]).toMatchObject({ accionSugerida: 'AGREGAR_VERSION', documentoIdDestino: 99 });
    expect((await listar(candidato('NOTA_INGRESO'), [{ ...destino, clave_documental: 'TEST|NOTA_INGRESO|12' }])).data[0].accionSugerida).toBe('VALIDAR_OCR');
  });
  it('destinos múltiples conserva revisión segura', async () => {
    expect((await listar(candidato(), [destino, { ...destino, id: 98 }])).data[0].accionSugerida).toBe('VALIDAR_OCR');
  });
  it('identidad NI no añade RUC/serie/año; guía prioriza emisor', () => {
    expect(identidadAlmacen('TEST','NOTA_INGRESO', { numero: '12', serie: 'X', ruc: '0', anio: 2026 })).toBe('TEST|NOTA_INGRESO|12');
    expect(identidadAlmacen('TEST','GUIA_REMISION', { ...fuente, ruc: '99999999999' })).toBe(destino.clave_documental);
    expect(identidadAlmacen('TEST','GUIA_REMISION', { ...fuente, serie: '' })).toBeNull();
  });
  it('scope operativo ambiguo rechaza, SQL excluye vínculo V2 e históricos', async () => {
    (sql as unknown as jest.Mock).mockResolvedValue([{ autorizados: 2 }]);
    await expect(new AlmacenRecuperacionRepository().listar(contexto, scope)).rejects.toThrow();
    const query = (sql as unknown as jest.Mock).mock.calls.at(-1)[0].join('?').replace(/\s+/g, ' ');
    for (const expected of ["a.tipo_version = 'original'", 'a.es_version_actual = true', 'NOT EXISTS (SELECT 1 FROM documentos.grupo_factura_documentos',
      'gf.factura_documento_id = ?', 'dop.documento_id = ?', 'co.empresa_codigo = ?', 'co.cliente_destino_id = ?', 'e.id = ?']) expect(query).toContain(expected);
  });
});

describe('Factura Almacén: versión persistida tras timeout', () => {
  const factura = { ...destino, id: 212, tipo_documental: 'FACTURA', clave_documental: 'TEST|FACTURA|20123456789|T001|12' };
  it.each([false, true])('identifica candidato provisional o adjunto al destino (%s)', async adjunto => {
    const row = { ...candidato('FACTURA'), versionAdjunta: adjunto, documentoId: adjunto ? 212 : 10 };
    expect((await listar(row, [factura])).data[0]).toMatchObject({ clasificacion: 'IDENTIFICADO', accionSugerida: 'AGREGAR_VERSION', documentoIdDestino: 212 });
  });
  it('identidad insuficiente o sin OCR conserva pendiente; otro destino/identidad no autoriza', async () => {
    const row = candidato('FACTURA'); row.ocr[0].metadata.metadata = { ...fuente, serie: '' };
    expect((await listar(row, [factura])).data[0].clasificacion).toBe('PENDIENTE_OCR');
    expect((await listar(candidato('FACTURA', null), [factura])).data[0].clasificacion).toBe('PENDIENTE_OCR');
    expect((await listar(candidato('FACTURA'), [{ ...factura, clave_documental: 'OTRA' }])).data[0].accionSugerida).toBe('VALIDAR_OCR');
    expect((await listar(candidato('FACTURA'), [factura, factura])).data[0].accionSugerida).toBe('VALIDAR_OCR');
  });
  it('versiona archivo, absorbe provisional y retry de snapshot resuelto no escribe', async () => {
    const row = candidato('FACTURA');
    const f = transaccion(row, [{ ...factura, id: 99 }]);
    const repo = new DocumentosRepository();
    await repo.agregarArchivoComoVersion({ documentoId: 99, archivoId: 11, recuperacionAlmacen: { contexto, scope, documentoIdCandidato: 10 } });
    expect(f.queries.some(q => q.includes("estado = 'duplicado_versionado'"))).toBe(true);
    expect(f.queries.some(q => q.includes("estado = 'activo'"))).toBe(true);
    expect(f.queries.some(q => q.includes("estado = 'confirmado_como_version'"))).toBe(true);
    const retry = transaccion(row, [factura], 99); // file already belongs to destination, never re-move it.
    await expect(repo.agregarArchivoComoVersion({ documentoId: 99, archivoId: 11, recuperacionAlmacen: { contexto, scope, documentoIdCandidato: 10 } })).rejects.toThrow();
    expect(retry.queries.some(q => /^(INSERT|UPDATE|DELETE)/.test(q))).toBe(false);
    expect(retry.lifecycle).toEqual(['BEGIN','ROLLBACK']);
  });
});

function transaccion(row: any, destinos: any[] = [], owner = 10, otros: any[] = [], duplicados: any[] = []) {
  const queries: string[] = []; const lifecycle: string[] = [];
  const tx = jest.fn(async (strings: TemplateStringsArray, ...values: any[]) => {
    const q = strings.join('?').replace(/\s+/g, ' ').trim(); queries.push(q);
    if (q.startsWith('WITH contexto')) return [{ autorizados: 1, candidatos: [row, ...otros], destinos }];
    if (q.includes('LEFT JOIN LATERAL')) return duplicados;
    if (q.startsWith('SELECT * FROM documentos.documentos_archivos')) return [{ id: 11, documento_id: owner, estado: 'subido' }];
    if (q.startsWith('SELECT * FROM documentos.documentos WHERE')) return [{ id: values[0], estado: 'pendiente_ocr' }];
    if (q.startsWith('SELECT * FROM documentos.ocr_resultados')) return row.ocr;
    if (q.includes('FROM documentos.expedientes e')) return [{ id: 9, empresa_codigo: 'TEST', cliente_abreviatura: 'TEST', cliente_destino_id: 8, codigo_expediente: 'EXP' }];
    if (q.includes('FROM documentos.expediente_documentos ed JOIN documentos.documentos d')) return [{ documento_id: 106, tipo_documental: 'OC', estado: 'confirmado', es_principal: true }];
    if (q.startsWith('UPDATE documentos.documentos d')) return [{ id: 10, estado: 'confirmado' }];
    if (q.startsWith('INSERT INTO documentos.expediente_documentos')) return [{ documento_id: 10, expediente_id: 9 }];
    if (q.includes('AS siguiente_version')) return [{ siguiente_version: 2 }];
    if (q.startsWith('UPDATE documentos.documentos_archivos SET documento_id')) return [{ id: 11, documento_id: 99, version: 2, es_version_actual: true }];
    if (q.startsWith('UPDATE documentos.ocr_resultados')) return [{ id: 20, estado: 'confirmado_como_version', archivo_id: 11, documento_id: 99 }];
    return [];
  });
  (sql.begin as jest.Mock).mockImplementation(async (...args: any[]) => {
    lifecycle.push('BEGIN'); try { const result = await args.at(-1)(tx); lifecycle.push('COMMIT'); return result; }
    catch (e) { lifecycle.push('ROLLBACK'); throw e; }
  });
  return { tx, queries, lifecycle };
}
describe('Almacén manual/version transaccionales', () => {
  it.each(['GUIA_REMISION','NOTA_INGRESO'])('un provisional equivalente %s del grupo no bloquea confirmación explícita', async tipo => {
    const otro = { ...candidato(tipo), documentoId: 30, archivoId: 31 };
    const { tx, queries } = transaccion(candidato(tipo, null), [], 10, [otro], [
      { documento_id: 30, estado: 'pendiente_ocr', tipo_documental: tipo },
    ]);
    const result = await new DocumentosRepository().confirmarRecuperacionAlmacenConExecutor(tx as any, 10, 11, { contexto, scope, metadata: fuente });
    expect(result.estado).toBe('confirmado');
    expect(queries.some(q => q.includes("estado = 'duplicado_versionado'"))).toBe(false);
  });
  it.each(['confirmado','multiple','otro_grupo'])('duplicado %s conserva conflicto sin escrituras', async caso => {
    const otro = { ...candidato(), documentoId: 30, archivoId: 31 };
    if (caso === 'otro_grupo') otro.archivoMetadata.grupoFacturaId = 99;
    const duplicate = { documento_id: 30, estado: caso === 'confirmado' ? 'confirmado' : 'pendiente_ocr', tipo_documental: 'GUIA_REMISION' };
    const { tx, queries } = transaccion(candidato('GUIA_REMISION', null), [], 10, [otro], caso === 'multiple' ? [duplicate, { ...duplicate, documento_id: 40 }] : [duplicate]);
    await expect(new DocumentosRepository().confirmarRecuperacionAlmacenConExecutor(tx as any, 10, 11, { contexto, scope, metadata: fuente }))
      .rejects.toMatchObject({ code: 'DOCUMENTO_DUPLICADO_EN_EXPEDIENTE' });
    expect(queries.some(q => /^(INSERT|UPDATE|DELETE)/.test(q))).toBe(false);
  });
  it.each(['GUIA_REMISION','NOTA_INGRESO'])('manual %s sin OCR artificial', async tipo => {
    const { tx, queries } = transaccion(candidato(tipo, null));
    const result = await new DocumentosRepository().confirmarRecuperacionAlmacenConExecutor(tx as any, 10, 11, { contexto, scope, metadata: fuente });
    expect(result).toMatchObject({ estado: 'confirmado', tipoDocumental: tipo, documentoBaseId: 106 });
    expect(result.ocrResultado).toBeUndefined();
    expect(queries.some(q => /^(INSERT INTO|UPDATE) documentos.ocr_resultados/.test(q))).toBe(false);
    expect(queries.some(q => q.startsWith('INSERT INTO documentos.expediente_documentos'))).toBe(true);
  });
  it('OCR tardío bloquea confirmación manual antes de escribir', async () => {
    const { tx, queries } = transaccion(candidato());
    await expect(new DocumentosRepository().confirmarRecuperacionAlmacenConExecutor(tx as any, 10, 11, { contexto, scope, metadata: fuente })).rejects.toMatchObject({ code: 'ALMACEN_RECOVERY_CONFLICTO' });
    expect(queries.some(q => /^(UPDATE|INSERT)/.test(q))).toBe(false);
  });
  it('versión guía preserva archivo y absorbe provisional', async () => {
    const { queries, lifecycle } = transaccion(candidato(), [destino]);
    const result = await new DocumentosRepository().agregarArchivoComoVersion({ documentoId: 99, archivoId: 11,
      recuperacionAlmacen: { contexto, scope, documentoIdCandidato: 10 } });
    expect(result).toMatchObject({ documentoId: 99, archivoId: 11, version: 2 });
    expect(queries.some(q => q.includes("estado = 'duplicado_versionado'"))).toBe(true);
    expect(queries.some(q => q.startsWith('INSERT'))).toBe(false);
    expect(lifecycle).toEqual(['BEGIN','COMMIT']);
  });
  it.each(['destino','scope','NI'])('cambio %s impide versión y rollback', async reason => {
    const row = candidato(reason === 'NI' ? 'NOTA_INGRESO' : 'GUIA_REMISION');
    if (reason === 'scope') (row as any).workspace_id = 999;
    const { queries, lifecycle } = transaccion(row, reason === 'destino' ? [] : [destino]);
    await expect(new DocumentosRepository().agregarArchivoComoVersion({ documentoId: 99, archivoId: 11,
      recuperacionAlmacen: { contexto, scope, documentoIdCandidato: 10 } })).rejects.toMatchObject({ code: 'VERSION_CANDIDATO_CAMBIO' });
    expect(queries.some(q => /^(INSERT|UPDATE|DELETE)/.test(q))).toBe(false);
    expect(lifecycle).toEqual(['BEGIN','ROLLBACK']);
  });
});
