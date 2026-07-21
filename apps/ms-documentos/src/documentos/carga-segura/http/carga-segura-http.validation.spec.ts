import {
  CARGA_SEGURA_HTTP_MAX_FILE_SIZE_BYTES,
  CARGA_SEGURA_HTTP_MAX_FILENAME_BYTES,
} from './carga-segura-http.constants';
import { CargaSeguraHttpValidationError } from './carga-segura-http.error';
import { validateCargaSeguraFileSignature } from './carga-segura-file-signature';
import { sanitizeCargaSeguraFilename } from './carga-segura-filename';
import {
  parseCargaSeguraMetadata,
  parseIdempotencyKey,
  parseNullablePositiveInteger,
  parseRequiredBoolean,
  resolveCargaSeguraHttpIdentity,
  validateCargaSeguraFileSize,
} from './carga-segura-http.validation';

describe('carga-segura HTTP validation', () => {
  describe('firma de archivo', () => {
    it('acepta PDF con firma válida', () => {
      const buffer = Buffer.from('%PDF-1.7 contenido');

      expect(validateCargaSeguraFileSignature('application/pdf', buffer)).toBe(
        'application/pdf',
      );
    });

    it('acepta JPEG con firma válida', () => {
      const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

      expect(validateCargaSeguraFileSignature('image/jpeg', buffer)).toBe(
        'image/jpeg',
      );
    });

    it('acepta PNG con firma válida', () => {
      const buffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);

      expect(validateCargaSeguraFileSignature('image/png', buffer)).toBe(
        'image/png',
      );
    });

    it('rechaza MIME PDF con firma JPEG', () => {
      const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

      expect(() =>
        validateCargaSeguraFileSignature('application/pdf', buffer),
      ).toThrow(CargaSeguraHttpValidationError);
    });

    it('rechaza MIME no permitido', () => {
      expect(() =>
        validateCargaSeguraFileSignature(
          'application/octet-stream',
          Buffer.from('contenido'),
        ),
      ).toThrow(CargaSeguraHttpValidationError);
    });

    it('rechaza archivo demasiado corto', () => {
      expect(() =>
        validateCargaSeguraFileSignature('application/pdf', Buffer.from('%P')),
      ).toThrow(CargaSeguraHttpValidationError);
    });
  });

  describe('nombre de archivo', () => {
    it('elimina rutas y caracteres de control', () => {
      const result = sanitizeCargaSeguraFilename(
        '../../carpeta/mi\u0000 documento.pdf',
        'application/pdf',
      );

      expect(result).toBe('mi documento.pdf');
    });

    it('normaliza separadores Windows', () => {
      const result = sanitizeCargaSeguraFilename(
        '..\\carpeta\\imagen.png',
        'image/png',
      );

      expect(result).toBe('imagen.png');
    });

    it('usa fallback cuando el nombre queda vacío', () => {
      expect(sanitizeCargaSeguraFilename('\u0000', 'image/jpeg')).toBe(
        'documento.jpg',
      );
    });

    it('limita el nombre a 255 bytes UTF-8', () => {
      const result = sanitizeCargaSeguraFilename(
        `${'á'.repeat(300)}.pdf`,
        'application/pdf',
      );

      expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(
        CARGA_SEGURA_HTTP_MAX_FILENAME_BYTES,
      );
      expect(result.endsWith('.pdf')).toBe(true);
    });
  });

  describe('headers internos', () => {
    it('resuelve identidad completa', () => {
      const result = resolveCargaSeguraHttpIdentity({
        workspaceId: '10',
        empresaCodigo: ' BBTI ',
        clienteDestinoId: '2',
        actorId: '7',
        userId: undefined,
        requestId: 'req-1',
        correlationId: 'corr-1',
        idempotencyKey: 'idem-1',
      });

      expect(result).toEqual({
        workspaceId: 10,
        empresaCodigo: 'BBTI',
        clienteDestinoId: 2,
        actorId: 7,
        requestId: 'req-1',
        correlationId: 'corr-1',
        idempotencyKey: 'idem-1',
      });
    });

    it('acepta x-user-id como alias de actor', () => {
      const result = resolveCargaSeguraHttpIdentity({
        workspaceId: '10',
        empresaCodigo: 'BBTI',
        clienteDestinoId: '2',
        actorId: undefined,
        userId: '7',
        requestId: undefined,
        correlationId: undefined,
        idempotencyKey: 'idem-1',
      });

      expect(result.actorId).toBe(7);
      expect(result.requestId).toBeTruthy();
      expect(result.correlationId).toBe(result.requestId);
    });

    it('rechaza actor y usuario contradictorios', () => {
      expect(() =>
        resolveCargaSeguraHttpIdentity({
          workspaceId: '10',
          empresaCodigo: 'BBTI',
          clienteDestinoId: '2',
          actorId: '7',
          userId: '8',
          requestId: undefined,
          correlationId: undefined,
          idempotencyKey: 'idem-1',
        }),
      ).toThrow(CargaSeguraHttpValidationError);
    });

    it('rechaza valores múltiples de Idempotency-Key', () => {
      expect(() => parseIdempotencyKey(['uno', 'dos'])).toThrow(
        CargaSeguraHttpValidationError,
      );
    });

    it('rechaza caracteres de control en Idempotency-Key', () => {
      expect(() => parseIdempotencyKey('abc\n123')).toThrow(
        CargaSeguraHttpValidationError,
      );
    });
  });

  describe('body multipart', () => {
    it('interpreta booleanos estrictos', () => {
      expect(parseRequiredBoolean('true', 'esPrincipal')).toBe(true);
      expect(parseRequiredBoolean('false', 'esPrincipal')).toBe(false);
    });

    it('rechaza booleanos ambiguos', () => {
      expect(() => parseRequiredBoolean('1', 'esPrincipal')).toThrow(
        CargaSeguraHttpValidationError,
      );
    });

    it('acepta entero positivo o null', () => {
      expect(parseNullablePositiveInteger('41', 'expedienteId')).toBe(41);
      expect(parseNullablePositiveInteger('', 'expedienteId')).toBeNull();
    });

    it('rechaza entero no positivo', () => {
      expect(() => parseNullablePositiveInteger('0', 'expedienteId')).toThrow(
        CargaSeguraHttpValidationError,
      );
    });
  });

  describe('metadata', () => {
    it('acepta objeto JSON', () => {
      expect(parseCargaSeguraMetadata('{"origen":"laboratorio"}')).toEqual({
        origen: 'laboratorio',
      });
    });

    it('rechaza array como raíz', () => {
      expect(() => parseCargaSeguraMetadata('[]')).toThrow(
        CargaSeguraHttpValidationError,
      );
    });

    it('rechaza clave reservada', () => {
      expect(() => parseCargaSeguraMetadata('{"workspaceId":10}')).toThrow(
        CargaSeguraHttpValidationError,
      );
    });

    it('rechaza profundidad excesiva', () => {
      const value: Record<string, unknown> = {};
      let current = value;

      for (let index = 0; index < 11; index += 1) {
        const child: Record<string, unknown> = {};
        current.child = child;
        current = child;
      }

      expect(() => parseCargaSeguraMetadata(value)).toThrow(
        CargaSeguraHttpValidationError,
      );
    });
  });

  describe('tamaño', () => {
    it('acepta exactamente 15 MiB', () => {
      expect(() =>
        validateCargaSeguraFileSize(
          Buffer.alloc(CARGA_SEGURA_HTTP_MAX_FILE_SIZE_BYTES),
        ),
      ).not.toThrow();
    });

    it('rechaza un byte sobre el límite', () => {
      let capturedError: unknown;

      try {
        validateCargaSeguraFileSize(
          Buffer.alloc(CARGA_SEGURA_HTTP_MAX_FILE_SIZE_BYTES + 1),
        );
      } catch (error: unknown) {
        capturedError = error;
      }

      expect(capturedError).toBeInstanceOf(CargaSeguraHttpValidationError);

      if (!(capturedError instanceof CargaSeguraHttpValidationError)) {
        throw new Error('Se esperaba CargaSeguraHttpValidationError');
      }

      expect(capturedError.kind).toBe('PAYLOAD_TOO_LARGE');
    });

    it('rechaza archivo vacío', () => {
      expect(() => validateCargaSeguraFileSize(Buffer.alloc(0))).toThrow(
        CargaSeguraHttpValidationError,
      );
    });
  });
});
