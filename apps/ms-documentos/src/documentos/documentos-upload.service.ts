import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { sql } from '@documental/database';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';

const DEFAULT_AREA_ORIGEN = 'COMPRAS';
const DEFAULT_CANAL_INGRESO = 'WEB_ADMIN_GUIADO';

type UploadedFileLike = {
  originalname?: string;
  mimetype?: string;
  buffer?: Buffer;
  size?: number;
};

type CargaGuiadaBody = {
  documentoId?: string | number | null;
  expedienteId?: string | number | null;
  clienteAbreviatura?: string;
  areaOrigen?: string;
  tipoEsperado?: string;
  tipoRelacionSugerida?: string;
  canalIngreso?: string;
  observacion?: string;
};

type DocumentoRow = { id: number };
type ArchivoRow = { id: number };
type DuplicadoRow = { id: number; documento_id: number | null };

function firstNonEmpty(...values: Array<string | undefined | null>) {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim();
}

function toOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function sanitizeFilename(filename: string) {
  const base = path.basename(filename || 'documento.pdf');
  return base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 180) || 'documento.pdf';
}

function inferContentType(file: UploadedFileLike, filename: string) {
  const mimetype = firstNonEmpty(file.mimetype);
  if (mimetype) return mimetype;

  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

function normalizeUpper(value: string | undefined | null, fallback: string) {
  const normalized = String(value ?? '').trim().toUpperCase();
  return normalized || fallback;
}

@Injectable()
export class DocumentosUploadService {
  constructor(private readonly config: ConfigService) {}

  async cargaGuiada(file: UploadedFileLike | undefined, body: CargaGuiadaBody) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Archivo requerido en el campo file o archivo');
    }

    const clienteAbreviatura = normalizeUpper(body.clienteAbreviatura, '');
    if (!clienteAbreviatura) {
      throw new BadRequestException('clienteAbreviatura es obligatorio');
    }

    const tipoEsperado = normalizeUpper(body.tipoEsperado, 'OTRO');
    const areaOrigen = normalizeUpper(body.areaOrigen, DEFAULT_AREA_ORIGEN);
    const canalIngreso = normalizeUpper(body.canalIngreso, DEFAULT_CANAL_INGRESO);
    const tipoRelacionSugerida = firstNonEmpty(body.tipoRelacionSugerida) ?? null;
    const observacion = firstNonEmpty(body.observacion) ?? null;
    const expedienteId = toOptionalNumber(body.expedienteId);
    const documentoIdPayload = toOptionalNumber(body.documentoId);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthPadded = String(month).padStart(2, '0');

    const originalFilename = sanitizeFilename(file.originalname ?? 'documento.pdf');
    const contentType = inferContentType(file, originalFilename);
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');

    const bucket = this.resolveBucket();
    const storageKey = [
      'documentos',
      String(year),
      monthPadded,
      clienteAbreviatura,
      `${randomUUID()}__${originalFilename}`,
    ].join('/');

    const documentoId = documentoIdPayload ?? await this.crearDocumentoContenedor({
      clienteAbreviatura,
      tipoEsperado,
      year,
      month,
      expedienteId,
      tipoRelacionSugerida,
      canalIngreso,
      originalFilename,
      contentType,
      sha256,
    });

    const duplicados = await this.buscarDuplicados({
      sha256,
      documentoId,
      expedienteId,
    });

    await this.subirAR2({
      bucket,
      storageKey,
      body: file.buffer,
      contentType,
    });

    const archivoRows = await sql<ArchivoRow[]>`
      INSERT INTO documentos.documentos_archivos (
        documento_id,
        nombre_archivo,
        ruta_archivo,
        hash_sha256,
        tipo_version,
        area_origen,
        estado,
        origen_archivo,
        observacion,
        metadata,
        storage_provider,
        storage_bucket,
        storage_key,
        public_url
      ) VALUES (
        ${documentoId},
        ${originalFilename},
        ${storageKey},
        ${sha256},
        'original',
        ${areaOrigen},
        'subido',
        ${canalIngreso},
        ${observacion},
        ${JSON.stringify({
          contentType,
          size: file.size ?? file.buffer.length,
          expedienteId,
          clienteAbreviatura,
          tipoEsperado,
          tipoRelacionSugerida,
          canalIngreso,
          uploadOrigen: 'carga-guiada',
          duplicadoAdvertencia: duplicados.length > 0,
          duplicados: duplicados.map((item) => ({
            archivoId: item.id,
            documentoId: item.documento_id,
          })),
        })}::jsonb,
        'r2',
        ${bucket},
        ${storageKey},
        NULL
      )
      RETURNING id
    `;

    const archivoId = archivoRows[0]?.id;
    if (!archivoId) {
      throw new BadRequestException('No se pudo registrar documentos_archivos');
    }

    return {
      archivoId,
      documentoId,
      filename: originalFilename,
      contentType,
      storageProvider: 'r2',
      storageBucket: bucket,
      storageKey,
      estado: 'subido',
      hashSha256: sha256,
      duplicadoAdvertencia: duplicados.length > 0,
      duplicados: duplicados.map((item) => ({
        archivoId: item.id,
        documentoId: item.documento_id,
      })),
    };
  }

  private async crearDocumentoContenedor(params: {
    clienteAbreviatura: string;
    tipoEsperado: string;
    year: number;
    month: number;
    expedienteId: number | null;
    tipoRelacionSugerida: string | null;
    canalIngreso: string;
    originalFilename: string;
    contentType: string;
    sha256: string;
  }) {
    const rows = await sql<DocumentoRow[]>`
      INSERT INTO documentos.documentos (
        cliente_abreviatura,
        anio,
        mes,
        tipo_documental,
        estado,
        metadata,
        periodo_anio,
        periodo_mes
      ) VALUES (
        ${params.clienteAbreviatura},
        ${params.year},
        ${params.month},
        ${params.tipoEsperado},
        'pendiente_ocr',
        ${JSON.stringify({
          origen: 'WEB_ADMIN_CARGA_GUIADA',
          storageProvider: 'r2',
          expedienteId: params.expedienteId,
          tipoRelacionSugerida: params.tipoRelacionSugerida,
          canalIngreso: params.canalIngreso,
          filename: params.originalFilename,
          contentType: params.contentType,
          hashSha256: params.sha256,
        })}::jsonb,
        ${params.year},
        ${params.month}
      )
      RETURNING id
    `;

    const documentoId = rows[0]?.id;
    if (!documentoId) {
      throw new BadRequestException('No se pudo crear documento contenedor');
    }

    return documentoId;
  }

  private async buscarDuplicados(params: {
    sha256: string;
    documentoId: number;
    expedienteId: number | null;
  }) {
    const porDocumento = await sql<DuplicadoRow[]>`
      SELECT id, documento_id
      FROM documentos.documentos_archivos
      WHERE hash_sha256 = ${params.sha256}
        AND documento_id = ${params.documentoId}
      LIMIT 5
    `;

    if (porDocumento.length > 0 || !params.expedienteId) {
      return porDocumento;
    }

    return sql<DuplicadoRow[]>`
      SELECT da.id, da.documento_id
      FROM documentos.documentos_archivos da
      INNER JOIN documentos.expediente_documentos ed
        ON ed.documento_id = da.documento_id
      WHERE da.hash_sha256 = ${params.sha256}
        AND ed.expediente_id = ${params.expedienteId}
      LIMIT 5
    `;
  }

  private resolveBucket() {
    const bucket = firstNonEmpty(
      this.config.get<string>('R2_BUCKET'),
      process.env.R2_BUCKET,
      this.config.get<string>('R2_BUCKET_NAME'),
      process.env.R2_BUCKET_NAME,
      this.config.get<string>('STORAGE_R2_BUCKET'),
      process.env.STORAGE_R2_BUCKET,
    );

    if (!bucket) {
      throw new BadRequestException('R2_BUCKET no está configurado');
    }

    return bucket;
  }

  private resolveS3Client() {
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
      throw new BadRequestException('Configuración R2 incompleta para upload');
    }

    return new S3Client({
      region: firstNonEmpty(this.config.get<string>('R2_REGION'), process.env.R2_REGION) ?? 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  private async subirAR2(params: {
    bucket: string;
    storageKey: string;
    body: Buffer;
    contentType: string;
  }) {
    const client = this.resolveS3Client();

    await client.send(
      new PutObjectCommand({
        Bucket: params.bucket,
        Key: params.storageKey,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );
  }
}
