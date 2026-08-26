jest.mock('@documental/database', () => ({
  sql: Object.assign(jest.fn(), {
    begin: jest.fn(),
  }),
}));

import { sql } from '@documental/database';
import { DocumentosUploadService } from './documentos-upload.service';

describe('DocumentosUploadService - múltiples principales por relación', () => {
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

  const expedienteFixture = [
    {
      id: 9,
      codigo_expediente: '020103',
      empresa_codigo: 'BBTI',
      cliente_destino_id: 2,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function service() {
    return new DocumentosUploadService({} as any, {} as any);
  }

  function mockSqlPorConsulta(fixtures: {
    expediente?: unknown[];
    principal?: unknown[];
    duplicados?: unknown[];
    clave?: unknown[];
  }) {
    sqlMock.mockImplementation((strings: TemplateStringsArray | string[]) => {
      const query = Array.from(strings).join(' ').replace(/\s+/g, ' ').trim();

      if (query.includes('FROM documentos.expedientes')) {
        return Promise.resolve(fixtures.expediente ?? []);
      }

      if (query.includes('FROM documentos.documentos_archivos da')) {
        return Promise.resolve(fixtures.duplicados ?? []);
      }

      if (query.includes('FROM documentos.expediente_documentos ed')) {
        return Promise.resolve(fixtures.principal ?? []);
      }

      if (
        query.includes('FROM documentos.documentos d') &&
        query.includes('WHERE d.clave_documental')
      ) {
        return Promise.resolve(fixtures.clave ?? []);
      }

      throw new Error(`SQL no mockeado en documentos-upload.service.spec.ts: ${query}`);
    });
  }

  it('permite una segunda principal_oc distinta en el mismo expediente', async () => {
    mockSqlPorConsulta({
      expediente: expedienteFixture,
      duplicados: [],
      principal: [
        {
          documento_id: 35,
          tipo_relacion: 'principal_oc',
          tipo_documental: 'OC',
          serie: null,
          numero: '008312',
          clave_documental: 'BBTI|OC|008312',
        },
      ],
    });

    const result = await service().prevalidarCarga(file as any, baseBody as any);

    expect(result.accionSugerida).toBe('cargar_nuevo');
    expect(result.motivo).toBeNull();
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
    mockSqlPorConsulta({
      expediente: expedienteFixture,
      duplicados: [],
      principal: [],
    });

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
    mockSqlPorConsulta({
      expediente: expedienteFixture,
      duplicados: [
        {
          id: 22,
          documento_id: 38,
          nombre_archivo: 'orden.pdf',
          storage_key: 'key',
          expediente_id: 9,
          tipo_relacion: 'principal_oc',
          es_principal: true,
        },
      ],
      principal: [
        {
          documento_id: 35,
          tipo_relacion: 'principal_oc',
          tipo_documental: 'OC',
          numero: '008312',
        },
      ],
    });

    const result = await service().prevalidarCarga(file as any, baseBody as any);

    expect(result.accionSugerida).toBe('abrir_existente');
    expect(result.motivo).toBe('ARCHIVO_DUPLICADO_POR_HASH');
  });

  describe('42-B-03A subir-version candidato', () => {
    const sqlTexto = (call: any[]) =>
      Array.from(call[0] as TemplateStringsArray | string[])
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

    it('sube una candidata para la misma empresa sin promover ni tocar otras entidades', async () => {
      const svc = service() as any;
      const subirAR2Spy = jest.spyOn(svc, 'subirAR2').mockResolvedValue(undefined);
      jest.spyOn(svc, 'resolveBucket').mockReturnValue('data-prod');

      sqlMock.mockImplementation(
        (strings: TemplateStringsArray | string[], ..._values: unknown[]) => {
          const query = Array.from(strings).join(' ').replace(/\s+/g, ' ').trim();

          if (
            query.includes('FROM documentos.documentos d') &&
            query.includes('cliente_abreviatura')
          ) {
            return Promise.resolve([{ id: 92, cliente_abreviatura: 'BBTI' }]);
          }

          if (query.includes('INSERT INTO documentos.documentos_archivos')) {
            return Promise.resolve([{ id: 777 }]);
          }

          throw new Error(`SQL 42-B-03A no mockeado: ${query}`);
        },
      );

      const result = await svc.subirVersionDocumentoExistente(
        92,
        {
          originalname: 'guia-version-candidata.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.from('42-B-03A'),
          size: 9,
        } as Express.Multer.File,
        {
          empresaCodigo: 'BBTI',
          areaOrigen: 'ALMACEN',
        },
      );

      expect(subirAR2Spy).toHaveBeenCalledTimes(1);

      const sqlEjecutado = sqlMock.mock.calls.map(sqlTexto).join('\n');

      expect(sqlEjecutado).toContain('INSERT INTO documentos.documentos_archivos');
      expect(sqlEjecutado).not.toContain('INSERT INTO documentos.documentos (');
      expect(sqlEjecutado).not.toContain('INSERT INTO documentos.documentos(');
      expect(sqlEjecutado).not.toContain('UPDATE documentos.documentos_archivos');
      expect(sqlEjecutado).not.toContain('expediente_documentos');
      expect(sqlEjecutado).not.toContain('documento_relaciones');
      expect(sqlEjecutado.toLowerCase()).not.toContain('grupo_factura');

      const insertCall = sqlMock.mock.calls.find((call: any[]) =>
        sqlTexto(call).includes('INSERT INTO documentos.documentos_archivos'),
      );

      expect(insertCall).toBeDefined();
      expect(insertCall?.[1]).toBe(92);
      expect(sqlTexto(insertCall as any[])).toContain('es_version_actual');
      expect(sqlTexto(insertCall as any[])).toContain('false');

      expect(result).toEqual(
        expect.objectContaining({
          archivoId: 777,
          documentoId: 92,
          esVersionActual: false,
        }),
      );
    });

    it('rechaza cruce de empresa antes de R2 y antes del INSERT', async () => {
      const svc = service() as any;
      const subirAR2Spy = jest.spyOn(svc, 'subirAR2').mockResolvedValue(undefined);
      jest.spyOn(svc, 'resolveBucket').mockReturnValue('data-prod');

      sqlMock.mockImplementation(
        (strings: TemplateStringsArray | string[], ..._values: unknown[]) => {
          const query = Array.from(strings).join(' ').replace(/\s+/g, ' ').trim();

          if (
            query.includes('FROM documentos.documentos d') &&
            query.includes('cliente_abreviatura')
          ) {
            return Promise.resolve([{ id: 92, cliente_abreviatura: 'BBTEC' }]);
          }

          throw new Error(`SQL 42-B-03A inesperado: ${query}`);
        },
      );

      await expect(
        svc.subirVersionDocumentoExistente(
          92,
          {
            originalname: 'guia-otra-empresa.pdf',
            mimetype: 'application/pdf',
            buffer: Buffer.from('42-B-03A-cross-tenant'),
            size: 20,
          } as Express.Multer.File,
          {
            empresaCodigo: 'BBTI',
            areaOrigen: 'ALMACEN',
          },
        ),
      ).rejects.toThrow('DOCUMENTO_FUERA_DE_EMPRESA');

      expect(subirAR2Spy).not.toHaveBeenCalled();

      const sqlEjecutado = sqlMock.mock.calls.map(sqlTexto).join('\n');
      expect(sqlEjecutado).not.toContain('INSERT INTO documentos.documentos_archivos');
      expect(sqlEjecutado).not.toContain('UPDATE documentos.documentos_archivos');
    });
  });

});
