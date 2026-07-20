const sendMock = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: sendMock,
  })),
  HeadObjectCommand: jest.fn().mockImplementation((input) => ({
    type: 'head',
    input,
  })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({
    type: 'put',
    input,
  })),
  DeleteObjectCommand: jest.fn().mockImplementation((input) => ({
    type: 'delete',
    input,
  })),
}));

import {
  buildCargaSeguraStorageKey,
  R2CargaSeguraStorage,
} from './carga-segura.storage';

describe('buildCargaSeguraStorageKey', () => {
  it('genera un key determinista y saneado', () => {
    const key = buildCargaSeguraStorageKey({
      operacionId: 25,
      empresaCodigo: 'BBTI',
      nombreArchivo: '../Órden de compra 01.pdf',
      fecha: new Date('2026-07-20T12:00:00.000Z'),
    });

    expect(key).toBe(
      'documentos/carga-segura/2026/07/BBTI/25__Orden_de_compra_01.pdf',
    );
  });
});

describe('R2CargaSeguraStorage', () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        R2_ENDPOINT: 'https://example.r2.invalid',
        R2_ACCESS_KEY_ID: 'access',
        R2_SECRET_ACCESS_KEY: 'secret',
        R2_REGION: 'auto',
      };

      return values[key];
    }),
  } as any;

  beforeEach(() => {
    sendMock.mockReset();
    config.get.mockClear();
  });

  it('devuelve false cuando HeadObject responde 404', async () => {
    sendMock.mockRejectedValueOnce({
      $metadata: { httpStatusCode: 404 },
    });

    const result = await new R2CargaSeguraStorage(config).exists({
      provider: 'r2',
      bucket: 'bucket',
      key: 'key',
    });

    expect(result).toBe(false);
  });

  it('detecta preexistencia antes del put', async () => {
    sendMock.mockResolvedValueOnce({}).mockResolvedValueOnce({});

    const result = await new R2CargaSeguraStorage(config).putObject({
      provider: 'r2',
      bucket: 'bucket',
      key: 'key',
      body: Buffer.from('pdf'),
      contentType: 'application/pdf',
      hashSha256: 'a'.repeat(64),
    });

    expect(result.preexisting).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('elimina el objeto indicado', async () => {
    sendMock.mockResolvedValueOnce({});

    await new R2CargaSeguraStorage(config).deleteObject({
      provider: 'r2',
      bucket: 'bucket',
      key: 'key',
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});
