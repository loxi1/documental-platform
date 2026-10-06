jest.mock('@documental/database', () => ({ sql: jest.fn() }));

import { ConflictException } from '@nestjs/common';
import { sql } from '@documental/database';
import { OrdenPagoService } from './orden-pago.service';

const actor = {
  id: 7,
  workspaceId: 3,
  empresaCodigo: 'BBTI',
  clienteDestinoId: 2,
  requestId: 'req-r4p',
  correlationId: 'corr-r4p',
};

const detalle153 = {
  ordenPagoId: 153,
  documentoId: 443,
  grupoFacturaId: 116,
  expedienteId: 118,
};

const upload445 = {
  documentoId: 445,
  archivoId: 445,
  nombreArchivo: '05_OP_15.pdf',
  contentType: 'application/pdf',
  estadoArchivo: 'subido',
  ocrResultados: [
    {
      ocrResultadoId: 434,
      estado: 'pendiente_validacion',
    },
  ],
};

const uploadSinOcr = {
  documentoId: 446,
  archivoId: 446,
  nombreArchivo: 'pago-sin-ocr.pdf',
  contentType: 'application/pdf',
  estadoArchivo: 'subido',
  ocrResultados: [],
};

const crearService = () =>
  new OrdenPagoService(
    { registrarCreacion: jest.fn() } as any,
    {
      buscarPorCodigo: jest.fn(),
      listarRepresentablesParaOrdenPago: jest.fn(),
    } as any,
    {
      crear: jest.fn(),
      existePorGrupoFacturaId: jest.fn(),
    } as any,
    {
      listarConfiguradosActivosPorConcepto: jest.fn(),
      congelarParaObligacion: jest.fn(),
      listarCongeladosPorGrupoFacturaId: jest.fn(),
      permiteTipoDocumental: jest.fn(),
    } as any,
    { listarActivos: jest.fn(), estaHabilitado: jest.fn() } as any,
    { listarActivos: jest.fn(), estaHabilitado: jest.fn() } as any,
    { confirmarOcrResultadoConExpediente: jest.fn() } as any,
  );

