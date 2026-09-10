jest.mock('@documental/database', () => ({ sql: jest.fn() }));
jest.mock('@documental/shared', () => ({ NatsSubjects: { OcrProcesarArchivo: 'ocr.procesar-archivo' } }));
import { of } from 'rxjs';
import { DocumentosService } from './documentos.service';

describe('OCR request subject isolation', () => {
  const original = process.env.OCR_REQUEST_SUBJECT;
  afterEach(() => {
    if (original === undefined) delete process.env.OCR_REQUEST_SUBJECT;
    else process.env.OCR_REQUEST_SUBJECT = original;
  });
  it.each([
    [undefined, 'ocr.procesar-archivo'],
    ['lab.ocr.procesar-archivo', 'lab.ocr.procesar-archivo'],
    ['  ', 'ocr.procesar-archivo'],
  ])('env %s sends only to %s', async (value, expected) => {
    if (value === undefined) delete process.env.OCR_REQUEST_SUBJECT;
    else process.env.OCR_REQUEST_SUBJECT = value;
    const repo = { findArchivoById: jest.fn().mockResolvedValue({ id: 1, documento_id: 2,
      cliente_abreviatura: 'TEST', storage_provider: 'r2', storage_key: 'fixture.pdf' }) };
    const nats = { send: jest.fn().mockReturnValue(of({ ok: false, error: 'mock result' })) };
    const service = new DocumentosService(repo as any, {} as any, {} as any, nats as any);
    const result = await service.procesarOcrArchivo(1, { reprocesar: true });
    expect(nats.send).toHaveBeenCalledTimes(1);
    expect(nats.send).toHaveBeenCalledWith(expected, expect.objectContaining({ archivoId: 1, storageKey: 'fixture.pdf' }));
    expect(result).toEqual({ ok: false, error: 'mock result' });
  });
});
