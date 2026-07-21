export type CargaSeguraHttpErrorKind =
  | 'VALIDATION_ERROR'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE';

export class CargaSeguraHttpValidationError extends Error {
  readonly kind: CargaSeguraHttpErrorKind;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(
    kind: CargaSeguraHttpErrorKind,
    message: string,
    details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);

    this.name = 'CargaSeguraHttpValidationError';
    this.kind = kind;
    this.details = details;
  }
}
