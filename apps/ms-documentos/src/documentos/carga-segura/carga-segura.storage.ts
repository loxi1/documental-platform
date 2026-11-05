import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { CargaSeguraError } from './carga-segura.errors';
import type {
  CargaSeguraStorageCopyInput,
  CargaSeguraStorageCopyResult,
  CargaSeguraStorageDeleteInput,
  CargaSeguraStorageKeyInput,
  CargaSeguraStorageObject,
  CargaSeguraStoragePutInput,
  CargaSeguraStoragePutResult,
  CargaSeguraStorageStatResult,
} from './carga-segura.types';

export interface CargaSeguraStorage {
  exists(input: CargaSeguraStorageObject): Promise<boolean>;

  putObject(
    input: CargaSeguraStoragePutInput,
  ): Promise<CargaSeguraStoragePutResult>;

  deleteObject(input: CargaSeguraStorageDeleteInput): Promise<void>;

  statObject(
    input: CargaSeguraStorageObject,
  ): Promise<CargaSeguraStorageStatResult>;

  copyObject(
    input: CargaSeguraStorageCopyInput,
  ): Promise<CargaSeguraStorageCopyResult>;

  verifyExistingObject(
    input: CargaSeguraStorageCopyInput,
  ): Promise<void>;
}

export function buildCargaSeguraStorageKey(
  input: CargaSeguraStorageKeyInput,
): string {
  if (!Number.isSafeInteger(input.operacionId) || input.operacionId <= 0) {
    throw new TypeError('operacionId debe ser un entero positivo');
  }

  const fecha = input.fecha ?? new Date();

  if (Number.isNaN(fecha.getTime())) {
    throw new TypeError('fecha inválida');
  }

  const year = String(fecha.getUTCFullYear());
  const month = String(fecha.getUTCMonth() + 1).padStart(2, '0');

  const empresa = sanitizePathSegment(
    input.empresaCodigo,
    'EMPRESA',
  ).toUpperCase();

  const filename = sanitizeFilename(input.nombreArchivo);

  return [
    'documentos',
    year,
    month,
    empresa,
    `${input.operacionId}__${filename}`,
  ].join('/');
}

@Injectable()
export class R2CargaSeguraStorage implements CargaSeguraStorage {
  private client: S3Client | null = null;

  constructor(private readonly config: ConfigService) {}

  async exists(input: CargaSeguraStorageObject): Promise<boolean> {
    try {
      await this.getClient().send(
        new HeadObjectCommand({
          Bucket: input.bucket,
          Key: input.key,
        }),
      );

      return true;
    } catch (error) {
      if (isObjectNotFound(error)) {
        return false;
      }

      throw this.storageError(
        'No se pudo comprobar la existencia del objeto R2',
        error,
      );
    }
  }

  async statObject(
    input: CargaSeguraStorageObject,
  ): Promise<CargaSeguraStorageStatResult> {
    try {
      const result = await this.getClient().send(
        new HeadObjectCommand({
          Bucket: input.bucket,
          Key: input.key,
        }),
      );

      return {
        provider: input.provider,
        bucket: input.bucket,
        key: input.key,
        exists: true,
        tamanoBytes:
          typeof result.ContentLength === 'number'
            ? result.ContentLength
            : null,
        hashSha256:
          typeof result.Metadata?.sha256 === 'string'
            ? result.Metadata.sha256.toLowerCase()
            : null,
      };
    } catch (error) {
      if (isObjectNotFound(error)) {
        return {
          provider: input.provider,
          bucket: input.bucket,
          key: input.key,
          exists: false,
          tamanoBytes: null,
          hashSha256: null,
        };
      }

      throw this.storageError(
        'No se pudo consultar metadata del objeto R2',
        error,
      );
    }
  }

