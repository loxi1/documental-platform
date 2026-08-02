jest.mock('@documental/database', () => ({
  sql: Object.assign(jest.fn(), {
    begin: jest.fn(),
  }),
}));

import { sql } from '@documental/database';
import { DocumentosUploadService } from './documentos-upload.service';

describe('DocumentosUploadService - principal activo por relación', () => {
  const sqlMock = sql as unknown as jest.Mock;

  const file = {
    buffer: Buffer.from('%PDF-1.4 prueba'),
    originalname: 'orden.pdf',
    mimetype: 'application/pdf',
  };

  const baseBody = {
    clienteAbreviatura: 'BBTI',
    tipoEsperado: 'OC',
    expedienteId: 9,
    tipoRelacionSugerida: 'principal_oc',
    esPrincipal: true,
    canalIngreso: 'COMPRAS_NUEVO_UPLOAD_PRINCIPAL',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function service() {
    return new DocumentosUploadService({} as any, {} as any);
  }

  it('bloquea una segunda principal_oc en el mismo expediente', async () => {
    sqlMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 9,
          codigo_expediente: '020103',
          empresa_codigo: 'BBTI',
          cliente_destino_id: 2,
        },
      ])
      .mockResolvedValueOnce([
        {
          documento_id: 35,
          tipo_relacion: 'principal_oc',
          tipo_documental: 'OC',
          serie: null,
          numero: '008312',
          clave_documental: 'BBTI|OC|008312',
        },
      ]);

    const result = await service().prevalidarCarga(file as any, baseBody as any);

    expect(result.accionSugerida).toBe('bloquear');
    expect(result.motivo).toBe('PRINCIPAL_ACTIVO_EXISTENTE');
    expect(result.principalActivo).toEqual(
      expect.objectContaining({
        documentoId: 35,
        tipoRelacion: 'principal_oc',
        numero: '008312',
      }),
    );
    expect(result.persistido).toBe(false);
  });

  it('permite principal_os cuando solo existe principal_oc', async () => {
    sqlMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 9,
          codigo_expediente: '020103',
          empresa_codigo: 'BBTI',
          cliente_destino_id: 2,
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await service().prevalidarCarga(file as any, {
      ...baseBody,
      tipoEsperado: 'OS',
      tipoRelacionSugerida: 'principal_os',
    } as any);

    expect(result.accionSugerida).toBe('cargar_nuevo');
    expect(result.motivo).toBeNull();
    expect(result.expedienteTienePrincipal).toBe(false);
  });

  it('mantiene duplicado por hash como prioridad', async () => {
    sqlMock
      .mockResolvedValueOnce([
        {
          id: 22,
          documento_id: 38,
          nombre_archivo: 'orden.pdf',
          storage_key: 'key',
          expediente_id: 9,
          tipo_relacion: 'principal_oc',
          es_principal: true,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 9,
          codigo_expediente: '020103',
          empresa_codigo: 'BBTI',
          cliente_destino_id: 2,
        },
      ])
      .mockResolvedValueOnce([
        {
          documento_id: 35,
          tipo_relacion: 'principal_oc',
          tipo_documental: 'OC',
          numero: '008312',
        },
      ]);

    const result = await service().prevalidarCarga(file as any, baseBody as any);

    expect(result.accionSugerida).toBe('abrir_existente');
    expect(result.motivo).toBe('ARCHIVO_DUPLICADO_POR_HASH');
  });
});
