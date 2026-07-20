import type {
  CargaSeguraEstado,
  CargaSeguraResultKind,
} from './carga-segura.constants';

export type CargaSeguraMetadata = Record<string, unknown>;

export interface CargaSeguraCommand {
  workspaceId: number;
  empresaCodigo: string;
  clienteDestinoId: number | null;
  expedienteId: number | null;
  actorId: number;

  idempotencyKey: string;
  requestId: string | null;
  correlationId: string | null;

  canalIngreso: string;
  tipoDocumental: string;
  tipoRelacion: string | null;
  esPrincipal: boolean;

  nombreArchivo: string;
  contentType: string;
  tamanoBytes: number;
  archivo: Buffer;

  metadata?: CargaSeguraMetadata;
}

export interface CargaSeguraFingerprintPayload {
  workspaceId: number;
  empresaCodigo: string;
  clienteDestinoId: number | null;
  expedienteId: number | null;
  actorId: number;
  canalIngreso: string;
  tipoDocumental: string;
  tipoRelacion: string | null;
  esPrincipal: boolean;
  nombreArchivo: string;
  contentType: string;
  tamanoBytes: number;
  hashSha256: string;
}

export interface CargaSeguraOperationSnapshot {
  id: number;
  estado: CargaSeguraEstado;
  workspaceId: number;
  empresaCodigo: string;
  idempotencyKey: string;
  payloadFingerprint: string;
  hashSha256: string;
  documentoId: number | null;
  archivoId: number | null;
}

interface CargaSeguraBaseResult {
  kind: CargaSeguraResultKind;
  operacionId: number;
}

export interface CargaSeguraCreatedResult extends CargaSeguraBaseResult {
  kind: 'CREATED';
  documentoId: number;
  archivoId: number;
  hashSha256: string;
}

export interface CargaSeguraReplayedResult extends CargaSeguraBaseResult {
  kind: 'REPLAYED';
  documentoId: number;
  archivoId: number;
  hashSha256: string;
}

export interface CargaSeguraDuplicateResult extends CargaSeguraBaseResult {
  kind: 'DUPLICATE';
  documentoId: number;
  archivoId: number;
  hashSha256: string;
}

export interface CargaSeguraIdempotencyConflictResult extends CargaSeguraBaseResult {
  kind: 'IDEMPOTENCY_CONFLICT';
}

export interface CargaSeguraReconciliationRequiredResult extends CargaSeguraBaseResult {
  kind: 'RECONCILIATION_REQUIRED';
  errorCode: string;
}

export type CargaSeguraResult =
  | CargaSeguraCreatedResult
  | CargaSeguraReplayedResult
  | CargaSeguraDuplicateResult
  | CargaSeguraIdempotencyConflictResult
  | CargaSeguraReconciliationRequiredResult;

export interface ReservarCargaSeguraInput {
  workspaceId: number;
  empresaCodigo: string;
  clienteDestinoId: number | null;
  expedienteId: number | null;
  actorId: number;
  idempotencyKey: string;
  payloadFingerprint: string;
  requestId: string | null;
  correlationId: string | null;
  canalIngreso: string;
  nombreArchivo: string;
  contentType: string;
  tamanoBytes: number;
  hashSha256: string;
  metadata?: CargaSeguraMetadata;
}

export interface CargaSeguraOperacionRow {
  id: number;
  workspaceId: number;
  empresaCodigo: string;
  clienteDestinoId: number | null;
  expedienteId: number | null;
  actorId: number;
  idempotencyKey: string;
  payloadFingerprint: string;
  fingerprintVersion: string;
  requestId: string | null;
  correlationId: string | null;
  canalIngreso: string;
  estado: CargaSeguraEstado;
  requiereReconciliacion: boolean;
  nombreArchivo: string;
  contentType: string;
  tamanoBytes: number;
  hashSha256: string;
  storageProvider: string | null;
  storageBucket: string | null;
  storageKey: string | null;
  documentoId: number | null;
  archivoId: number | null;
  errorCodigo: string | null;
  errorDetalle: string | null;
  metadata: CargaSeguraMetadata;
  iniciadaEn: Date;
  almacenadaEn: Date | null;
  completadaEn: Date | null;
  fallidaEn: Date | null;
  expiraEn: Date;
  actualizadoEn: Date;
}

export type ReservaCargaSeguraResult =
  | {
      kind: 'RESERVED';
      operacion: CargaSeguraOperacionRow;
    }
  | {
      kind: 'REPLAYED';
      operacion: CargaSeguraOperacionRow;
    }
  | {
      kind: 'IDEMPOTENCY_CONFLICT';
      operacion: CargaSeguraOperacionRow;
    }
  | {
      kind: 'DUPLICATE';
      operacion: CargaSeguraOperacionRow;
    };

export interface CargaSeguraStorageObject {
  provider: 'r2';
  bucket: string;
  key: string;
}

export interface CargaSeguraStoragePutInput extends CargaSeguraStorageObject {
  body: Buffer;
  contentType: string;
  hashSha256: string;
}

export interface CargaSeguraStorageDeleteInput extends CargaSeguraStorageObject {}

export interface CargaSeguraStoragePutResult extends CargaSeguraStorageObject {
  preexisting: boolean;
}

export interface CargaSeguraStorageKeyInput {
  operacionId: number;
  empresaCodigo: string;
  nombreArchivo: string;
  fecha?: Date;
}

export interface CargaSeguraCompensationInput {
  operacion: CargaSeguraOperacionRow;
  objetoCreadoPorOperacion: boolean;
  objetoPreexistente: boolean;
  esReplay: boolean;
  errorCodigo: string;
  errorDetalle: string;
}

export type CargaSeguraCompensationResult =
  | {
      kind: 'COMPENSATED';
      operacionId: number;
    }
  | {
      kind: 'RECONCILIATION_REQUIRED';
      operacionId: number;
      reason: string;
    };