  async copyObject(
    input: CargaSeguraStorageCopyInput,
  ): Promise<CargaSeguraStorageCopyResult> {
    // Keep the existing adapter contract, but never issue S3 CopyObject here.
    const { operationIdentity, hashSha256, tamanoBytes } = input;
    // Single PUT only. Multipart completion exclusion is deliberately not assumed.
    if (!operationIdentity || !/^[a-f0-9]{64}$/.test(hashSha256) ||
        !Number.isSafeInteger(tamanoBytes) || tamanoBytes < 1 || tamanoBytes > 5_000_000_000 ||
        input.sourceKey === input.destinationKey) {
      throw new TypeError('SAFE_TRANSFER_INVALID_OR_EXCEEDS_SINGLE_PUT_LIMIT');
    }
    const directory = await mkdtemp(path.join(tmpdir(), 'documental-safe-put-'));
    const filename = path.join(directory, 'body');
    let source: Readable | undefined;
    let upload: Readable | undefined;
    try {
      const result = await this.getClient().send(new GetObjectCommand({
        Bucket: input.bucket, Key: input.sourceKey,
      }));
      source = result.Body as Readable;
      if (!source || result.ContentLength !== tamanoBytes) throw new Error('TEMP_SIZE_MISMATCH');
      const digest = createHash('sha256');
      let bytes = 0;
      const validate = new Transform({ transform(chunk, _encoding, callback) {
        bytes += chunk.length;
        if (bytes > tamanoBytes) return callback(new Error('TEMP_SIZE_MISMATCH'));
        digest.update(chunk); callback(null, chunk);
      }});
      await pipeline(source, validate, createWriteStream(filename, { flags: 'wx', mode: 0o600 }));
      if (bytes !== tamanoBytes || digest.digest('hex') !== hashSha256) throw new Error('TEMP_HASH_MISMATCH');
      upload = createReadStream(filename);
      try {
        await this.getClient().send(new PutObjectCommand({
          Bucket: input.bucket, Key: input.destinationKey, Body: upload,
          ContentLength: tamanoBytes, ContentType: input.contentType,
          IfNoneMatch: '*', ChecksumSHA256: Buffer.from(hashSha256, 'hex').toString('base64'),
          Metadata: { sha256: hashSha256, 'operation-id': operationIdentity },
        }));
      } catch (error) {
        if (!isPreconditionFailed(error)) throw error;
        // 412 is a collision until both durable identity and actual bytes match.
      } finally { upload.destroy(); }
      await this.verifyOperationObject(input);
      return { provider: input.provider, bucket: input.bucket,
        sourceKey: input.sourceKey, destinationKey: input.destinationKey };
    } catch (error) {
      throw this.storageError('No se pudo promover el objeto mediante PUT seguro', error);
    } finally {
      source?.destroy(); upload?.destroy();
      await rm(directory, { recursive: true, force: true });
    }
  }

  async verifyExistingObject(input: CargaSeguraStorageCopyInput): Promise<void> {
    await this.verifyOperationObject(input);
  }

  private async verifyOperationObject(input: CargaSeguraStorageCopyInput) {
    const object = await this.getClient().send(new GetObjectCommand({
      Bucket: input.bucket, Key: input.destinationKey,
    }));
    const body = object.Body as Readable;
    try {
      if (!body || object.ContentLength !== input.tamanoBytes ||
          object.Metadata?.['operation-id'] !== input.operationIdentity ||
          object.Metadata?.sha256 !== input.hashSha256) throw new Error('DESTINATION_IDENTITY_CONFLICT');
      const digest = createHash('sha256'); let bytes = 0;
      for await (const chunk of body) {
        bytes += chunk.length;
        if (bytes > input.tamanoBytes) throw new Error('DESTINATION_SIZE_MISMATCH');
        digest.update(chunk);
      }
      if (bytes !== input.tamanoBytes || digest.digest('hex') !== input.hashSha256) {
        throw new Error('DESTINATION_HASH_MISMATCH');
      }
    } finally { body?.destroy(); }
  }

  async putObject(
    input: CargaSeguraStoragePutInput,
  ): Promise<CargaSeguraStoragePutResult> {
    try {
      await this.getClient().send(
        new PutObjectCommand({
          Bucket: input.bucket,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
          Metadata: {
            sha256: input.hashSha256,
          },
          IfNoneMatch: '*',
        }),
      );
    } catch (error) {
      if (isPreconditionFailed(error)) {
        return {
          kind: 'PREEXISTING',
          provider: 'r2',
          bucket: input.bucket,
          key: input.key,
          preexisting: true,
        };
      }

      throw this.storageError('No se pudo almacenar el objeto R2', error);
    }

    return {
      kind: 'CREATED',
      provider: 'r2',
      bucket: input.bucket,
      key: input.key,
      preexisting: false,
    };
  }

