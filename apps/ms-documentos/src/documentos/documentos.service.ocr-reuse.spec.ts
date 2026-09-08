jest.mock('@documental/shared', () => ({ NatsSubjects: { OcrProcesarArchivo: 'ocr.procesar-archivo' } }));
jest.mock('@documental/database', () => ({ sql: jest.fn() }));
import { of } from 'rxjs';
import { DocumentosService } from './documentos.service';
import { DocumentosRepository } from './documentos.repository';
import { sql } from '@documental/database';

const archivo = { id: 12, documento_id: 10, cliente_abreviatura: 'TEST', storage_key: 'fixture.pdf' };
const stored = (estado: string) => ({ id: 20, documento_id: 10, archivo_id: 12, estado,
  tipo_propuesto: 'FACTURA', clave_documental: 'PERSISTIDA', metadata: { metadata: { numero: '001' }, estado: 'stale' } });
function setup(rows: ReturnType<typeof stored>[] = []) {
  const repo = { findArchivoById: jest.fn().mockResolvedValue(archivo),
    findOcrReutilizablesByDocumentoArchivo: jest.fn().mockResolvedValue(rows),
    saveOcrResultado: jest.fn().mockResolvedValue({ row: stored('pendiente_validacion') }) };
  const nats = { send: jest.fn().mockReturnValue(of({ ok: true, tipoDocumental: 'FACTURA', metadata: { numero: 'NUEVA' } })) };
  const eventos = { registrarEvento: jest.fn() };
  const service = new DocumentosService(repo as any, {} as any, eventos as any, nats as any);
  return { service, repo, nats, eventos };
}
describe('R1 OCR reuse before processing', () => {
  it('A: sin OCR publica una vez y persiste', async () => {
    const { service, repo, nats } = setup();
    await service.procesarOcrArchivo(12, { reprocesar: false });
    expect(repo.findOcrReutilizablesByDocumentoArchivo).toHaveBeenCalledWith(10, 12);
    expect(nats.send).toHaveBeenCalledTimes(1);
    expect(repo.saveOcrResultado).toHaveBeenCalledTimes(1);
    expect(repo.saveOcrResultado).toHaveBeenCalledWith(expect.objectContaining({ documentoId: 10, archivoId: 12, forceReprocess: false }));
  });
  it.each(['pendiente_validacion', 'confirmado', 'editado'])('B/C/D: reutiliza %s con datos y estado persistidos', async estado => {
    const ocr = stored(estado);
    const { service, repo, nats, eventos } = setup([ocr]);
    const result = await service.procesarOcrArchivo(12, { reprocesar: false });
    expect(result).toMatchObject({ ocrResultadoId: 20, documentoId: 10, archivoId: 12, estado,
      metadata: ocr.metadata, claveDocumental: 'PERSISTIDA', ocrResultadoYaExistia: true });
    expect(nats.send).not.toHaveBeenCalled();
    expect(repo.saveOcrResultado).not.toHaveBeenCalled();
    expect(eventos.registrarEvento).not.toHaveBeenCalled();
  });
  it('E: consulta SQL exige ambos IDs; otro archivo no se reutiliza', async () => {
    const sqlMock = sql as unknown as jest.Mock;
    sqlMock.mockImplementation((strings: TemplateStringsArray, ...params: unknown[]) => {
      const query = strings.join('?');
      expect(query).toContain('o.documento_id = ?');
      expect(query).toContain('o.archivo_id = ?');
      expect(query).not.toMatch(/LIMIT|MAX\(/i);
      // The only simulated persisted result belongs to another version.
      const other = { ...stored('confirmado'), archivo_id: 11 };
      return Promise.resolve(params[0] === other.documento_id && params[1] === other.archivo_id ? [other] : []);
    });
    const { service, repo, nats } = setup();
    repo.findOcrReutilizablesByDocumentoArchivo.mockImplementation((d, a) =>
      new DocumentosRepository().findOcrReutilizablesByDocumentoArchivo(d, a));
    await service.procesarOcrArchivo(12, { reprocesar: false });
    expect(nats.send).toHaveBeenCalledTimes(1);
    expect(repo.saveOcrResultado).toHaveBeenCalledTimes(1);
  });
  it('F: múltiples reutilizables devuelven conflicto sin worker', async () => {
    const { service, nats, repo } = setup([stored('pendiente_validacion'), { ...stored('confirmado'), id: 21 }]);
    await expect(service.procesarOcrArchivo(12, { reprocesar: false })).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'OCR_REUTILIZACION_AMBIGUA' }),
    });
    expect(nats.send).not.toHaveBeenCalled();
    expect(repo.saveOcrResultado).not.toHaveBeenCalled();
  });
  it('H/R2: another caller persisted while worker ran; returns stored metadata and real state', async () => {
    const { service, repo, nats } = setup();
    const persisted = stored('confirmado');
    repo.saveOcrResultado.mockResolvedValue({ row: persisted, yaExistia: true } as any);
    const result = await service.procesarOcrArchivo(12, { reprocesar: false });
    expect(nats.send).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ estado: 'confirmado', metadata: persisted.metadata,
      claveDocumental: 'PERSISTIDA', ocrResultadoId: 20, requiereValidacionUsuario: false });
    expect(JSON.stringify(result)).not.toContain('NUEVA');
  });
  it('R2: conflicto transaccional se expone como 409', async () => {
    const { service, repo } = setup();
    repo.saveOcrResultado.mockRejectedValue(Object.assign(new Error('Conflicto'), {
      code: 'OCR_REUTILIZACION_AMBIGUA',
    }));
    await expect(service.procesarOcrArchivo(12, { reprocesar: false })).rejects.toMatchObject({
      status: 409, response: expect.objectContaining({ code: 'OCR_REUTILIZACION_AMBIGUA' }),
    });
  });
  it('G: reprocesar true omite reuse y conserva procesamiento/persistencia', async () => {
    const { service, repo, nats } = setup([stored('confirmado')]);
    await service.procesarOcrArchivo(12, { reprocesar: true });
    expect(repo.findOcrReutilizablesByDocumentoArchivo).not.toHaveBeenCalled();
    expect(nats.send).toHaveBeenCalledTimes(1);
    expect(repo.saveOcrResultado).toHaveBeenCalledWith(expect.objectContaining({ forceReprocess: true }));
  });
});
