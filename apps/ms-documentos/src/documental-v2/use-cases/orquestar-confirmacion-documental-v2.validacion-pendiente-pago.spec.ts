jest.mock('@documental/database', () => ({ sql: { begin: jest.fn() } }));

import { sql } from '@documental/database';
import { OrquestarConfirmacionDocumentalV2UseCase } from './orquestar-confirmacion-documental-v2.usecase';

describe('33H - consumo atómico del draft', () => {
  const tx = Object.assign(jest.fn(), { unsafe: jest.fn() });
  const documentosLegacy = {
    confirmarOcrResultadoConExpedienteConExecutor: jest.fn(),
    consumirValidacionPendientePagoConExecutor: jest.fn(),
  };
  const documentosV2 = { buscarPorId: jest.fn() };
  const gruposFactura = { listarPorDocumentoOperativoPrincipal: jest.fn() };
  const materializarContexto = { execute: jest.fn() };
  const asociarPrincipal = { execute: jest.fn() };
  const asociarGrupoFactura = { execute: jest.fn() };
  const asociarDocumentoGrupo = { execute: jest.fn() };
  let useCase: OrquestarConfirmacionDocumentalV2UseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    (sql.begin as unknown as jest.Mock).mockImplementation(
      async (cb: (executor: any) => Promise<unknown>) => cb(tx),
    );
    documentosLegacy.confirmarOcrResultadoConExpedienteConExecutor.mockResolvedValue({
      documento: { id: 89 },
      expediente: { id: 53, empresaCodigo: 'BBTI', clienteDestinoId: 2 },
      vinculo: { es_principal: false },
      tipoDocumental: 'PAGO_TRANSFERENCIA',
      tipoRelacion: 'adjunto_transferencia',
      documentoBaseId: 21,
      ocrResultado: { id: 76, archivo_id: 73 },
    });
    documentosLegacy.consumirValidacionPendientePagoConExecutor.mockResolvedValue({ id: 76 });
    documentosV2.buscarPorId.mockResolvedValue({ id: 21, tipoDocumental: 'OC' });
    materializarContexto.execute.mockResolvedValue({ contenedorOperativo: { id: 501 } });
    asociarPrincipal.execute.mockResolvedValue({ documentoOperativoPrincipal: { id: 601, documentoId: 21 } });
    gruposFactura.listarPorDocumentoOperativoPrincipal.mockResolvedValue([{ id: 3, estado: 'pendiente_revision' }]);
    asociarDocumentoGrupo.execute.mockResolvedValue({
      documentoGrupoFactura: { id: 801, grupoFacturaId: 3 },
      correspondencia: { estado: 'VALIDADA' },
    });
    useCase = new OrquestarConfirmacionDocumentalV2UseCase(
      documentosLegacy as any, documentosV2 as any, gruposFactura as any,
      materializarContexto as any, asociarPrincipal as any,
      asociarGrupoFactura as any, asociarDocumentoGrupo as any,
    );
  });

  it.each(['ACEPTAR', 'OBSERVAR', 'AUTORIZAR_EXCEPCION'] as const)(
    '%s: consume dentro del mismo executor después de operación exitosa',
    async (accion) => {
      await useCase.execute(76, {
        expedienteId: 53, documentoBaseId: 21, grupoFacturaId: 3,
        tipoRelacion: 'adjunto_transferencia', esPrincipal: false, orden: 20,
        metadata: { montoTotal: '400', moneda: 'SOLES' },
        observacion: 'Guardar y confirmar pago desde Finanzas',
        decisionCorrespondencia: { accion, motivo: 'Decisión 33H' },
      });
      expect(documentosLegacy.consumirValidacionPendientePagoConExecutor)
        .toHaveBeenCalledWith(tx, 76, accion, 'Decisión 33H');
      expect(documentosLegacy.consumirValidacionPendientePagoConExecutor.mock.invocationCallOrder[0])
        .toBeGreaterThan(asociarDocumentoGrupo.execute.mock.invocationCallOrder[0]);
    },
  );

  it('E: segundo intento falla y no consume', async () => {
    const tecnico = new Error('fallo técnico segundo intento');
    asociarDocumentoGrupo.execute.mockRejectedValueOnce(tecnico);
    await expect(useCase.execute(76, {
      expedienteId: 53, documentoBaseId: 21, grupoFacturaId: 3,
      tipoRelacion: 'adjunto_transferencia',
      metadata: { montoTotal: '400', moneda: 'SOLES' },
      decisionCorrespondencia: { accion: 'ACEPTAR', motivo: 'Decisión 33H' },
    })).rejects.toBe(tecnico);
    expect(documentosLegacy.consumirValidacionPendientePagoConExecutor).not.toHaveBeenCalled();
  });

  it('E: fallo de consumo rechaza la misma TX', async () => {
    const tecnico = new Error('fallo al consumir draft');
    documentosLegacy.consumirValidacionPendientePagoConExecutor.mockRejectedValueOnce(tecnico);
    await expect(useCase.execute(76, {
      expedienteId: 53, documentoBaseId: 21, grupoFacturaId: 3,
      tipoRelacion: 'adjunto_transferencia',
      metadata: { montoTotal: '400', moneda: 'SOLES' },
      decisionCorrespondencia: { accion: 'OBSERVAR', motivo: 'Decisión 33H' },
    })).rejects.toBe(tecnico);
    expect(sql.begin).toHaveBeenCalledTimes(1);
  });

});