  async deleteObject(input: CargaSeguraStorageDeleteInput): Promise<void> {
    try {
      await this.getClient().send(
        new DeleteObjectCommand({
          Bucket: input.bucket,
          Key: input.key,
        }),
      );
    } catch (error) {
      throw this.storageError('No se pudo eliminar el objeto R2', error);
    }
  }

  private getClient(): S3Client {
    if (this.client) {
      return this.client;
    }

    const accountId = firstNonEmpty(
      this.config.get<string>('R2_ACCOUNT_ID'),
      process.env.R2_ACCOUNT_ID,
      this.config.get<string>('CLOUDFLARE_ACCOUNT_ID'),
      process.env.CLOUDFLARE_ACCOUNT_ID,
    );

    const endpoint = firstNonEmpty(
      this.config.get<string>('R2_ENDPOINT'),
      process.env.R2_ENDPOINT,
      this.config.get<string>('R2_ENDPOINT_URL'),
      process.env.R2_ENDPOINT_URL,
      this.config.get<string>('CLOUDFLARE_R2_ENDPOINT'),
      process.env.CLOUDFLARE_R2_ENDPOINT,
      accountId ? `https://${accountId}.r2.cloudflarestorage.com` : null,
    );

    const accessKeyId = firstNonEmpty(
      this.config.get<string>('R2_ACCESS_KEY_ID'),
      process.env.R2_ACCESS_KEY_ID,
      this.config.get<string>('AWS_ACCESS_KEY_ID'),
      process.env.AWS_ACCESS_KEY_ID,
    );

    const secretAccessKey = firstNonEmpty(
      this.config.get<string>('R2_SECRET_ACCESS_KEY'),
      process.env.R2_SECRET_ACCESS_KEY,
      this.config.get<string>('AWS_SECRET_ACCESS_KEY'),
      process.env.AWS_SECRET_ACCESS_KEY,
    );

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new CargaSeguraError(
        'CARGA_SEGURA_STORAGE_FAILED',
        'Configuración R2 incompleta',
      );
    }

    const forcePathStyleConfig = firstNonEmpty(
      this.config.get<string>('R2_FORCE_PATH_STYLE'),
      process.env.R2_FORCE_PATH_STYLE,
    );

    const forcePathStyle =
      forcePathStyleConfig?.toLowerCase() === 'true' ||
      endpoint.includes('minio-lab') ||
      endpoint.includes('localhost') ||
      endpoint.includes('127.0.0.1');

    this.client = new S3Client({
      region:
        firstNonEmpty(
          this.config.get<string>('R2_REGION'),
          process.env.R2_REGION,
        ) ?? 'auto',
      endpoint,
      forcePathStyle,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    return this.client;
  }

  private storageError(message: string, error: unknown): CargaSeguraError {
    return new CargaSeguraError('CARGA_SEGURA_STORAGE_FAILED', message, {
      cause: error instanceof Error ? error.name : 'UNKNOWN',
    });
  }
}

function firstNonEmpty(
  ...values: Array<string | null | undefined>
): string | undefined {
  return values
    .find((value) => typeof value === 'string' && value.trim().length > 0)
    ?.trim();
}

function sanitizeFilename(filename: string): string {
  const base = path.basename(filename || 'documento.bin');

  return (
    base
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 180) || 'documento.bin'
  );
}

function sanitizePathSegment(value: string, fallback: string): string {
  return (
    value
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || fallback
  );
}

function isObjectNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    name?: string;
    Code?: string;
    $metadata?: {
      httpStatusCode?: number;
    };
  };

  return (
    candidate.$metadata?.httpStatusCode === 404 ||
    candidate.name === 'NotFound' ||
    candidate.name === 'NoSuchKey' ||
    candidate.Code === 'NotFound' ||
    candidate.Code === 'NoSuchKey'
  );
}

function isPreconditionFailed(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    name?: string;
    Code?: string;
    code?: string;
    $metadata?: {
      httpStatusCode?: number;
    };
  };

  return (
    candidate.$metadata?.httpStatusCode === 412 ||
    candidate.name === 'PreconditionFailed' ||
    candidate.Code === 'PreconditionFailed' ||
    candidate.code === 'PreconditionFailed'
  );
}
