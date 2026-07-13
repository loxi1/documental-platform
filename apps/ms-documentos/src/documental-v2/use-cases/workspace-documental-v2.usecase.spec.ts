jest.mock('@documental/database', () => ({ sql: jest.fn() }));

import { BadRequestException } from '@nestjs/common';

import { WorkspaceDocumentalV2UseCase } from './workspace-documental-v2.usecase';
import type { ExpedienteV1ComoV2CompatibilidadView } from '../adapters/v1-v2-compatibility.types';

const compatibilidadBase: ExpedienteV1ComoV2CompatibilidadView = {
  origen: {
    modelo: 'V1',
    expedienteId: 41,
    modo: 'lectura',
  },
  contenedorOperativo: {
    empresaCodigo: 'BBTI',
    clienteDestinoId: 2,
    tipoContexto: 'expediente_v1',
    codigo: '050201',
    nombre: 'PRODUCCION C X DISTRIBUIR',
    descripcion: 'PRODUCCION C X DISTRIBUIR',
    centroCostoCodigo: null,
    ordenProduccionCodigo: null,
    proyectoCodigo: null,
    estado: 'abierto',
    metadata: {},
    origen: {
      modelo: 'V1',
      expedienteId: 41,
      modo: 'lectura',
    },
  },
  documentosOperativosPrincipales: [
    {
      documentoId: 1,
      tipoPrincipal: 'OC',
      esPrincipalActivo: true,
      estado: 'confirmado',
      metadata: {},
      origen: {
        modelo: 'V1',
        expedienteId: 41,
        modo: 'lectura',
        tipoRelacionV1: 'principal_oc',
        esPrincipalV1: true,
      },
    },
  ],
  gruposFactura: [
    {
      facturaDocumentoId: 2,
      documentoOperativoPrincipalDocumentoId: 1,
      estado: 'pendiente_revision',
      metadata: {},
      documentos: [],
      origen: {
        modelo: 'V1',
        expedienteId: 41,
        modo: 'lectura',
        tipoDocumentalV1: 'FACTURA',
        tipoRelacionV1: 'adjunto_factura',
      },
    },
  ],
  adjuntosNoClasificados: [],
  advertencias: [],
};

