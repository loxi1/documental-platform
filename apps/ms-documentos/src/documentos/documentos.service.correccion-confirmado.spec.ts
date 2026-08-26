jest.mock('@documental/shared', () => ({
  NatsSubjects: {
    DocumentoEditado: 'documento.editado',
  },
}));

jest.mock('../documento-eventos/documento-eventos.service', () => ({
  DocumentoEventosService: class DocumentoEventosServiceMock {},
}));

jest.mock('./documentos.repository', () => ({
  DocumentosRepository: class DocumentosRepositoryMock {},
}));

import { DocumentosService } from './documentos.service';

jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

function domainError(code: string, message: string, details?: unknown) {
  const error = new Error(message) as Error & {
    code?: string;
    details?: unknown;
  };
  error.code = code;
  error.details = details ?? null;
  return error;
}

describe('DocumentosService corrección post-confirmación', () => {
  const eventos = {} as any;
  const nats = {} as any;

  it('mapea motivo ausente a HTTP 400 preservando el código', async () => {
    const repo = {
      actualizarDocumentoManual: jest.fn().mockRejectedValue(
        domainError(
          'MOTIVO_CORRECCION_REQUERIDO',
          'Debe indicar el motivo',
          { documentoId: 20 },
        ),
      ),
    } as any;

    const service = new DocumentosService(repo, eventos, nats);

    await expect(
      service.actualizarDocumentoManual(
        20,
        { tipoDocumental: 'FACTURA', ocrResultadoId: 8 },
        1,
      ),
    ).rejects.toMatchObject({
      status: 400,
      response: {
        code: 'MOTIVO_CORRECCION_REQUERIDO',
        message: 'Debe indicar el motivo',
        details: { documentoId: 20 },
      },
    });
  });

  it('mapea documento duplicado a HTTP 409', async () => {
    const repo = {
      actualizarDocumentoManual: jest.fn().mockRejectedValue(
        domainError(
          'DOCUMENTO_DUPLICADO',
          'Ya existe un documento activo',
          { documentoDuplicadoId: 99 },
        ),
      ),
    } as any;

    const service = new DocumentosService(repo, eventos, nats);

    await expect(
      service.actualizarDocumentoManual(
        20,
        {
          tipoDocumental: 'FACTURA',
          ocrResultadoId: 8,
          motivo: 'Prueba',
        },
        1,
      ),
    ).rejects.toMatchObject({
      status: 409,
      response: {
        code: 'DOCUMENTO_DUPLICADO',
      },
    });
  });

  it('no oculta errores técnicos desconocidos', async () => {
    const technicalError = new Error('FALLO_TECNICO');
    const repo = {
      actualizarDocumentoManual: jest.fn().mockRejectedValue(technicalError),
    } as any;

    const service = new DocumentosService(repo, eventos, nats);

    await expect(
      service.actualizarDocumentoManual(
        20,
        {
          tipoDocumental: 'FACTURA',
          ocrResultadoId: 8,
          motivo: 'Prueba',
        },
        1,
      ),
    ).rejects.toBe(technicalError);
  });
});
