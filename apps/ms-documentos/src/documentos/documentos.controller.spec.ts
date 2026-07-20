jest.mock('./documentos.service', () => ({
  DocumentosService: class DocumentosService {},
}));

jest.mock('./documentos-preview.service', () => ({
  DocumentosPreviewService: class DocumentosPreviewService {},
}));

jest.mock('./documentos-upload.service', () => ({
  DocumentosUploadService: class DocumentosUploadService {},
}));

import { DocumentosController } from './documentos.controller';

describe('DocumentosController - auditoría de confirmación OCR', () => {
  const confirmarOcrResultadoConExpediente = jest.fn();

  const service = {
    confirmarOcrResultadoConExpediente,
  };

  const controller = new DocumentosController(
    service as any,
    {} as any,
    {} as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('propaga usuario, requestId y correlationId al servicio', async () => {
    const body = {
      expedienteId: 117,
      tipoRelacion: 'principal_oc',
      esPrincipal: true,
      orden: 1,
    };

    confirmarOcrResultadoConExpediente.mockResolvedValue({ ok: true });

    await expect(
      controller.confirmarOcrResultadoConExpediente(
        2,
        body,
        '1',
        '98888888-8888-4888-8888-888888888881',
        '98888888-8888-4888-8888-888888888881',
      ),
    ).resolves.toEqual({ ok: true });

    expect(confirmarOcrResultadoConExpediente).toHaveBeenCalledTimes(1);
    expect(confirmarOcrResultadoConExpediente).toHaveBeenCalledWith(
      2,
      body,
      {
        usuarioId: 1,
        requestId: '98888888-8888-4888-8888-888888888881',
        correlationId: '98888888-8888-4888-8888-888888888881',
      },
    );
  });

  it('usa requestId como correlationId y descarta un usuario inválido', async () => {
    const body = {
      expedienteId: 117,
    };

    confirmarOcrResultadoConExpediente.mockResolvedValue({ ok: true });

    await controller.confirmarOcrResultadoConExpediente(
      2,
      body,
      'usuario-invalido',
      'request-prueba',
      '   ',
    );

    expect(confirmarOcrResultadoConExpediente).toHaveBeenCalledWith(
      2,
      body,
      {
        usuarioId: null,
        requestId: 'request-prueba',
        correlationId: 'request-prueba',
      },
    );
  });
});
