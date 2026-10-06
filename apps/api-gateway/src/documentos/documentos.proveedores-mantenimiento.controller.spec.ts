import { DocumentosGatewayController } from './documentos.controller';

describe('DocumentosGatewayController / mantenimiento proveedores', () => {
  const makeController = (actions: string[] = []) => {
    const config = {
      get: jest.fn().mockReturnValue('http://ms-documentos:3002'),
    };

    const nats = {
      send: jest.fn(),
    };

    const controller = new DocumentosGatewayController(
      config as any,
      nats as any,
    );

    jest
      .spyOn(controller as any, 'validateAuthorization')
      .mockResolvedValue({
        sub: 1,
        permisos: { actions },
      });

    const proxy = jest
      .spyOn(controller as any, 'proxy')
      .mockResolvedValue({ ok: true });

    return { controller, proxy };
  };

  it('permite listar con proveedores.ver', async () => {
    const { controller, proxy } = makeController(['proveedores.ver']);

    await controller.findProveedoresMantenimiento(
      'Bearer token',
      'req-1',
      { q: 'ACME', page: '2' },
    );

    expect(proxy).toHaveBeenCalledWith({
      method: 'GET',
      path: '/documentos/proveedores/mantenimiento',
      authorization: 'Bearer token',
      requestId: 'req-1',
      query: { q: 'ACME', page: '2' },
    });
  });

  it('rechaza listado sin proveedores.ver antes del proxy', async () => {
    const { controller, proxy } = makeController([]);

    await expect(
      controller.findProveedoresMantenimiento(
        'Bearer token',
        'req-1',
        {},
      ),
    ).rejects.toThrow();

    expect(proxy).not.toHaveBeenCalled();
  });

  it('permite detalle con proveedores.ver', async () => {
    const { controller, proxy } = makeController(['proveedores.ver']);

    await controller.findProveedorMantenimientoById(
      'Bearer token',
      'req-2',
      '15',
    );

    expect(proxy).toHaveBeenCalledWith({
      method: 'GET',
      path: '/documentos/proveedores/mantenimiento/15',
      authorization: 'Bearer token',
      requestId: 'req-2',
    });
  });

  it('permite creación con proveedores.crear', async () => {
    const { controller, proxy } = makeController(['proveedores.crear']);
    const body = {
      ruc: '20123456789',
      razonSocial: 'Proveedor SAC',
    };

    await controller.createProveedorMantenimiento(
      'Bearer token',
      'req-3',
      body,
    );

    expect(proxy).toHaveBeenCalledWith({
      method: 'POST',
      path: '/documentos/proveedores/mantenimiento',
      authorization: 'Bearer token',
      requestId: 'req-3',
      body,
    });
  });

  it('rechaza creación cuando solo tiene proveedores.ver', async () => {
    const { controller, proxy } = makeController(['proveedores.ver']);

    await expect(
      controller.createProveedorMantenimiento(
        'Bearer token',
        'req-3',
        {
          ruc: '20123456789',
          razonSocial: 'Proveedor SAC',
        },
      ),
    ).rejects.toThrow();

    expect(proxy).not.toHaveBeenCalled();
  });

  it('permite actualización con proveedores.editar', async () => {
    const { controller, proxy } = makeController(['proveedores.editar']);
    const body = {
      razonSocial: 'Proveedor Editado',
    };

    await controller.updateProveedorMantenimiento(
      'Bearer token',
      'req-4',
      '15',
      body,
    );

    expect(proxy).toHaveBeenCalledWith({
      method: 'PATCH',
      path: '/documentos/proveedores/mantenimiento/15',
      authorization: 'Bearer token',
      requestId: 'req-4',
      body,
    });
  });

  it('rechaza actualización cuando solo tiene proveedores.ver', async () => {
    const { controller, proxy } = makeController(['proveedores.ver']);

    await expect(
      controller.updateProveedorMantenimiento(
        'Bearer token',
        'req-4',
        '15',
        { razonSocial: 'Proveedor Editado' },
      ),
    ).rejects.toThrow();

    expect(proxy).not.toHaveBeenCalled();
  });
});
