import type { CargaSeguraErrorCode } from './carga-segura.constants';

export class CargaSeguraError extends Error {
  readonly code: CargaSeguraErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(
    code: CargaSeguraErrorCode,
    message: string,
    details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);

    this.name = 'CargaSeguraError';
    this.code = code;
    this.details = details;
  }
}