describe('R4P - recuperación READ ONLY de upload pendiente OP', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const preparar = (candidatos: any[]) => {
    const service = crearService();

    jest.spyOn(service, 'obtenerDetalle').mockResolvedValue(detalle153 as any);
    (sql as unknown as jest.Mock).mockResolvedValue(candidatos);

    return service;
  };

  it('CASO_0: OP válida sin upload pendiente devuelve existe=false', async () => {
    const service = preparar([]);

    await expect(
      service.obtenerUploadPendiente(153, actor),
    ).resolves.toEqual({
      existe: false,
      upload: null,
      ocr: null,
    });

    expect(service.obtenerDetalle).toHaveBeenCalledWith(153, actor);
    expect(sql).toHaveBeenCalledTimes(1);
  });

  it('CASO_1_TESTIGO: proyecta exactamente upload 445 con OCR 434', async () => {
    const service = preparar([upload445]);

    await expect(
      service.obtenerUploadPendiente(153, actor),
    ).resolves.toEqual({
      existe: true,
      upload: {
        documentoId: 445,
        archivoId: 445,
        nombreArchivo: '05_OP_15.pdf',
        contentType: 'application/pdf',
        estadoArchivo: 'subido',
        puedePrevisualizar: true,
      },
      ocr: {
        ocrResultadoId: 434,
        estado: 'pendiente_validacion',
        puedeRevisar: true,
        validacionPendientePago: null,
      },
    });
  });

  it('CASO_SIN_OCR: upload inequívoco sin OCR devuelve ocr=null', async () => {
    const service = preparar([uploadSinOcr]);

    const result = await service.obtenerUploadPendiente(153, actor);

    expect(result.existe).toBe(true);
    expect(result.upload).toMatchObject({
      documentoId: 446,
      archivoId: 446,
    });
    expect(result.ocr).toBeNull();
  });

  it('CASO_MULTIPAGO: la consulta excluye consumo por EL MISMO documento candidato y grupo', async () => {
    const service = preparar([{
      ...uploadSinOcr,
      documentoId: 447,
      archivoId: 447,
    }]);

    const result = await service.obtenerUploadPendiente(153, actor);

    expect(result).toMatchObject({
      existe: true,
      upload: {
        documentoId: 447,
        archivoId: 447,
      },
    });

    const llamada = (sql as unknown as jest.Mock).mock.calls[0];
    const strings = llamada[0] as TemplateStringsArray;
    const query = strings.join(' ? ');

    expect(query).toContain('NOT EXISTS');
    expect(query).toContain('gfd.documento_id = d.id');
    expect(query).toContain('gfd.grupo_factura_id =');
    expect(query).toContain("gfd.tipo_relacion = 'adjunto_transferencia'");
    expect(query).toContain("gfd.estado = 'activo'");
    expect(query).toContain("FROM documentos.ocr_resultados o_resuelto");
    expect(query).toContain("o_resuelto.documento_id = d.id");
    expect(query).toContain("o_resuelto.archivo_id = a.id");
    expect(query).toContain(
      "o_resuelto.metadata #>> '{validacionPendientePago,estado}' = 'CONSUMIDO'",
    );

    // Un upload cuya decisión financiera ya fue consumida no vuelve a ser
    // candidato pendiente, aunque OBSERVAR no cree una relación financiera activa.
    // Defensa contractual: no basta que el grupo tenga algún pago.
    expect(query).toMatch(
      /gfd\.documento_id\s*=\s*d\.id[\s\S]*gfd\.grupo_factura_id/,
    );
  });

  it('CASO_MULTIPLES: dos uploads pendientes producen conflicto explícito', async () => {
    const service = preparar([
      upload445,
      {
        ...uploadSinOcr,
        documentoId: 447,
        archivoId: 447,
      },
    ]);

    await expect(
      service.obtenerUploadPendiente(153, actor),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'ORDEN_PAGO_UPLOAD_PENDIENTE_AMBIGUO',
        details: expect.objectContaining({
          ordenPagoId: 153,
          cantidad: 2,
        }),
      }),
    });
  });

  it('CASO_OCR_MULTIPLE: no elige silenciosamente un OCR', async () => {
    const service = preparar([{
      ...upload445,
      ocrResultados: [
        { ocrResultadoId: 434, estado: 'pendiente_validacion' },
        { ocrResultadoId: 999, estado: 'editado' },
      ],
    }]);

    await expect(
      service.obtenerUploadPendiente(153, actor),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'ORDEN_PAGO_UPLOAD_OCR_AMBIGUO',
        details: expect.objectContaining({
          documentoId: 445,
          archivoId: 445,
          cantidad: 2,
        }),
      }),
    });
  });

  it('CASO_TENANT: si la OP no resuelve para actor, no consulta uploads', async () => {
    const service = crearService();

    jest.spyOn(service, 'obtenerDetalle').mockRejectedValue(
      new Error('OP_NO_DISPONIBLE_EN_CONTEXTO'),
    );

    await expect(
      service.obtenerUploadPendiente(153, {
        ...actor,
        empresaCodigo: 'OTRA',
      }),
    ).rejects.toThrow('OP_NO_DISPONIBLE_EN_CONTEXTO');

    expect(sql).not.toHaveBeenCalled();
  });

  it('CASO_CONFIRMADO: la query excluye asociación financiera activa del documento candidato', async () => {
    const service = preparar([]);

    await service.obtenerUploadPendiente(153, actor);

    const llamada = (sql as unknown as jest.Mock).mock.calls[0];
    const strings = llamada[0] as TemplateStringsArray;
    const query = strings.join(' ? ');

    expect(query).toContain('FROM documentos.grupo_factura_documentos gfd');
    expect(query).toContain('gfd.documento_id = d.id');
    expect(query).toContain("gfd.tipo_relacion = 'adjunto_transferencia'");
    expect(query).toContain("gfd.estado = 'activo'");
  });

  it('CARDINALIDAD: no usa LIMIT 1, MAX ni recencia para elegir upload u OCR', async () => {
    const service = preparar([]);

    await service.obtenerUploadPendiente(153, actor);

    const llamada = (sql as unknown as jest.Mock).mock.calls[0];
    const strings = llamada[0] as TemplateStringsArray;
    const query = strings.join(' ? ').toUpperCase();

    expect(query).not.toMatch(/\bLIMIT\s+1\b/);
    expect(query).not.toMatch(/\bMAX\s*\(/);
    expect(query).not.toMatch(/CREADO_EN\s+DESC/);
    expect(query).not.toMatch(/O\.ID\s+DESC/);
  });

  it('AUTORIDAD: query usa tenant + contexto derivado y no recibe IDs estructurales como input HTTP', async () => {
    const service = preparar([]);

    await service.obtenerUploadPendiente(153, actor);

    expect(service.obtenerDetalle).toHaveBeenCalledWith(153, actor);

    const llamada = (sql as unknown as jest.Mock).mock.calls[0];
    const strings = llamada[0] as TemplateStringsArray;
    const query = strings.join(' ? ');

    expect(query).toContain('a.workspace_id =');
    expect(query).toContain('a.empresa_codigo =');
    expect(query).toContain('a.cliente_destino_id IS NOT DISTINCT FROM');
    expect(query).toContain('a.expediente_id =');
    expect(query).toContain("a.metadata->>'documentoBaseId'");
    expect(query).toContain("a.metadata->>'grupoFacturaId'");
    expect(query).toContain("a.metadata->>'tipoDocumental' = 'TRANSFERENCIA'");
    expect(query).toContain("a.metadata->>'tipoRelacion' = 'adjunto_transferencia'");
  });
});
