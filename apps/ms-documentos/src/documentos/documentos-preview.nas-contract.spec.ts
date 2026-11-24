jest.mock('@documental/shared', () => ({
  NatsSubjects: { AuthValidateToken: 'auth.validate-token' },
}));

jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(),
  GetObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

import { sql } from '@documental/database';
import { DocumentosPreviewService } from './documentos-preview.service';

describe('DocumentosPreviewService — contrato NAS', () => {
  const db = sql as unknown as jest.Mock;

  beforeEach(() => {
    db.mockReset();
  });

  it('entrega el contrato del visor existente cuando NAS devuelve una URL', async () => {
    db.mockResolvedValueOnce([{
      id: 546,
      nombre_archivo: 'OC_008979.pdf',
      storage_provider: 'r2',
      storage_bucket: 'data-prod',
      storage_key: 'documentos/2026/11/BBTI/original.pdf',
      ruta_archivo: null,
    }]);

    const archivado = {
      previewUrl: jest.fn().mockResolvedValue({
        url: 'http://localhost:3000/api/v1/documentos/archivado/preview/546?ticket=synthetic',
        expiresIn: 120,
      }),
    };

    const service = new DocumentosPreviewService(
      { get: jest.fn() } as any,
      archivado as any,
    );

    const result = await service.getArchivoPreviewUrl(
      546,
      'Bearer synthetic',
    );

    expect(archivado.previewUrl).toHaveBeenCalledWith(
      546,
      'Bearer synthetic',
    );

    expect(result).toEqual(expect.objectContaining({
      archivoId: 546,
      filename: 'OC_008979.pdf',
      contentType: 'application/pdf',
      storageProvider: 'nas',
      signedUrl: expect.stringContaining('/archivado/preview/546'),
      expiresIn: 120,
      expiresAt: expect.any(String),
    }));

    expect(Number.isNaN(Date.parse(result.expiresAt))).toBe(false);
  });

  it('mantiene el contrato R2 cuando NAS no aplica', async () => {
    const { getSignedUrl } = jest.requireMock('@aws-sdk/s3-request-presigner');
    const { S3Client, GetObjectCommand } = jest.requireMock('@aws-sdk/client-s3');

    getSignedUrl.mockReset();
    S3Client.mockReset();
    GetObjectCommand.mockReset();

    getSignedUrl.mockResolvedValueOnce(
      'https://r2.example.test/documento.pdf?signature=synthetic',
    );

    db.mockResolvedValueOnce([{
      id: 547,
      nombre_archivo: 'documento.pdf',
      storage_provider: 'r2',
      storage_bucket: 'bucket-test',
      storage_key: 'documentos/documento.pdf',
      ruta_archivo: null,
    }]);

    const archivado = {
      previewUrl: jest.fn().mockResolvedValue(null),
    };

    const config = {
      get: jest.fn((key: string) => ({
        R2_ENDPOINT: 'https://r2.example.test',
        R2_ACCESS_KEY_ID: 'synthetic-access',
        R2_SECRET_ACCESS_KEY: 'synthetic-secret',
        R2_SIGNED_URL_EXPIRES: '300',
      }[key])),
    };

    const service = new DocumentosPreviewService(
      config as any,
      archivado as any,
    );

    const result = await service.getArchivoPreviewUrl(
      547,
      'Bearer synthetic',
    );

    expect(archivado.previewUrl).toHaveBeenCalledWith(
      547,
      'Bearer synthetic',
    );

    expect(result).toEqual(expect.objectContaining({
      archivoId: 547,
      filename: 'documento.pdf',
      contentType: 'application/pdf',
      storageProvider: 'r2',
      storageBucket: 'bucket-test',
      storageKey: 'documentos/documento.pdf',
      signedUrl: 'https://r2.example.test/documento.pdf?signature=synthetic',
      expiresIn: 300,
      expiresAt: expect.any(String),
    }));

    expect(getSignedUrl).toHaveBeenCalledTimes(1);
    expect(Number.isNaN(Date.parse(result.expiresAt))).toBe(false);
  });

});
