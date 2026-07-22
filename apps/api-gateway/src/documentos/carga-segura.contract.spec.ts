import {
  SECURE_UPLOAD,
  SECURE_UPLOAD_PUBLIC_ERROR_CODES,
} from './carga-segura.contract';

describe('carga-segura.contract', () => {
  it('congela límites y autoridad contractual', () => {
    expect(SECURE_UPLOAD).toMatchObject({
      permission: 'documentos.subir',
      system: 'DOCUMENTAL',
      fileField: 'archivo',
      fileSizeBytes: 15_728_640,
      multipartTotalBytes: 16_777_216,
      timeoutMs: 55_000,
      maxFields: 6,
      maxParts: 7,
      maxIdempotencyKeyLength: 128,
    });
  });

  it('mantiene la lista exacta de MIME públicos', () => {
    expect([...SECURE_UPLOAD.allowedMimeTypes].sort()).toEqual(
      ['application/pdf', 'image/jpeg', 'image/png'].sort(),
    );
  });

  it('no admite file como campo público', () => {
    expect(SECURE_UPLOAD.fileField).toBe('archivo');
    expect(SECURE_UPLOAD.allowedBodyFields.has('file')).toBe(false);
  });

  it('incluye todos los códigos públicos congelados', () => {
    expect(SECURE_UPLOAD_PUBLIC_ERROR_CODES).toEqual(
      new Set([
        'CARGA_SEGURA_DUPLICATE',
        'CARGA_SEGURA_IDEMPOTENCY_CONFLICT',
        'CARGA_SEGURA_OPERACION_EN_PROGRESO',
        'CARGA_SEGURA_SOLICITUD_INVALIDA',
        'CARGA_SEGURA_DESHABILITADA',
        'CARGA_SEGURA_STORAGE_FAILED',
        'CARGA_SEGURA_PERSISTENCE_FAILED',
        'CARGA_SEGURA_RECONCILIATION_PERSIST_FAILED',
        'PAYLOAD_TOO_LARGE',
        'UNSUPPORTED_MEDIA_TYPE',
        'UNAUTHORIZED',
        'FORBIDDEN',
        'INTERNAL_SERVER_ERROR',
      ]),
    );
  });
});
