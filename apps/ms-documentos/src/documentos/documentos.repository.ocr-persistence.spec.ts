jest.mock('@documental/database', () => ({ sql: Object.assign(jest.fn(), { begin: jest.fn() }) }));
import { sql } from '@documental/database';
import { DocumentosRepository } from './documentos.repository';
const db = sql as unknown as jest.Mock & { begin: jest.Mock };
const params = { documentoId: 10, archivoId: 12, tipoPropuesto: 'FACTURA', estado: 'pendiente_validacion', confidence: 1, claveDocumental: null, metadata: {} };
const row = (estado: string) => ({ id: 20, documento_id: 10, archivo_id: 12, estado, metadata: { numero: 'persistido' } });
function setup(options: { ocr?: any[]; documento?: string; archivo?: string; owner?: number; fail?: boolean } = {}) {
  const queries: string[] = [];
  const lifecycle: string[] = [];
  const tx = jest.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const q = strings.join('?').replace(/\s+/g, ' ').trim(); queries.push(q);
    if (q.includes('FROM documentos.documentos_archivos')) return [{ id: 12, documento_id: options.owner ?? 10, estado: options.archivo ?? 'subido' }];
    if (q.includes('FROM documentos.documentos WHERE')) return [{ id: 10, estado: options.documento ?? 'pendiente_ocr' }];
    if (q.startsWith('SELECT * FROM documentos.ocr_resultados')) {
      expect(values).toEqual([10, 12]);
      return options.ocr ?? [];
    }
    if (q.startsWith('INSERT INTO')) {
      if (options.fail) throw new Error('INSERT_FAILED');
      return [row('pendiente_validacion')];
    }
    throw new Error(`Unexpected query: ${q}`);
  });
  db.mockImplementation(tx);
  db.begin.mockImplementation(async callback => {
    lifecycle.push('BEGIN');
    try { const result = await callback(tx); lifecycle.push('COMMIT'); return result; }
    catch (error) { lifecycle.push('ROLLBACK'); throw error; }
  });
  return { queries, lifecycle, tx };
}
describe('R2 persistence mutex', () => {
  beforeEach(() => jest.clearAllMocks());
  it('A: locks archivo -> documento -> OCR then inserts using only tx', async () => {
    const { queries, lifecycle } = setup();
    await new DocumentosRepository().saveOcrResultado(params);
    expect(queries.slice(0, 3).every(q => q.includes('FOR UPDATE'))).toBe(true);
    expect(queries[0]).toContain('documentos_archivos');
    expect(queries[1]).toContain('FROM documentos.documentos WHERE');
    expect(queries[2]).toContain('ocr_resultados');
    expect(queries.filter(q => q.startsWith('INSERT'))).toHaveLength(1);
    expect(db).not.toHaveBeenCalled();
    expect(lifecycle).toEqual(['BEGIN', 'COMMIT']);
  });
  it.each(['pendiente_validacion', 'confirmado', 'editado'])('B/C/D: reuses persisted %s after locks', async estado => {
    const persisted = row(estado);
    const { queries } = setup({ ocr: [persisted], documento: estado === 'confirmado' ? 'confirmado' : 'pendiente_ocr' });
    const result = await new DocumentosRepository().saveOcrResultado(params);
    expect(result.row).toBe(persisted);
    expect(result.yaExistia).toBe(true);
    expect(queries.some(q => q.startsWith('INSERT'))).toBe(false);
  });
  it.each([
    [{ ocr: [row('editado'), { ...row('confirmado'), id: 21 }] }, 'OCR_REUTILIZACION_AMBIGUA'],
    [{ owner: 99 }, 'OCR_ARCHIVO_DOCUMENTO_INVALIDO'],
    [{ documento: 'anulado' }, 'OCR_DOCUMENTO_NO_ELEGIBLE'],
    [{ documento: 'duplicado_versionado' }, 'OCR_DOCUMENTO_NO_ELEGIBLE'],
    [{ archivo: 'duplicado_absorbido' }, 'OCR_ARCHIVO_NO_ELEGIBLE'],
    [{ archivo: 'anulado' }, 'OCR_ARCHIVO_NO_ELEGIBLE'],
    [{ documento: 'confirmado' }, 'OCR_DOCUMENTO_YA_CONFIRMADO'],
    [{ documento: 'confirmado', ocr: [row('pendiente_validacion')] }, 'OCR_CONFIRMACION_INCONSISTENTE'],
  ])('E/F/G: rejects ineligible/ambiguous persistence (%s)', async (options, code) => {
    const { queries, lifecycle } = setup(options);
    await expect(new DocumentosRepository().saveOcrResultado(params)).rejects.toMatchObject({ code });
    expect(queries.some(q => q.startsWith('INSERT'))).toBe(false);
    expect(lifecycle).toEqual(['BEGIN', 'ROLLBACK']);
  });
  it('I: forceReprocess keeps legacy insert without new guards or deduplication', async () => {
    const { queries } = setup({ documento: 'confirmado', ocr: [row('confirmado')] });
    await new DocumentosRepository().saveOcrResultado({ ...params, forceReprocess: true });
    expect(db.begin).not.toHaveBeenCalled();
    expect(queries).toHaveLength(1);
    expect(queries[0]).toMatch(/^INSERT/);
  });
  it('J: propagates persistence failure to transaction rollback, no commit', async () => {
    const { lifecycle } = setup({ fail: true });
    await expect(new DocumentosRepository().saveOcrResultado(params)).rejects.toThrow('INSERT_FAILED');
    expect(lifecycle).toEqual(['BEGIN', 'ROLLBACK']);
  });
});
