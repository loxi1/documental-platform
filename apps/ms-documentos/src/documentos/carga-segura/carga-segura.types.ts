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
