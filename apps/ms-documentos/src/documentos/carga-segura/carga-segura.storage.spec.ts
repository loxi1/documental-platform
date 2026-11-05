import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
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
  GetObjectCommand: jest.fn().mockImplementation((input) => ({
    type: 'get',
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
      'documentos/2026/07/BBTI/25__Orden_de_compra_01.pdf',
    );
  });
  it('conserva UTC para el mes de carga y la identidad de operación', () => {
    expect(buildCargaSeguraStorageKey({ operacionId: 25, empresaCodigo: 'bbti',
      nombreArchivo: 'factura.pdf', fecha: new Date('2026-08-31T23:30:00-05:00'),
    })).toBe('documentos/2026/09/BBTI/25__factura.pdf');
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

  it('crea con un único PutObject condicional', async () => {
    sendMock.mockResolvedValueOnce({});

    const result = await new R2CargaSeguraStorage(config).putObject({
      provider: 'r2',
      bucket: 'bucket',
      key: 'key',
      body: Buffer.from('pdf'),
      contentType: 'application/pdf',
      hashSha256: 'a'.repeat(64),
    });

    expect(result).toEqual({
      kind: 'CREATED',
      provider: 'r2',
      bucket: 'bucket',
      key: 'key',
      preexisting: false,
    });
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0]?.[0]).toMatchObject({
      type: 'put',
      input: {
        Bucket: 'bucket',
        Key: 'key',
        IfNoneMatch: '*',
      },
    });
  });

  it('clasifica 412 como objeto preexistente sin repetir el put', async () => {
    sendMock.mockRejectedValueOnce({
      name: 'PreconditionFailed',
      $metadata: { httpStatusCode: 412 },
    });

    const result = await new R2CargaSeguraStorage(config).putObject({
      provider: 'r2',
      bucket: 'bucket',
      key: 'key',
      body: Buffer.from('pdf'),
      contentType: 'application/pdf',
      hashSha256: 'a'.repeat(64),
    });

    expect(result).toEqual({
      kind: 'PREEXISTING',
      provider: 'r2',
      bucket: 'bucket',
      key: 'key',
      preexisting: true,
    });
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('no clasifica otros errores de storage como preexistencia', async () => {
    sendMock.mockRejectedValueOnce({
      name: 'ServiceUnavailable',
      $metadata: { httpStatusCode: 503 },
    });

    await expect(
      new R2CargaSeguraStorage(config).putObject({
        provider: 'r2',
        bucket: 'bucket',
        key: 'key',
        body: Buffer.from('pdf'),
        contentType: 'application/pdf',
        hashSha256: 'a'.repeat(64),
      }),
    ).rejects.toMatchObject({
      code: 'CARGA_SEGURA_STORAGE_FAILED',
    });
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
  it('promueve con PUT exclusivo del destino y verifica sus bytes', async () => {
    const body = Buffer.from('synthetic pdf');
    const hash = createHash('sha256').update(body).digest('hex');
    sendMock.mockImplementation(async (command: any) => {
      if (command.type === 'get') return { Body: Readable.from([body]), ContentLength: body.length,
        Metadata: { sha256: hash, 'operation-id': 'tmp:50:operation' } };
      if (command.type === 'put') {
        const chunks: Buffer[] = []; for await (const chunk of command.input.Body) chunks.push(Buffer.from(chunk));
        expect(Buffer.concat(chunks)).toEqual(body); return {};
      }
      throw new Error('Unexpected storage operation');
    });
    await new R2CargaSeguraStorage(config).copyObject({ provider: 'r2', bucket: 'lab',
      sourceKey: 'tmp/pago.pdf', destinationKey: 'documentos/final.pdf', operationIdentity: 'tmp:50:operation',
      hashSha256: hash, tamanoBytes: body.length, contentType: 'application/pdf' });
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'put', input: expect.objectContaining({
      Bucket: 'lab', Key: 'documentos/final.pdf', IfNoneMatch: '*', Metadata: { sha256: hash, 'operation-id': 'tmp:50:operation' } }) }));
  });
  describe('verifyExistingObject valida bytes e identidad', () => {
    const body = Buffer.from('synthetic pdf');
    const hash = createHash('sha256').update(body).digest('hex');
    const input = {
      provider: 'r2' as const,
      bucket: 'lab',
      sourceKey: 'tmp/pago.pdf',
      destinationKey: 'documentos/final.pdf',
      operationIdentity: 'tmp:50:operation',
      hashSha256: hash,
      tamanoBytes: body.length,
      contentType: 'application/pdf',
    };

    it('acepta objeto existente con identidad y bytes correctos sin PUT', async () => {
      sendMock.mockResolvedValueOnce({
        Body: Readable.from([body]),
        ContentLength: body.length,
        Metadata: { sha256: hash, 'operation-id': input.operationIdentity },
      });

      await expect(
        new R2CargaSeguraStorage(config).verifyExistingObject(input),
      ).resolves.toBeUndefined();

      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock.mock.calls[0][0]).toMatchObject({
        type: 'get',
        input: { Bucket: 'lab', Key: input.destinationKey },
      });
    });

    it('rechaza identidad ajena aunque hash y bytes coincidan', async () => {
      sendMock.mockResolvedValueOnce({
        Body: Readable.from([body]),
        ContentLength: body.length,
        Metadata: { sha256: hash, 'operation-id': 'tmp:50:otra' },
      });

      await expect(
        new R2CargaSeguraStorage(config).verifyExistingObject(input),
      ).rejects.toThrow('DESTINATION_IDENTITY_CONFLICT');

      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock.mock.calls[0][0]).toMatchObject({ type: 'get' });
    });

    it('rechaza bytes alterados aunque metadata y longitud coincidan', async () => {
      const altered = Buffer.from(body);
      altered[0] = altered[0] === 88 ? 89 : 88;

      sendMock.mockResolvedValueOnce({
        Body: Readable.from([altered]),
        ContentLength: body.length,
        Metadata: { sha256: hash, 'operation-id': input.operationIdentity },
      });

      await expect(
        new R2CargaSeguraStorage(config).verifyExistingObject(input),
      ).rejects.toThrow('DESTINATION_HASH_MISMATCH');

      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock.mock.calls[0][0]).toMatchObject({ type: 'get' });
    });

    it('rechaza tamaño incorrecto antes de aceptar el objeto', async () => {
      sendMock.mockResolvedValueOnce({
        Body: Readable.from([body]),
        ContentLength: body.length + 1,
        Metadata: { sha256: hash, 'operation-id': input.operationIdentity },
      });

      await expect(
        new R2CargaSeguraStorage(config).verifyExistingObject(input),
      ).rejects.toThrow('DESTINATION_IDENTITY_CONFLICT');

      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock.mock.calls[0][0]).toMatchObject({ type: 'get' });
    });
  });

  it('stat devuelve tamaño y hash de metadata del provider', async () => {
    sendMock.mockResolvedValueOnce({ ContentLength: 42, Metadata: { sha256: 'A'.repeat(64) } });
    expect(await new R2CargaSeguraStorage(config).statObject({ provider: 'r2', bucket: 'lab', key: 'tmp' }))
      .toMatchObject({ exists: true, tamanoBytes: 42, hashSha256: 'a'.repeat(64) });
  });
  it('stat distingue ausencia de errores del provider', async () => {
    sendMock.mockRejectedValueOnce({ name: 'NotFound' });
    expect(await new R2CargaSeguraStorage(config).statObject({ provider: 'r2', bucket: 'lab', key: 'tmp' })).toMatchObject({ exists: false });
    sendMock.mockRejectedValueOnce({ name: 'ServiceUnavailable' });
    await expect(new R2CargaSeguraStorage(config).statObject({ provider: 'r2', bucket: 'lab', key: 'tmp' })).rejects.toMatchObject({ code: 'CARGA_SEGURA_STORAGE_FAILED' });
  });

});
