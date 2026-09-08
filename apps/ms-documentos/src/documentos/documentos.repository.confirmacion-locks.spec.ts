jest.mock('@documental/database', () => ({ sql: { begin: jest.fn() } }));
import { sql } from '@documental/database';
import { DocumentosRepository } from './documentos.repository';

const input = { expedienteId: 7, esPrincipal: true, tipoRelacion: 'principal_oc' };
function setup(options: { owner?: number; ocrArchivo?: number; ocrDocumento?: number;
  documentoEstado?: string; duplicado?: boolean; numero?: string } = {}) {
  const queries: string[] = [];
  const lifecycle: string[] = [];
  const ocr = { id: 20, archivo_id: options.ocrArchivo ?? 12,
    documento_id: options.ocrDocumento ?? 10, estado: 'editado', tipo_propuesto: 'OC',
    metadata: { metadata: { numero: options.numero ?? '123', fechaEmision: '2026-01-01',
      proveedor: 'Proveedor', rucProveedor: '20123456789', montoTotal: '100' } } };
  const tx = jest.fn(async (strings: TemplateStringsArray, ...values: any[]) => {
    const q = strings.join('?').replace(/\s+/g, ' ').trim();
    queries.push(q);
    if (q.startsWith('SELECT archivo_id, documento_id')) return [{ archivo_id: 12, documento_id: 10 }];
    if (q.startsWith('SELECT * FROM documentos.documentos_archivos')) return [{ id: 12, documento_id: options.owner ?? 10, estado: 'activo' }];
    if (q.startsWith('SELECT * FROM documentos.documentos WHERE')) return [{ id: 10, estado: options.documentoEstado ?? 'pendiente_ocr' }];
    if (q.startsWith('SELECT * FROM documentos.ocr_resultados')) return [ocr];
    if (q.includes('FROM documentos.expedientes e')) return [{ id: 7, codigo_expediente: 'EXP', cliente_abreviatura: 'TEST', cliente_destino_id: 1 }];
    if (q.includes('LEFT JOIN LATERAL')) return options.duplicado ? [{ documento_id: 99 }] : [];
    if (q.startsWith('UPDATE documentos.documentos d')) {
      expect(values).toContain(`TEST|OC|${options.numero ?? '123'}`);
      return [{ id: 10, estado: 'confirmado' }];
    }
    if (q.startsWith('INSERT INTO documentos.expediente_documentos')) return [{ documento_id: 10, expediente_id: 7, es_principal: true }];
    if (q.startsWith('UPDATE documentos.ocr_resultados')) return [{ ...ocr, estado: 'confirmado' }];
    return [];
  });
  (sql.begin as jest.Mock).mockImplementation(async callback => {
    lifecycle.push('BEGIN');
    try { const result = await callback(tx); lifecycle.push('COMMIT'); return result; }
    catch (error) { lifecycle.push('ROLLBACK'); throw error; }
  });
  return { queries, lifecycle, tx };
}
describe('R2.1 confirmation contractual locks', () => {
  it('A/E/G: discovery then archivo -> documento -> OCR, canonicalization and V1 on same tx', async () => {
    const { queries, lifecycle } = setup();
    const result = await new DocumentosRepository().confirmarOcrResultadoConExpediente(20, input);
    expect(queries[0]).not.toContain('FOR UPDATE');
    const locks = queries.filter(q => q.includes('FOR UPDATE'));
    expect(locks[0]).toContain('FROM documentos.documentos_archivos');
    expect(locks[1]).toContain('FROM documentos.documentos WHERE');
    expect(locks[2]).toContain('FROM documentos.ocr_resultados');
    expect(result).toMatchObject({ claveDocumental: 'TEST|OC|123', estado: 'confirmado',
      vinculo: { expediente_id: 7, documento_id: 10 } });
    expect(queries.some(q => q.includes('LEFT JOIN LATERAL'))).toBe(true);
    expect(lifecycle).toEqual(['BEGIN', 'COMMIT']);
  });
  it.each([{ owner: 99 }, { ocrArchivo: 99 }, { ocrDocumento: 99 },
    { documentoEstado: 'anulado' }, { documentoEstado: 'duplicado_versionado' }])(
    'B/C/D: locked context is authoritative: %s', async options => {
      const { queries, lifecycle } = setup(options);
      await expect(new DocumentosRepository().confirmarOcrResultadoConExpediente(20, input))
        .rejects.toMatchObject({ code: 'OCR_CONTEXTO_MODIFICADO' });
      expect(queries.some(q => /^(UPDATE|INSERT)/.test(q))).toBe(false);
      expect(lifecycle).toEqual(['BEGIN', 'ROLLBACK']);
    });
  it('uses metadata reread under OCR lock, including an already confirmed document', async () => {
    setup({ numero: '456', documentoEstado: 'confirmado' });
    const result = await new DocumentosRepository().confirmarOcrResultadoConExpediente(20, input);
    expect(result?.claveDocumental).toBe('TEST|OC|456');
  });
  it('F: existing duplicate conflict rolls back without partial association', async () => {
    const { queries, lifecycle } = setup({ duplicado: true });
    await expect(new DocumentosRepository().confirmarOcrResultadoConExpediente(20, input))
      .rejects.toMatchObject({ code: 'DOCUMENTO_DUPLICADO_EN_EXPEDIENTE' });
    expect(queries.some(q => /^(UPDATE|INSERT)/.test(q))).toBe(false);
    expect(lifecycle).toEqual(['BEGIN', 'ROLLBACK']);
  });
});
