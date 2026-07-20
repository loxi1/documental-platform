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

describe('DocumentosService - auditoría de confirmación OCR', () => {
  it('persiste usuario y registra los eventos correlacionados', async () => {
    const confirmado = {
      documento: { id: 4 },
      ocrResultado: { id: 2, archivo_id: 34 },
      expediente: { id: 117 },
      vinculo: { es_principal: true, orden: 1 },
      tipoDocumental: 'OC',
      tipoRelacion: 'principal_oc',
      claveDocumental: 'BBTI|OC|003284',
      estado: 'confirmado',
    };

    const repo = {
      confirmarOcrResultadoConExpediente: jest
        .fn()
        .mockResolvedValue(confirmado),
    } as any;

    const documentoEventos = {
      registrarEvento: jest.fn().mockResolvedValue(undefined),
    } as any;

    const service = new DocumentosService(
      repo,
      documentoEventos,
      {} as any,
    );

    const requestId = '98888888-8888-4888-8888-888888888881';

    const result = await service.confirmarOcrResultadoConExpediente(
      2,
      {
        expedienteId: 117,
        tipoRelacion: 'principal_oc',
        esPrincipal: true,
        orden: 1,
      },
      {
        usuarioId: 1,
        requestId,
        correlationId: requestId,
      },
    );

    expect(result).toBe(confirmado);

    expect(repo.confirmarOcrResultadoConExpediente).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ expedienteId: 117 }),
      1,
    );

    expect(documentoEventos.registrarEvento).toHaveBeenCalledTimes(2);

    expect(documentoEventos.registrarEvento).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        documentoId: 4,
        archivoId: 34,
        expedienteId: 117,
        tipoEvento: 'ocr.confirmado',
        entidadTipo: 'ocr_resultado',
        entidadId: 2,
        usuarioId: 1,
        requestId,
        correlationId: requestId,
      }),
    );

    expect(documentoEventos.registrarEvento).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        documentoId: 4,
        archivoId: 34,
        expedienteId: 117,
        tipoEvento: 'expediente.vinculado',
        entidadTipo: 'expediente',
        entidadId: 117,
        usuarioId: 1,
        requestId,
        correlationId: requestId,
      }),
    );
  });
});
