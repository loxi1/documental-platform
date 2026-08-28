jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

import { sql } from '@documental/database';
import { DocumentosRepository } from './documentos.repository';

const sqlMock = sql as unknown as jest.Mock;

type SqlHandler = (
  query: string,
  values: unknown[],
) => Promise<unknown[]> | unknown[];

function installSqlHandler(handler: SqlHandler) {
  sqlMock.mockImplementation(
    (strings: TemplateStringsArray, ...values: unknown[]) =>
      Promise.resolve(handler(strings.join('?'), values)),
  );
}

describe('DocumentosRepository - proveedor por RUC', () => {
  const originalToken = process.env.APISPERU_TOKEN;
  const originalBaseUrl = process.env.APISPERU_RUC_BASE_URL;
  const originalTimeout = process.env.APISPERU_TIMEOUT_MS;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.APISPERU_RUC_BASE_URL =
      'https://dniruc.apisperu.com/api/v1/ruc';
    process.env.APISPERU_TIMEOUT_MS = '15000';
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.APISPERU_TOKEN;
    } else {
      process.env.APISPERU_TOKEN = originalToken;
    }

    if (originalBaseUrl === undefined) {
      delete process.env.APISPERU_RUC_BASE_URL;
    } else {
      process.env.APISPERU_RUC_BASE_URL = originalBaseUrl;
    }

    if (originalTimeout === undefined) {
      delete process.env.APISPERU_TIMEOUT_MS;
    } else {
      process.env.APISPERU_TIMEOUT_MS = originalTimeout;
    }

    jest.restoreAllMocks();
  });

  it('usa catálogo local y no llama API externa cuando el RUC ya existe', async () => {
    const proveedor = {
      id: 10,
      ruc: '20557258885',
      razon_social: 'SELEIN S.A.',
      direccion: 'AV. HUSARES DE JUNIN 468',
      tipo_persona: 'JURIDICA',
    };

    installSqlHandler((query) => {
      if (
        query.includes('FROM core.proveedores') &&
        !query.includes('COUNT(*)')
      ) {
        return [proveedor];
      }

      if (query.includes('COUNT(*)')) {
        return [{ total: 1 }];
      }

      return [];
    });

    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('FETCH_NO_DEBIO_EJECUTARSE'));

    const result = await new DocumentosRepository().getProveedores(
      '20557258885',
      20,
      0,
    );

    expect(result.total).toBe(1);
    expect(result.data).toEqual([proveedor]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sin APISPERU_TOKEN conserva comportamiento local y no rompe', async () => {
    delete process.env.APISPERU_TOKEN;

    installSqlHandler((query) => {
      if (query.includes('COUNT(*)')) {
        return [{ total: 0 }];
      }

      return [];
    });

    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('FETCH_NO_DEBIO_EJECUTARSE'));

    const result = await new DocumentosRepository().getProveedores(
      '20557258885',
      20,
      0,
    );

    expect(result).toEqual({
      total: 0,
      limit: 20,
      offset: 0,
      data: [],
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('consulta API por RUC faltante y devuelve sugerencia sin persistir proveedor', async () => {
    process.env.APISPERU_TOKEN = 'token-test-no-real';

    const queries: string[] = [];

    installSqlHandler((query) => {
      queries.push(query);

      if (
        query.includes('FROM core.proveedores') &&
        !query.includes('COUNT(*)')
      ) {
        return [];
      }

      if (query.includes('INSERT INTO core.proveedores')) {
        return [
          {
            id: 77,
            ruc: '20557258885',
            razon_social: 'SELEIN S.A.',
            direccion: 'AV. HUSARES DE JUNIN 468',
            tipo_persona: 'JURIDICA',
          },
        ];
      }

      if (query.includes('COUNT(*)')) {
        return [{ total: 1 }];
      }

      return [];
    });

    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        ruc: '20557258885',
        razonSocial: 'SeleIn S.A.',
        direccion: 'Av. Húsares de Junín 468',
        estado: 'ACTIVO',
        condicion: 'HABIDO',
      }),
    } as Response);

    const result = await new DocumentosRepository().getProveedores(
      '20557258885',
      20,
      0,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url] = fetchMock.mock.calls[0];
    const parsed = new URL(String(url));

    expect(parsed.pathname).toBe('/api/v1/ruc/20557258885');
    expect(parsed.searchParams.get('token')).toBe('token-test-no-real');

    expect(
      queries.some((query) =>
        query.includes('INSERT INTO core.proveedores'),
      ),
    ).toBe(false);

    expect(result.total).toBe(1);
    expect(result.data).toEqual([
      expect.objectContaining({
        id: null,
        ruc: '20557258885',
        razon_social: 'SELEIN S.A.',
        tipo_persona: 'JURIDICA',
      }),
    ]);
  });

  it('consulta API nuevamente si el proveedor externo no fue persistido localmente', async () => {
    process.env.APISPERU_TOKEN = 'token-test-no-real';

    installSqlHandler((query) => {
      if (
        query.includes('FROM core.proveedores') &&
        !query.includes('COUNT(*)')
      ) {
        return [];
      }

      if (query.includes('INSERT INTO core.proveedores')) {
        throw new Error('No debe persistir proveedor desde getProveedores');
      }

      if (query.includes('COUNT(*)')) {
        return [{ total: 0 }];
      }

      return [];
    });

    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        ruc: '20557258885',
        razonSocial: 'SELEIN S.A.',
      }),
    } as Response);

    const repository = new DocumentosRepository();

    const first = await repository.getProveedores('20557258885', 20, 0);
    const second = await repository.getProveedores('20557258885', 20, 0);

    expect(first.total).toBe(1);
    expect(second.total).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(first.data).toEqual([
      expect.objectContaining({
        id: null,
        ruc: '20557258885',
        razon_social: 'SELEIN S.A.',
      }),
    ]);
    expect(second.data).toEqual([
      expect.objectContaining({
        id: null,
        ruc: '20557258885',
        razon_social: 'SELEIN S.A.',
      }),
    ]);
  });

  it('rechaza respuesta externa cuyo RUC no coincide y no hace UPSERT', async () => {
    process.env.APISPERU_TOKEN = 'token-test-no-real';

    const queries: string[] = [];

    installSqlHandler((query) => {
      queries.push(query);

      if (query.includes('COUNT(*)')) {
        return [{ total: 0 }];
      }

      return [];
    });

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        ruc: '20131312955',
        razonSocial: 'OTRA EMPRESA S.A.',
      }),
    } as Response);

    const result = await new DocumentosRepository().getProveedores(
      '20557258885',
      20,
      0,
    );

    expect(result.total).toBe(0);

    expect(
      queries.some((query) =>
        query.includes('INSERT INTO core.proveedores'),
      ),
    ).toBe(false);
  });

  it('preserva proveedor manual y no consulta catálogo durante confirmación', async () => {
    const repository = new DocumentosRepository();

    const metadata: Record<string, any> = {
      proveedor: 'PROVEEDOR CORREGIDO MANUALMENTE',
      razonSocial: 'PROVEEDOR CORREGIDO MANUALMENTE',
      rucProveedor: '20557258885',
    };

    const overrides: Record<string, string> = {};

    const tx = jest.fn(() => {
      throw new Error('TX_NO_DEBIO_EJECUTARSE');
    });

    await (repository as any).completarProveedorDesdeCatalogoTx(
      tx,
      'FACTURA',
      metadata,
      overrides,
    );

    expect(tx).not.toHaveBeenCalled();
    expect(metadata.proveedor).toBe(
      'PROVEEDOR CORREGIDO MANUALMENTE',
    );
    expect(metadata.razonSocial).toBe(
      'PROVEEDOR CORREGIDO MANUALMENTE',
    );
    expect(overrides).toEqual({});
  });
});
