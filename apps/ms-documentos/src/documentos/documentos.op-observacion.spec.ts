jest.mock('@documental/database', () => ({ sql: jest.fn() }));
import { sql } from '@documental/database';
import { ConflictException } from '@nestjs/common';
import { DocumentosRepository } from './documentos.repository';

describe('OP observation identity and consumed-decision fence', () => {
  const repo = new DocumentosRepository();
  const input = { expedienteId: 26, documentoBaseId: 98, grupoFacturaId: 32, origenObligacion: 'ORDEN_PAGO', decisionCorrespondencia: { accion: 'OBSERVAR', motivo: 'No corresponde' } };
  const file = { id: 102, documento_id: 102, estado: 'subido', expediente_id: 26, empresa_codigo: 'BBTI', cliente_destino_id: 1, metadata: { documentoBaseId: 98, grupoFacturaId: 32, tipoRelacion: 'adjunto_transferencia' } };
  const ocr = { id: 72, documento_id: 102, archivo_id: 102, metadata: {} };
  function txFor(result: any, foreign = false) { return jest.fn(async (strings: TemplateStringsArray) => {
    const q = strings.join('?');
    if (q.includes('SELECT archivo_id, documento_id')) return [{ archivo_id: 102, documento_id: 102 }];
    if (q.includes('FROM documentos.documentos_archivos')) return [foreign ? { ...file, empresa_codigo: 'OTHER' } : file];
    if (q.includes('FROM documentos.documentos\n')) return [{ id: 102, estado: 'confirmado' }];
    if (q.includes('FROM documentos.ocr_resultados')) return [result];
    if (q.includes('FROM documentos.expedientes')) return [{ id: 26, empresa_codigo: 'BBTI', cliente_destino_id: 1 }];
    throw new Error('CONTINUE_EXISTING_CONFIRMATION');
  }); }
  it('rejects a consumed retry under the existing file/document/OCR locks, before writes', async () => {
    const tx = txFor({ ...ocr, metadata: { validacionPendientePago: { estado: 'CONSUMIDO', accion: 'OBSERVAR' } } });
    await expect(repo.confirmarOcrResultadoConExpedienteConExecutor(tx as any, 72, input as any, 1)).rejects.toMatchObject({ response: { code: 'PAGO_DECISION_YA_CONSUMIDA' } });
    const queries = tx.mock.calls.map(c => c[0].join('?'));
    expect(queries.filter(q => q.includes('FOR UPDATE'))).toHaveLength(3);
    expect(queries.some(q => /UPDATE |INSERT INTO/.test(q))).toBe(false);
  });
  it.each([
    { grupoFacturaId: 999 }, { documentoBaseId: 999 }, { expedienteId: 999 },
  ])('rejects wrong OP context %j before mutation', async change => {
    const tx = txFor(ocr);
    await expect(repo.confirmarOcrResultadoConExpedienteConExecutor(tx as any, 72, { ...input, ...change } as any, 1)).rejects.toMatchObject({ response: { code: 'PAGO_OBSERVACION_CONTEXTO_INVALIDO' } });
  });
  it('requires an authenticated actor and nonempty motive', async () => {
    for (const [actor, motivo] of [[0, 'reason'], [1, ' ']] as const) {
      await expect(repo.confirmarOcrResultadoConExpedienteConExecutor(txFor(ocr) as any, 72, { ...input, decisionCorrespondencia: { accion: 'OBSERVAR', motivo } } as any, actor)).rejects.toBeInstanceOf(ConflictException);
    }
  });
  it('valid observation without previous draft continues through existing confirmation', async () => {
    await expect(repo.confirmarOcrResultadoConExpedienteConExecutor(txFor(ocr) as any, 72, input as any, 1)).rejects.toThrow('CONTINUE_EXISTING_CONFIRMATION');
  });
  it('consumption can create canonical observation from context, but never overwrite a consumed decision', async () => {
    const tx = jest.fn().mockResolvedValue([{ id: 72 }]);
    const context = { version: 1, identidad: { ocrResultadoId: 72, documentoId: 102, archivoId: 102, grupoFacturaId: 32 }, request: { metadata: { moneda: 'PEN' } } };
    await repo.consumirValidacionPendientePagoConExecutor(tx as any, 72, 'OBSERVAR', 'No corresponde', context);
    const [strings, ...args] = tx.mock.calls[0];const q = strings.join('?');
    expect(q).toContain("metadata->'validacionPendientePago' IS NULL");
    expect(q).toContain("= 'PENDIENTE_DECISION'");
    expect(args).toContain(JSON.stringify(context));expect(args).toContain(true);
  });
  it('late pending-decision draft cannot overwrite an already consumed decision', async () => {
    (sql as unknown as jest.Mock).mockResolvedValueOnce([]);
    await repo.guardarValidacionPendientePago(72,{estado:'PENDIENTE_DECISION'});
    const query=(sql as unknown as jest.Mock).mock.calls.at(-1)[0].join('?');
    expect(query).toContain("COALESCE(metadata #>> '{validacionPendientePago,estado}', '') <> 'CONSUMIDO'");
  });

  it('rejects an archivo from another company before documentary or financial writes', async () => {
    await expect(repo.confirmarOcrResultadoConExpedienteConExecutor(txFor(ocr,true) as any,72,input as any,1)).rejects.toMatchObject({response:{code:'PAGO_OBSERVACION_CONTEXTO_INVALIDO'}});
  });

  it.each([undefined, { accion: 'OBSERVAR', motivo: 'Sustento duplicado' }])(
    'G2 reproduce la barrera compartida ante duplicado, decisión %j, sin escrituras',
    async decisionCorrespondencia => {
      const previousPayment = { documentoId: 101, estado: 'confirmado', monto: 250 };
      const before = JSON.stringify(previousPayment);
      const queries: string[] = [];
      const tx = jest.fn(async (strings: TemplateStringsArray) => {
        const q = strings.join('?').replace(/\s+/g, ' ').trim();
        queries.push(q);
        if (q.startsWith('SELECT archivo_id, documento_id')) return [{ archivo_id: 102, documento_id: 102 }];
        if (q.startsWith('SELECT * FROM documentos.documentos_archivos')) return [file];
        if (q.startsWith('SELECT * FROM documentos.documentos WHERE')) return [{ id: 102, estado: 'pendiente_ocr' }];
        if (q.startsWith('SELECT * FROM documentos.ocr_resultados')) return [{ ...ocr, estado: 'editado', tipo_propuesto: 'TRANSFERENCIA', metadata: {} }];
        if (q.includes('FROM documentos.expedientes e')) return [{ id: 26, codigo_expediente: 'EXP', empresa_codigo: 'BBTI', cliente_abreviatura: 'BBTI', cliente_destino_id: 1 }];
        if (q.includes('LEFT JOIN LATERAL')) return [{ documento_id: previousPayment.documentoId, expediente_id: 26, estado: previousPayment.estado }];
        if (q.includes('FROM documentos.expediente_documentos')) return [];
        if (q.includes('FROM documentos.grupos_factura gf')) return [{ documento_id: 98 }];
        throw new Error(`SQL no previsto: ${q}`);
      });
      await expect(repo.confirmarOcrResultadoConExpedienteConExecutor(tx as any, 72, {
        ...input, decisionCorrespondencia,
        metadata: { fechaPago: '2026-07-29', banco: 'BBVA', numeroOperacion: 'SYNTHETIC-DUPLICATE', montoTotal: '250', moneda: 'USD' },
      } as any, 1)).rejects.toMatchObject({ code: 'DOCUMENTO_DUPLICADO_EN_EXPEDIENTE' });
      expect(queries.some(q => q.includes('LEFT JOIN LATERAL'))).toBe(true);
      expect(queries.some(q => /^(UPDATE|INSERT|DELETE)/.test(q))).toBe(false);
      expect(JSON.stringify(previousPayment)).toBe(before);
    },
  );

});
