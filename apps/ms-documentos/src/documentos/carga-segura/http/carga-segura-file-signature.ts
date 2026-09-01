import {
  CARGA_SEGURA_HTTP_ALLOWED_CONTENT_TYPES,
  type CargaSeguraHttpAllowedContentType,
} from './carga-segura-http.constants';
import { CargaSeguraHttpValidationError } from './carga-segura-http.error';

const PDF_SIGNATURE = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const SIGNATURES: Readonly<Record<CargaSeguraHttpAllowedContentType, Buffer>> =
  {
    'application/pdf': PDF_SIGNATURE,
    'image/jpeg': JPEG_SIGNATURE,
    'image/png': PNG_SIGNATURE,
  };

export function validateCargaSeguraFileSignature(
  declaredContentType: string,
  buffer: Buffer,
): CargaSeguraHttpAllowedContentType {
  const normalizedContentType = declaredContentType.trim().toLowerCase();

  if (!isAllowedContentType(normalizedContentType)) {
    throw new CargaSeguraHttpValidationError(
      'UNSUPPORTED_MEDIA_TYPE',
      'El tipo de archivo no está permitido',
      {
        contentType: normalizedContentType || null,
      },
    );
  }

  const signature = SIGNATURES[normalizedContentType];

  if (
    buffer.length < signature.length ||
    !buffer.subarray(0, signature.length).equals(signature)
  ) {
    throw new CargaSeguraHttpValidationError(
      'UNSUPPORTED_MEDIA_TYPE',
      'El contenido del archivo no coincide con el tipo declarado',
      {
        contentType: normalizedContentType,
      },
    );
  }

  return normalizedContentType;
}

export function isAllowedContentType(
  contentType: string,
): contentType is CargaSeguraHttpAllowedContentType {
  return (
    CARGA_SEGURA_HTTP_ALLOWED_CONTENT_TYPES as readonly string[]
  ).includes(contentType);
}
