import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { sql } from '@documental/database';
import { DocumentoEventosService } from '../documento-eventos/documento-eventos.service';
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
  claveDocumental?: string;
  codigoExpediente?: string;
};

type DocumentoRow = { id: number };
type ArchivoRow = { id: number };
type DuplicadoRow = {
  id: number;
  documento_id: number | null;
  nombre_archivo?: string | null;
  storage_key?: string | null;
  expediente_id?: number | null;
  tipo_relacion?: string | null;
  es_principal?: boolean | null;
};

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
  constructor(
    private readonly config: ConfigService,
    private readonly documentoEventos: DocumentoEventosService,
  ) {}

  async prevalidarCarga(file: UploadedFileLike | undefined, body: CargaGuiadaBody) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Archivo requerido en el campo file o archivo');
    }

    const clienteAbreviatura = normalizeUpper(body.clienteAbreviatura, '');
    if (!clienteAbreviatura) {
      throw new BadRequestException('clienteAbreviatura es obligatorio');
    }

    const tipoEsperado = normalizeUpper(body.tipoEsperado, 'OTRO');
    const tipoRelacionSugerida = firstNonEmpty(body.tipoRelacionSugerida) ?? null;
    const expedienteId = toOptionalNumber(body.expedienteId);
    const documentoIdPayload = toOptionalNumber(body.documentoId);
    const claveDocumental = firstNonEmpty(body.claveDocumental) ?? null;
    const codigoExpedientePayload = firstNonEmpty(body.codigoExpediente) ?? null;

    const originalFilename = sanitizeFilename(file.originalname ?? 'documento.pdf');
    const contentType = inferContentType(file, originalFilename);
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');

    const [duplicados, expedienteInfo, documentoExistente] = await Promise.all([
      this.buscarDuplicadosPorHash({
        sha256,
        documentoId: documentoIdPayload,
        expedienteId,
      }),
      expedienteId ? this.obtenerResumenExpediente(expedienteId) : Promise.resolve(null),
      claveDocumental ? this.buscarDocumentoPorClave(claveDocumental) : Promise.resolve(null),
    ]);

    const documentoYaVinculado = documentoExistente?.expedienteId
      ? {
          expedienteId: documentoExistente.expedienteId,
          tipoRelacion: documentoExistente.tipoRelacion ?? null,
          esPrincipal: documentoExistente.esPrincipal === true,
        }
      : null;

    const codigoExpedienteCoincide = !codigoExpedientePayload || !expedienteInfo?.codigoExpediente
      ? null
      : codigoExpedientePayload === expedienteInfo.codigoExpediente;

    const expedienteTienePrincipal = expedienteInfo?.principalActivo ? true : false;
    const intentaPrincipal = this.esSolicitudPrincipal(tipoRelacionSugerida, body);

    let accionSugerida: 'abrir_existente' | 'vincular_existente' | 'cargar_nuevo' | 'bloquear' | 'requiere_confirmacion' = 'cargar_nuevo';
    let motivo: string | null = null;

    if (duplicados.length > 0) {
      accionSugerida = 'abrir_existente';
      motivo = 'ARCHIVO_DUPLICADO_POR_HASH';
    } else if (documentoExistente?.id && documentoYaVinculado?.expedienteId && expedienteId && Number(documentoYaVinculado.expedienteId) !== Number(expedienteId)) {
      accionSugerida = 'bloquear';
      motivo = 'DOCUMENTO_YA_VINCULADO_A_OTRO_EXPEDIENTE';
    } else if (codigoExpedienteCoincide === false) {
      accionSugerida = 'bloquear';
      motivo = 'CODIGO_EXPEDIENTE_NO_COINCIDE';
    } else if (intentaPrincipal && expedienteTienePrincipal) {
      accionSugerida = 'bloquear';
      motivo = 'EXPEDIENTE_YA_TIENE_DOCUMENTO_PRINCIPAL';
    } else if (documentoExistente?.id && expedienteId) {
      accionSugerida = 'vincular_existente';
      motivo = 'MISMA_CLAVE_DOCUMENTAL';
    }

    return {
      hashSha256: sha256,
      filename: originalFilename,
      contentType,
      clienteAbreviatura,
      tipoEsperado,
      expedienteId,
      documentoId: documentoIdPayload,
      claveDocumental,
      documentoExistente,
      documentoYaVinculado,
      expedienteTienePrincipal,
      principalActivo: expedienteInfo?.principalActivo ?? null,
      codigoExpedienteCoincide,
      codigoExpedienteSeleccionado: expedienteInfo?.codigoExpediente ?? null,
      codigoExpedienteDetectado: codigoExpedientePayload,
      duplicadoArchivo: duplicados.length > 0,
      duplicados: duplicados.map((item) => ({
        archivoId: item.id,
        documentoId: item.documento_id,
        nombreArchivo: item.nombre_archivo ?? null,
        storageKey: item.storage_key ?? null,
        expedienteId: item.expediente_id ?? null,
        tipoRelacion: item.tipo_relacion ?? null,
        esPrincipal: item.es_principal ?? null,
      })),
      accionSugerida,
      motivo,
      persistido: false,
      storageProvider: null,
    };
  }

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

    const duplicadosPrevios = await this.buscarDuplicadosPorHash({
      sha256,
      documentoId: documentoIdPayload,
      expedienteId,
    });

    if (duplicadosPrevios.length > 0) {
      throw new ConflictException({
        code: 'ARCHIVO_DUPLICADO_EN_CARGA_GUIADA',
        message: 'Ya existe un archivo equivalente. No se subió nuevamente a R2.',
        details: {
          expedienteId,
          documentoId: documentoIdPayload,
          hashSha256: sha256,
          duplicados: duplicadosPrevios.map((item) => ({
            archivoId: item.id,
            documentoId: item.documento_id,
            nombreArchivo: item.nombre_archivo ?? null,
            storageKey: item.storage_key ?? null,
            expedienteId: item.expediente_id ?? null,
            tipoRelacion: item.tipo_relacion ?? null,
            esPrincipal: item.es_principal ?? null,
          })),
          accionSugerida: 'abrir_existente',
        },
      });
    }

    const intentaPrincipal = this.esSolicitudPrincipal(tipoRelacionSugerida, body);

    if (expedienteId && intentaPrincipal) {
      const expedienteInfo = await this.obtenerResumenExpediente(expedienteId);
      const principalActivo = expedienteInfo?.principalActivo ?? null;

      if (principalActivo && Number(principalActivo.documentoId) !== Number(documentoIdPayload ?? 0)) {
        throw new ConflictException({
          code: 'EXPEDIENTE_YA_TIENE_DOCUMENTO_PRINCIPAL',
          message: 'El expediente ya tiene un documento principal activo. No se subió nuevamente a R2.',
          details: {
            expedienteId,
            codigoExpediente: expedienteInfo?.codigoExpediente ?? null,
            documentoId: documentoIdPayload,
            tipoRelacionSugerida,
            canalIngreso,
            principalActivo,
            accionSugerida: 'bloquear',
          },
        });
      }
    }

    const bucket = this.resolveBucket();
    const storageKey = [
      'documentos',
      String(year),
      monthPadded,
      clienteAbreviatura,
      `${randomUUID()}__${originalFilename}`,
    ].join('/');

    const documentoCreado = !documentoIdPayload;
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

    if (documentoCreado) {
      await this.documentoEventos.registrarEvento({
        documentoId,
        tipoEvento: 'documento.creado',
        entidadTipo: 'documento',
        entidadId: documentoId,
        expedienteId,
        descripcion: 'Documento contenedor creado desde carga guiada.',
        metadata: {
          clienteAbreviatura,
          tipoEsperado,
          canalIngreso,
          areaOrigen,
          filename: originalFilename,
          contentType,
          hashSha256: sha256,
        },
        origen: 'api',
      });
    }

    const duplicados: DuplicadoRow[] = [];

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
        public_url,
        version,
        es_version_actual
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
        NULL,
        1,
        true
      )
      RETURNING id
    `;

    const archivoId = archivoRows[0]?.id;
    if (!archivoId) {
      throw new BadRequestException('No se pudo registrar documentos_archivos');
    }

    await this.documentoEventos.registrarEvento({
      documentoId,
      archivoId,
      tipoEvento: 'archivo.subido',
      entidadTipo: 'archivo',
      entidadId: archivoId,
      expedienteId,
      descripcion: 'Archivo subido desde carga guiada.',
      metadata: {
        filename: originalFilename,
        contentType,
        storageProvider: 'r2',
        storageBucket: bucket,
        storageKey,
        areaOrigen,
        canalIngreso,
        tipoEsperado,
        hashSha256: sha256,
        duplicadoAdvertencia: duplicados.length > 0
      },
      origen: 'api',
    });

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

  private async buscarDuplicadosPorHash(params: {
    sha256: string;
    documentoId: number | null;
    expedienteId: number | null;
  }) {
    return sql<DuplicadoRow[]>`
      SELECT
        da.id,
        da.documento_id,
        da.nombre_archivo,
        da.storage_key,
        ed.expediente_id,
        ed.tipo_relacion,
        ed.es_principal
      FROM documentos.documentos_archivos da
      LEFT JOIN documentos.expediente_documentos ed
        ON ed.documento_id = da.documento_id
      WHERE da.hash_sha256 = ${params.sha256}
        AND da.estado <> 'duplicado_absorbido'
        AND (
          ${params.documentoId}::bigint IS NULL
          OR da.documento_id = ${params.documentoId}::bigint
          OR ${params.expedienteId}::bigint IS NULL
          OR ed.expediente_id = ${params.expedienteId}::bigint
        )
      ORDER BY da.id DESC
      LIMIT 10
    `;
  }

  private async buscarDocumentoPorClave(claveDocumental: string) {
    const rows = await sql`
      SELECT
        d.id,
        d.clave_documental,
        d.tipo_documental,
        d.serie,
        d.numero,
        ed.expediente_id,
        ed.tipo_relacion,
        ed.es_principal
      FROM documentos.documentos d
      LEFT JOIN documentos.expediente_documentos ed
        ON ed.documento_id = d.id
      WHERE d.clave_documental = ${claveDocumental}
      ORDER BY d.id DESC
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
      id: Number(row.id),
      claveDocumental: row.clave_documental ?? null,
      tipoDocumental: row.tipo_documental ?? null,
      serie: row.serie ?? null,
      numero: row.numero ?? null,
      expedienteId: row.expediente_id ? Number(row.expediente_id) : null,
      tipoRelacion: row.tipo_relacion ?? null,
      esPrincipal: row.es_principal === true,
    };
  }

  private async obtenerResumenExpediente(expedienteId: number) {
    const expedienteRows = await sql`
      SELECT id, codigo_expediente, empresa_codigo, cliente_destino_id
      FROM documentos.expedientes
      WHERE id = ${expedienteId}::bigint
      LIMIT 1
    `;

    const expediente = expedienteRows[0];
    if (!expediente) return null;

    const principalRows = await sql`
      SELECT
        ed.documento_id,
        ed.tipo_relacion,
        d.tipo_documental,
        d.serie,
        d.numero,
        d.clave_documental
      FROM documentos.expediente_documentos ed
      JOIN documentos.documentos d
        ON d.id = ed.documento_id
      WHERE ed.expediente_id = ${expedienteId}::bigint
        AND ed.es_principal = true
      ORDER BY ed.orden ASC, ed.creado_en ASC
      LIMIT 1
    `;

    const principal = principalRows[0] ?? null;

    return {
      id: Number(expediente.id),
      codigoExpediente: expediente.codigo_expediente ?? null,
      empresaCodigo: expediente.empresa_codigo ?? null,
      clienteDestinoId: expediente.cliente_destino_id ? Number(expediente.cliente_destino_id) : null,
      principalActivo: principal
        ? {
            documentoId: Number(principal.documento_id),
            tipoRelacion: principal.tipo_relacion ?? null,
            tipoDocumental: principal.tipo_documental ?? null,
            serie: principal.serie ?? null,
            numero: principal.numero ?? null,
            claveDocumental: principal.clave_documental ?? null,
          }
        : null,
    };
  }

  private esSolicitudPrincipal(tipoRelacionSugerida: string | null, body: CargaGuiadaBody) {
    const rawEsPrincipal = (body as any).esPrincipal;
    if (rawEsPrincipal === true || rawEsPrincipal === 'true' || rawEsPrincipal === '1') {
      return true;
    }

    const tipo = String(tipoRelacionSugerida ?? '').trim().toLowerCase();
    if (['principal_oc', 'principal_os', 'principal_factura'].includes(tipo)) {
      return true;
    }

    const canalIngreso = String(body.canalIngreso ?? '').trim().toUpperCase();
    return canalIngreso === 'COMPRAS_NUEVO_UPLOAD_PRINCIPAL'
      || canalIngreso.endsWith('_UPLOAD_PRINCIPAL')
      || canalIngreso.includes('UPLOAD_PRINCIPAL');
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
