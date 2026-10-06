/**
 * Prueba unitaria aislada del flujo de auditoría OCR.
 *
 * Los mocks de módulos deben declararse antes de importar DocumentosService.
 * Esto evita que Jest intente cargar los builds ESM de @documental/database
 * a través de DocumentosRepository y DocumentoEventosRepository.
 */
jest.mock('@documental/shared', () => ({
  NatsSubjects: {},
}));

jest.mock('./documentos.repository', () => ({
  DocumentosRepository: class DocumentosRepository {},
}));

jest.mock('../documento-eventos/documento-eventos.service', () => ({
  DocumentoEventosService: class DocumentoEventosService {},
}));

import { DocumentosService } from './documentos.service';

jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

describe('DocumentosService - delegación de confirmación OCR', () => {
  it('delega sin alterar input ni audit a la capacidad común', async () => {
    const confirmado = { estado: 'confirmado' };

    const repo = {} as any;
    const orquestarConfirmacionV2 = {} as any;
    const documentoEventos = {} as any;
    const nats = {} as any;
    const confirmacionDocumental = {
      confirmarOcrResultadoConExpediente: jest.fn().mockResolvedValue(confirmado),
    } as any;

    const service = new DocumentosService(
      repo,
      orquestarConfirmacionV2,
      documentoEventos,
      nats,
      confirmacionDocumental,
    );

    const input = {
      expedienteId: 117,
      tipoRelacion: 'principal_oc',
      esPrincipal: true,
      orden: 1,
    };

    const audit = {
      usuarioId: 1,
      requestId: '98888888-8888-4888-8888-888888888881',
      correlationId: '98888888-8888-4888-8888-888888888881',
    };

    await expect(
      service.confirmarOcrResultadoConExpediente(2, input, audit),
    ).resolves.toBe(confirmado);

    expect(
      confirmacionDocumental.confirmarOcrResultadoConExpediente,
    ).toHaveBeenCalledTimes(1);

    expect(
      confirmacionDocumental.confirmarOcrResultadoConExpediente,
    ).toHaveBeenCalledWith(2, input, audit);
  });
});
