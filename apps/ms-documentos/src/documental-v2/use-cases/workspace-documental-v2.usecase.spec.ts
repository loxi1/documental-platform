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
  };
  const gruposFactura = {
    buscarPorFacturaDocumentoId: jest.fn(),
  };
  const grupoFacturaDocumentos = {
    buscarActivoPorDocumentoId: jest.fn(),
  };

  let useCase: WorkspaceDocumentalV2UseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new WorkspaceDocumentalV2UseCase(
      adapter as any,
      contenedores as any,
      documentosOperativos as any,
      gruposFactura as any,
      grupoFacturaDocumentos as any,
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
  });

  it('rechaza expedienteId inválido', async () => {
    await expect(useCase.construirDesdeExpedienteV1(0)).rejects.toBeInstanceOf(BadRequestException);
  });
});
