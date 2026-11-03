jest.mock('@documental/database', () => ({ sql: Object.assign(jest.fn(), { begin: jest.fn() }) }));
import { DocumentosController } from './documentos.controller';

describe('Versiones: frontera HTTP interna', () => {
  const headers = { 'x-workspace-id': '1', 'x-empresa-codigo': 'BBTI', 'x-cliente-destino-id': '2',
    'x-user-id': '3', 'x-request-id': 'req' };
  it('propaga actor autenticado sin añadir idempotency key', async () => {
    const upload = { subirVersionDocumentoExistente: jest.fn().mockResolvedValue({ archivoId: 99 }) };
    const controller = new DocumentosController({} as any, {} as any, upload as any);
    const file = { buffer: Buffer.from('pdf') };
    await controller.subirVersionDocumentoExistente('487', { file: [file] }, {}, headers);
    expect(upload.subirVersionDocumentoExistente).toHaveBeenCalledWith('487', file, {}, {
      workspaceId: 1, empresaCodigo: 'BBTI', clienteDestinoId: 2, actorId: 3, requestId: 'req', correlationId: 'req',
    });
  });
  it('identidad incompleta produce 400 antes del servicio', async () => {
    const upload = { subirVersionDocumentoExistente: jest.fn() };
    const controller = new DocumentosController({} as any, {} as any, upload as any);
    await expect(controller.subirVersionDocumentoExistente('487', { file: [{ buffer: Buffer.from('pdf') }] }, {}, {}))
      .rejects.toMatchObject({ status: 400 });
    expect(upload.subirVersionDocumentoExistente).not.toHaveBeenCalled();
  });
});
