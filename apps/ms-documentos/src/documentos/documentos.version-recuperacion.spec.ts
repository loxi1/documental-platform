jest.mock('@documental/database', () => ({ sql: { begin: jest.fn() } }));
jest.mock('@documental/shared', () => ({ NatsSubjects: { AuthValidateToken: 'auth.validate' } }));
import { sql } from '@documental/database';
import { of } from 'rxjs';
import { DocumentosRepository } from './documentos.repository';
import { DocumentosService } from './documentos.service';
const recuperacionCompras = { expedienteId: 1, principalId: 2, documentoIdCandidato: 10,
  scope: { workspaceId: 7, clienteDestinoId: 8, empresa: 'TEST' } };
const params = { documentoId: 99, archivoId: 11, recuperacionCompras };
function setup(options: { invalid?: boolean; owner?: number; fail?: boolean } = {}) {
  const queries: string[] = []; const lifecycle: string[] = [];
  const tx = jest.fn(async (strings: TemplateStringsArray, ...values: any[]) => {
    const q = strings.join('?').replace(/\s+/g, ' ').trim(); queries.push(q);
    if (q.startsWith('WITH principal')) return [{ autorizado: true,
      destinos: [{ id: 99, clave_documental: 'TEST|FACTURA|20123456789|E001|137', vinculos: 1 }],
      candidatos: options.invalid ? [] : [{ documentoId: 10, archivoId: 11, actuales: 1,
        ocr: [{ id: 20, estado: 'editado', tipo_propuesto: 'FACTURA', metadata: { metadata: { rucProveedor: '20123456789', serie: 'E001', numero: '137' } } }] }],
    }];
    if (q.startsWith('SELECT * FROM documentos.documentos_archivos')) return [{ id: 11, documento_id: options.owner ?? 10 }];
    if (q.startsWith('SELECT * FROM documentos.documentos ')) return [{ id: 99, estado: 'confirmado' }];
    if (q.includes('AS siguiente_version')) return [{ siguiente_version: 2 }];
    if (q.startsWith('UPDATE documentos.documentos_archivos SET documento_id')) {
      expect(values).toContain(99); return [{ id: 11, documento_id: 99, version: 2, es_version_actual: true }];
    }
    if (q.startsWith('UPDATE documentos.ocr_resultados')) {
      if (options.fail) throw new Error('FAIL_INSERT');
      return [{ id: 20, documento_id: 99, archivo_id: 11, estado: 'confirmado_como_version' }];
    }
    return [];
  });
  (sql.begin as jest.Mock).mockImplementation(async (...args: any[]) => {
    lifecycle.push('BEGIN');
    try { const result = await args.at(-1)(tx); lifecycle.push('COMMIT'); return result; }
    catch (e) { lifecycle.push('ROLLBACK'); throw e; }
  });
  return { queries, lifecycle, tx };
}
describe('Versionado de recuperación transaccional', () => {
  it('valida con mismo executor, conserva archivo, absorbe provisional y no crea factura/grupo', async () => {
    const { queries, lifecycle } = setup();
    const result = await new DocumentosRepository().agregarArchivoComoVersion(params);
    expect(result).toMatchObject({ documentoId: 99, archivoId: 11, documentoAnteriorId: 10, version: 2,
      ocrResultado: { estado: 'confirmado_como_version' } });
    expect(queries[0]).toContain('documentos_archivos');
    expect(queries[1]).toContain('documentos.documentos');
    expect(queries[2]).toContain('ocr_resultados');
    expect(queries.some(q => q.includes("estado = 'duplicado_versionado'"))).toBe(true);
    expect(queries.some(q => q.includes('SET es_version_actual = false'))).toBe(true);
    expect(queries.some(q => q.startsWith('INSERT'))).toBe(false);
    expect(queries.some(q => q.startsWith('DELETE FROM documentos.documentos_archivos'))).toBe(false);
    expect(lifecycle).toEqual(['BEGIN', 'COMMIT']);
    expect((sql.begin as jest.Mock).mock.calls.at(-1)[0]).toBe('isolation level serializable');
  });
  it.each([{ invalid: true }, { owner: 50 }])('contexto/identidad o propiedad cambiada rechaza sin mover %s', async options => {
    const { queries, lifecycle } = setup(options);
    await expect(new DocumentosRepository().agregarArchivoComoVersion(params)).rejects.toMatchObject({ code: 'VERSION_CANDIDATO_CAMBIO' });
    expect(queries.some(q => /^(UPDATE|DELETE|INSERT)/.test(q))).toBe(false);
    expect(lifecycle).toEqual(['BEGIN', 'ROLLBACK']);
  });
  it('fallo durante persistencia provoca rollback', async () => {
    const { lifecycle } = setup({ fail: true });
    await expect(new DocumentosRepository().agregarArchivoComoVersion(params)).rejects.toThrow('FAIL_INSERT');
    expect(lifecycle).toEqual(['BEGIN', 'ROLLBACK']);
  });
  it('camino existente Almacén no aplica clasificación ni aislamiento nuevo', async () => {
    const { queries } = setup();
    await new DocumentosRepository().agregarArchivoComoVersion({ documentoId: 99, archivoId: 11 });
    expect((sql.begin as jest.Mock).mock.calls.at(-1)).toHaveLength(1);
    expect(queries.some(q => q.startsWith('WITH principal'))).toBe(false);
  });
  it('service usa scope del token y traduce conflicto a 409', async () => {
    const repo = { agregarArchivoComoVersion: jest.fn().mockRejectedValue({ code: 'VERSION_CANDIDATO_CAMBIO' }) };
    const nats = { send: jest.fn().mockReturnValue(of({ valid: true, payload: { workspaceId: 7, clienteDestinoId: 8, empresa: 'TEST' } })) };
    const service = new DocumentosService(repo as any, {} as any, {} as any, nats as any);
    await expect(service.agregarArchivoComoVersion(99, 11, { recuperacionCompras }, undefined, 'Bearer test'))
      .rejects.toMatchObject({ status: 409 });
    expect(repo.agregarArchivoComoVersion).toHaveBeenCalledWith(expect.objectContaining({ recuperacionCompras }));
  });
});
