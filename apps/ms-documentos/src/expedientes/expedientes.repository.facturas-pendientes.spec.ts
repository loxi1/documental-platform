jest.mock('@documental/database', () => ({ sql: jest.fn() }));
import { sql } from '@documental/database';
import { ExpedientesRepository } from './expedientes.repository';

const sqlMock = sql as unknown as jest.Mock;
const scope = { workspaceId: 7, clienteDestinoId: 8, empresa: 'TEST' };
const candidato = (overrides: Record<string, unknown> = {}) => ({
  documentoId: 10, archivoId: 11, filename: 'factura.pdf',
  estadoDocumento: 'pendiente_ocr', fechaCarga: null, tipoVersion: 'original',
  esActual: true, documentoMetadata: { documentoBaseId: 2 }, actuales: 1, ocr: [],
  ...overrides,
});
const consultar = (candidatos: unknown[]) => {
  sqlMock.mockResolvedValue([{ autorizado: true, candidatos }]);
  return new ExpedientesRepository().findFacturasPendientes(1, 2, scope);
};

describe('Facturas pendientes persistidas', () => {
  beforeEach(() => jest.clearAllMocks());
  it('devuelve varias filas y distingue ausencia de OCR de OCR único pendiente', async () => {
    const result = await consultar([candidato(), candidato({ archivoId: 12,
      ocr: [{ id: 20, estado: 'pendiente_validacion' }] })]);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toMatchObject({ ocrResultadoId: null, estadoOcr: null, accionSugerida: 'VALIDAR_MANUAL' });
    expect(result.data[1]).toMatchObject({ ocrResultadoId: 20, accionSugerida: 'VALIDAR_OCR' });
    expect(result.data[0]).not.toHaveProperty('documentoMetadata');
    expect(result.contexto).toEqual({ expedienteId: 1, principalId: 2 });
  });
  it.each([
    [{ ocr: [{ id: 20, estado: 'pendiente_validacion' }, { id: 21, estado: 'pendiente_validacion' }] }, 'OCR_MULTIPLE'],
    [{ ocr: [{ id: 20, estado: 'confirmado' }] }, 'OCR_NO_RECUPERABLE'],
    [{ ocr: [{ id: 20, estado: 'rechazado' }] }, 'OCR_NO_RECUPERABLE'],
    [{ documentoMetadata: { documentoBaseId: 99 } }, 'CONTEXTO_CARGA_INCONSISTENTE'],
    [{ documentoMetadata: { expedienteId: 99 } }, 'CONTEXTO_CARGA_INCONSISTENTE'],
    [{ actuales: 2 }, 'VERSION_ACTUAL_AMBIGUA'],
  ])('no ofrece acciones para un candidato conflictivo: %s', async (override, codigo) => {
    const result = await consultar([candidato(override)]);
    expect(result.data).toEqual([]);
    expect(result.conflictos).toEqual([{ documentoId: 10, archivoId: 11, codigo }]);
  });
  it('rechaza principal fuera del contexto autorizado', async () => {
    sqlMock.mockResolvedValue([{ autorizado: false, candidatos: [] }]);
    await expect(new ExpedientesRepository().findFacturasPendientes(1, 2, scope))
      .rejects.toThrow('Principal no disponible');
  });
});