describe('WorkspaceDocumentalV2UseCase', () => {
  const adapter = {
    construirVistaV2DesdeExpedienteV1: jest.fn(),
  };
  const contenedores = {
    buscarPorClave: jest.fn(),
  };
  const documentosOperativos = {
    buscarPorDocumentoId: jest.fn(),
    listarActivosPorContenedorOperativoId: jest.fn(),
  };
  const documentosExistentes = {
    buscarPorId: jest.fn(),
  };
  const gruposFactura = {
    buscarPorFacturaDocumentoId: jest.fn(),
  };
  const grupoFacturaDocumentos = {
    buscarActivoPorDocumentoId: jest.fn(),
  };
  const viewMapper = {
    enriquecer: jest.fn((workspace) => workspace),
  };

  let useCase: WorkspaceDocumentalV2UseCase;

  beforeEach(() => {
    jest.clearAllMocks();

    documentosOperativos.listarActivosPorContenedorOperativoId.mockResolvedValue([]);
    documentosExistentes.buscarPorId.mockResolvedValue(null);

    useCase = new WorkspaceDocumentalV2UseCase(
      adapter as any,
      contenedores as any,
      documentosOperativos as any,
      documentosExistentes as any,
      gruposFactura as any,
      grupoFacturaDocumentos as any,
      viewMapper as any,
    );
  });

  it('construye una vista workspace con compatibilidad V1 y estado de persistencia V2', async () => {
    adapter.construirVistaV2DesdeExpedienteV1.mockResolvedValue(compatibilidadBase);
    contenedores.buscarPorClave.mockResolvedValue({ id: 1, codigo: '050201' });
    documentosOperativos.buscarPorDocumentoId.mockResolvedValue({ id: 1, documentoId: 1 });
    gruposFactura.buscarPorFacturaDocumentoId.mockResolvedValue({ id: 1, facturaDocumentoId: 2 });

    const result = await useCase.construirDesdeExpedienteV1(41);

    expect(adapter.construirVistaV2DesdeExpedienteV1).toHaveBeenCalledWith(41);
    expect(contenedores.buscarPorClave).toHaveBeenCalledWith({
      empresaCodigo: 'BBTI',
      tipoContexto: 'expediente_v1',
      codigo: '050201',
    });
    expect(documentosOperativos.buscarPorDocumentoId).toHaveBeenCalledWith(1);
    expect(gruposFactura.buscarPorFacturaDocumentoId).toHaveBeenCalledWith(2);
    expect(viewMapper.enriquecer).toHaveBeenCalledTimes(1);
    expect(documentosOperativos.listarActivosPorContenedorOperativoId).toHaveBeenCalledWith(1);
    expect(result.resumen).toEqual({
      documentosOperativosPrincipales: 1,
      documentosOperativosPrincipalesPersistidos: 1,
      gruposFactura: 1,
      gruposFacturaPersistidos: 1,
      documentosGrupoFactura: 0,
      documentosGrupoFacturaPersistidos: 0,
      adjuntosNoClasificados: 0,
      advertencias: 0,
    });
    expect(result.contenedorOperativo.estadoPersistencia).toBe('persistido');
    expect(result.documentosOperativosPrincipales[0].estadoPersistencia).toBe('persistido');
    expect(result.gruposFactura[0].estadoPersistencia).toBe('persistido');
  });

  it('no escribe V2 y marca entidades no persistidas cuando los services no encuentran filas', async () => {
    adapter.construirVistaV2DesdeExpedienteV1.mockResolvedValue(compatibilidadBase);
    contenedores.buscarPorClave.mockResolvedValue(null);
    documentosOperativos.buscarPorDocumentoId.mockResolvedValue(null);
    gruposFactura.buscarPorFacturaDocumentoId.mockResolvedValue(null);

    const result = await useCase.construirDesdeExpedienteV1(41);

    expect(result.contenedorOperativo.estadoPersistencia).toBe('no_persistido');
    expect(result.documentosOperativosPrincipales[0].estadoPersistencia).toBe('no_persistido');
    expect(result.gruposFactura[0].estadoPersistencia).toBe('no_persistido');
    expect(contenedores.buscarPorClave).toHaveBeenCalledTimes(1);
    expect(documentosOperativos.buscarPorDocumentoId).toHaveBeenCalledTimes(1);
    expect(gruposFactura.buscarPorFacturaDocumentoId).toHaveBeenCalledTimes(1);
    expect(grupoFacturaDocumentos.buscarActivoPorDocumentoId).not.toHaveBeenCalled();

    expect(documentosOperativos.listarActivosPorContenedorOperativoId).not.toHaveBeenCalled();
    expect(documentosExistentes.buscarPorId).not.toHaveBeenCalled();
  });

  it('incluye documentos operativos principales V2 persistidos aunque V1 no traiga principal', async () => {
    const compatibilidadSinPrincipal = {
      ...compatibilidadBase,
      documentosOperativosPrincipales: [],
      advertencias: [
        'EXPEDIENTE_V1_SIN_DOCUMENTO_PRINCIPAL: Falta asociar un documento operativo principal.',
      ],
    };

    adapter.construirVistaV2DesdeExpedienteV1.mockResolvedValue(compatibilidadSinPrincipal);
    contenedores.buscarPorClave.mockResolvedValue({
      id: 2,
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
      tipoContexto: 'expediente_v1',
      codigo: '900003',
      estado: 'activo',
    });

    documentosOperativos.buscarPorDocumentoId.mockResolvedValue(null);
    documentosOperativos.listarActivosPorContenedorOperativoId.mockResolvedValue([
      {
        id: 3,
        contenedorOperativoId: 2,
        documentoId: 910001,
        tipoPrincipal: 'OC',
        esPrincipalActivo: true,
        estado: 'activo',
        metadata: {},
        creadoPor: 1,
        creadoEn: '2026-07-13 13:00:00+00',
        actualizadoPor: null,
        actualizadoEn: null,
        anuladoPor: null,
        anuladoEn: null,
        motivoAnulacion: null,
      },
    ]);

    documentosExistentes.buscarPorId.mockResolvedValue({
      id: 910001,
      clienteAbreviatura: 'BBTI',
      tipoDocumental: 'OC',
      rucEmisor: '20100011111',
      razonSocialEmisor: 'PROVEEDOR SANDBOX OC A S.A.C.',
      serie: null,
      numero: 'OC-900001',
      claveDocumental: 'BBTI|OC|OC-900001',
      estado: 'confirmado',
      fechaEmision: '2026-07-01',
      moneda: 'PEN',
      montoTotal: 1200,
      nombreArchivo: 'OC_OC-900001.pdf',
    });

    gruposFactura.buscarPorFacturaDocumentoId.mockResolvedValue(null);

    const result = await useCase.construirDesdeExpedienteV1(900003);

    expect(documentosOperativos.buscarPorDocumentoId).not.toHaveBeenCalled();
    expect(documentosOperativos.listarActivosPorContenedorOperativoId).toHaveBeenCalledWith(2);
    expect(documentosExistentes.buscarPorId).toHaveBeenCalledWith(910001);

    expect(result.documentosOperativosPrincipales).toHaveLength(1);
    expect(result.documentosOperativosPrincipales[0].estadoPersistencia).toBe('persistido');
    expect(result.documentosOperativosPrincipales[0].persistido?.id).toBe(3);
    expect(result.documentosOperativosPrincipales[0].persistido?.documentoId).toBe(910001);

    expect(result.resumen.documentosOperativosPrincipales).toBe(1);
    expect(result.resumen.documentosOperativosPrincipalesPersistidos).toBe(1);
    expect(result.advertencias).toHaveLength(0);
    expect(result.resumen.advertencias).toBe(0);
  });

  it('rechaza expedienteId inválido', async () => {
    await expect(useCase.construirDesdeExpedienteV1(0)).rejects.toBeInstanceOf(BadRequestException);
  });

});
