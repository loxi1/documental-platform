import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { sql } from '@documental/database';

const DEFAULT_PREVIEW_EXPIRES_IN_SECONDS = 300;

type ArchivoPreviewRow = {
  id: number;
  nombre_archivo: string | null;
  storage_provider: string | null;
  storage_bucket: string | null;
  storage_key: string | null;
  ruta_archivo: string | null;
};

function inferContentType(filename: string, storageKey?: string | null) {
  const source = `${filename || ''} ${storageKey || ''}`.toLowerCase();

  if (source.endsWith('.pdf') || source.includes('.pdf')) return 'application/pdf';
  if (source.endsWith('.png') || source.includes('.png')) return 'image/png';
  if (source.endsWith('.webp') || source.includes('.webp')) return 'image/webp';
  if (source.endsWith('.gif') || source.includes('.gif')) return 'image/gif';
  if (
    source.endsWith('.jpg') ||
    source.endsWith('.jpeg') ||
    source.includes('.jpg') ||
    source.includes('.jpeg')
  ) {
    return 'image/jpeg';
  }

  return 'application/octet-stream';
}

function firstNonEmpty(...values: Array<string | undefined | null>) {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim();
}

@Injectable()
export class DocumentosPreviewService {
  constructor(private readonly config: ConfigService) {}

  async getArchivoPreviewUrl(archivoId: number) {
    const rows = await sql<ArchivoPreviewRow[]>`
      SELECT
        id,
        nombre_archivo,
        storage_provider,
        storage_bucket,
        storage_key,
        ruta_archivo
      FROM documentos.documentos_archivos
      WHERE id = ${archivoId}
      LIMIT 1
    `;

    const archivo = rows[0];

    if (!archivo) {
      throw new NotFoundException(`Archivo ${archivoId} no encontrado`);
    }

    const storageProvider = String(archivo.storage_provider ?? '').trim().toLowerCase();

    if (storageProvider !== 'r2') {
      throw new BadRequestException({
        message: 'Preview temporal disponible solo para archivos R2',
        archivoId,
        storageProvider: archivo.storage_provider ?? null,
        filename: archivo.nombre_archivo ?? null,
      });
    }

    const storageKey = firstNonEmpty(archivo.storage_key, archivo.ruta_archivo);

    if (!storageKey) {
      throw new BadRequestException({
        message: 'El archivo no tiene storage_key para generar preview',
        archivoId,
      });
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

    const bucket = firstNonEmpty(
      archivo.storage_bucket,
      this.config.get<string>('R2_BUCKET'),
      process.env.R2_BUCKET,
      this.config.get<string>('R2_BUCKET_NAME'),
      process.env.R2_BUCKET_NAME,
      this.config.get<string>('STORAGE_R2_BUCKET'),
      process.env.STORAGE_R2_BUCKET,
    );

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
      throw new BadRequestException({
        message: 'Configuración R2 incompleta para generar signed URL',
        required: [
          'R2_ENDPOINT o R2_ENDPOINT_URL o R2_ACCOUNT_ID',
          'R2_ACCESS_KEY_ID',
          'R2_SECRET_ACCESS_KEY',
          'R2_BUCKET o storage_bucket',
        ],
        archivoId,
      });
    }

    const filename = archivo.nombre_archivo || storageKey.split('/').pop() || `archivo-${archivoId}`;
    const contentType = inferContentType(filename, storageKey);

    const region = firstNonEmpty(
      this.config.get<string>('R2_REGION'),
      process.env.R2_REGION,
    ) ?? 'auto';

    const expiresIn = Number(
      firstNonEmpty(
        this.config.get<string>('R2_SIGNED_URL_EXPIRES'),
        process.env.R2_SIGNED_URL_EXPIRES,
        this.config.get<string>('R2_SIGNED_URL_EXPIRES_SECONDS'),
        process.env.R2_SIGNED_URL_EXPIRES_SECONDS,
      ) ?? DEFAULT_PREVIEW_EXPIRES_IN_SECONDS.toString(),
    );

    const safeExpiresIn = Number.isFinite(expiresIn) && expiresIn > 0
      ? expiresIn
      : DEFAULT_PREVIEW_EXPIRES_IN_SECONDS;

    const client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const signedUrl = await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        ResponseContentType: contentType,
        ResponseContentDisposition: `inline; filename="${filename.replace(/"/g, '')}"`,
      }),
      { expiresIn: safeExpiresIn },
    );

    const expiresAt = new Date(
      Date.now() + safeExpiresIn * 1000,
    ).toISOString();

    return {
      archivoId,
      filename,
      contentType,
      storageProvider: 'r2',
      storageBucket: bucket,
      storageKey,
      signedUrl,
      expiresIn: safeExpiresIn,
      expiresAt,
    };
  }
}
