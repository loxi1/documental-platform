import { HttpException, HttpStatus } from '@nestjs/common';

import { SECURE_UPLOAD } from './carga-segura.contract';
import {
  SecureUploadFile,
  validateIdempotencyKey,
  validateSecureUploadBody,
  validateSecureUploadFile,
} from './carga-segura.validation';

function getHttpException(callback: () => unknown): HttpException {
  try {
    callback();
  } catch (error: unknown) {
    if (error instanceof HttpException) {
      return error;
    }

    throw error;
  }

  throw new Error('Se esperaba HttpException');
}

function validBody(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    expedienteId: '41',
    tipoDocumental: 'FACTURA',
    tipoRelacion: '',
    esPrincipal: 'false',
    canalIngreso: 'WEB_ADMIN_CARGA_SEGURA',
    ...overrides,
  };
}

function validFile(
  overrides: Partial<SecureUploadFile> = {},
): SecureUploadFile {
  return {
    fieldname: 'archivo',
    originalname: 'factura.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.alloc(1024),
    ...overrides,
  };
}

describe('carga-segura.validation', () => {
  describe('validateSecureUploadBody', () => {
    it('normaliza el body externo permitido', () => {
      expect(
        validateSecureUploadBody(
          validBody({
            metadata: '{"origen":"workspace"}',
          }),
        ),
      ).toEqual({
        expedienteId: 41,
        tipoDocumental: 'FACTURA',
        tipoRelacion: null,
        esPrincipal: false,
        canalIngreso: 'WEB_ADMIN_CARGA_SEGURA',
        metadata: {
          origen: 'workspace',
        },
      });
    });

    it.each([undefined, null, '', '0', '-1', '1.5', 'texto', {}])(
      'rechaza expedienteId inválido: %p',
      (expedienteId) => {
        const error = getHttpException(() =>
          validateSecureUploadBody(validBody({ expedienteId })),
        );

        expect(error.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(error.getResponse()).toMatchObject({
          code: 'CARGA_SEGURA_SOLICITUD_INVALIDA',
        });
      },
    );

    it.each([
      ['tipoDocumental', ''],
      ['tipoDocumental', null],
      ['canalIngreso', ''],
      ['canalIngreso', null],
      ['esPrincipal', 'yes'],
      ['esPrincipal', 1],
    ])('rechaza campo obligatorio inválido %s=%p', (field, value) => {
      expect(() =>
        validateSecureUploadBody(validBody({ [field]: value })),
      ).toThrow(HttpException);
    });

    it('rechaza campos externos fuera del contrato', () => {
      const error = getHttpException(() =>
        validateSecureUploadBody(
          validBody({
            workspaceId: 99,
          }),
        ),
      );

      expect(error.getResponse()).toMatchObject({
        code: 'CARGA_SEGURA_SOLICITUD_INVALIDA',
      });
    });

    it.each([
      'workspaceId',
      'empresaCodigo',
      'clienteDestinoId',
      'actorId',
      'archivoId',
      'hashSha256',
      'storageKey',
      'storageBucket',
      'storageProvider',
      'publicUrl',
      '__proto__',
      'prototype',
      'constructor',
    ])('rechaza clave prohibida en metadata: %s', (key) => {
      const metadata = Object.create(null) as Record<string, unknown>;
      metadata[key] = 'malicioso';

      expect(() => validateSecureUploadBody(validBody({ metadata }))).toThrow(
        HttpException,
      );
    });

    it('rechaza metadata que no sea objeto JSON', () => {
      expect(() =>
        validateSecureUploadBody(validBody({ metadata: '[]' })),
      ).toThrow(HttpException);
    });

    it('rechaza metadata con JSON inválido', () => {
      expect(() =>
        validateSecureUploadBody(validBody({ metadata: '{' })),
      ).toThrow(HttpException);
    });

    it('rechaza metadata demasiado profunda', () => {
      const metadata = {
        a: {
          b: {
            c: {
              d: {
                e: {
                  f: {
                    g: {
                      h: true,
                    },
                  },
                },
              },
            },
          },
        },
      };

      expect(() => validateSecureUploadBody(validBody({ metadata }))).toThrow(
        HttpException,
      );
    });

    it('rechaza metadata sobre el límite textual', () => {
      const metadata = {
        contenido: 'x'.repeat(SECURE_UPLOAD.maxFieldSizeBytes),
      };

      expect(() => validateSecureUploadBody(validBody({ metadata }))).toThrow(
        HttpException,
      );
    });
  });

  describe('validateIdempotencyKey', () => {
    it('preserva exactamente una clave válida', () => {
      expect(validateIdempotencyKey('carga-segura-2026-0001')).toBe(
        'carga-segura-2026-0001',
      );
    });

    it.each([
      undefined,
      null,
      '',
      '   ',
      ['a', 'b'],
      'x'.repeat(SECURE_UPLOAD.maxIdempotencyKeyLength + 1),
      'abc\n123',
    ])('rechaza Idempotency-Key inválida: %p', (value) => {
      expect(() => validateIdempotencyKey(value)).toThrow(HttpException);
    });

    it.each([' clave', 'clave ', ' clave '])(
      'rechaza espacios periféricos sin normalización silenciosa: %p',
      (value) => {
        expect(() => validateIdempotencyKey(value)).toThrow(HttpException);
      },
    );

    it('acepta exactamente 128 caracteres', () => {
      const key = 'x'.repeat(SECURE_UPLOAD.maxIdempotencyKeyLength);

      expect(validateIdempotencyKey(key)).toBe(key);
    });
  });

  describe('validateSecureUploadFile', () => {
    it.each(['application/pdf', 'image/jpeg', 'image/png'])(
      'acepta MIME permitido %s',
      (mimetype) => {
        expect(validateSecureUploadFile(validFile({ mimetype }))).toMatchObject(
          { mimetype },
        );
      },
    );

    it('acepta exactamente 15 MiB', () => {
      const size = SECURE_UPLOAD.fileSizeBytes;

      expect(
        validateSecureUploadFile(
          validFile({
            size,
            buffer: Buffer.alloc(size),
          }),
        ).size,
      ).toBe(size);
    });

    it('rechaza 15 MiB más un byte', () => {
      const size = SECURE_UPLOAD.fileSizeBytes + 1;

      const error = getHttpException(() =>
        validateSecureUploadFile(
          validFile({
            size,
            buffer: Buffer.alloc(1),
          }),
        ),
      );

      expect(error.getStatus()).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
      expect(error.getResponse()).toMatchObject({
        code: 'PAYLOAD_TOO_LARGE',
      });
    });

    it('rechaza alias público file', () => {
      const error = getHttpException(() =>
        validateSecureUploadFile(validFile({ fieldname: 'file' })),
      );

      expect(error.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(error.getResponse()).toMatchObject({
        code: 'CARGA_SEGURA_SOLICITUD_INVALIDA',
      });
    });

    it('rechaza MIME no permitido', () => {
      const error = getHttpException(() =>
        validateSecureUploadFile(
          validFile({
            mimetype: 'application/octet-stream',
          }),
        ),
      );

      expect(error.getStatus()).toBe(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
      expect(error.getResponse()).toMatchObject({
        code: 'UNSUPPORTED_MEDIA_TYPE',
      });
    });

    it('rechaza archivo ausente o vacío', () => {
      expect(() => validateSecureUploadFile(undefined)).toThrow(HttpException);

      expect(() =>
        validateSecureUploadFile(
          validFile({
            size: 0,
            buffer: Buffer.alloc(0),
          }),
        ),
      ).toThrow(HttpException);
    });
  });
});
