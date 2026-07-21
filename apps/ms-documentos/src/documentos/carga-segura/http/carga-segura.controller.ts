import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UploadedFiles,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { CargaSeguraService } from '../carga-segura.service';
import type { CargaSeguraCommand } from '../carga-segura.types';
import { validateCargaSeguraFileSignature } from './carga-segura-file-signature';
import { sanitizeCargaSeguraFilename } from './carga-segura-filename';
import { CargaSeguraHttpValidationError } from './carga-segura-http.error';
import { CargaSeguraHttpExceptionFilter } from './carga-segura-http.filter';
import { mapCargaSeguraResultToHttp } from './carga-segura-http.mapper';
import {
  CARGA_SEGURA_MULTER_FIELDS,
  CARGA_SEGURA_MULTER_OPTIONS,
} from './carga-segura-multer';
import {
  parseCargaSeguraMetadata,
  parseNullableBodyText,
  parseNullablePositiveInteger,
  parseRequiredBodyText,
  parseRequiredBoolean,
  resolveCargaSeguraHttpIdentity,
  validateCargaSeguraFileSize,
} from './carga-segura-http.validation';

interface CargaSeguraUploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

type CargaSeguraUploadedFiles = Partial<
  Record<'archivo' | 'file', CargaSeguraUploadedFile[]>
>;

type CargaSeguraMultipartBody = Record<string, unknown>;

const ALLOWED_BODY_FIELDS = new Set([
  'expedienteId',
  'tipoDocumental',
  'tipoRelacion',
  'esPrincipal',
  'canalIngreso',
  'metadata',
]);

@ApiTags('documentos')
@Controller('documentos')
@UseFilters(new CargaSeguraHttpExceptionFilter())
export class CargaSeguraController {
  constructor(private readonly cargaSeguraService: CargaSeguraService) {}

  @ApiOperation({
    summary: 'Carga documental segura interna de ms-documentos',
  })
  @ApiConsumes('multipart/form-data')
  @Post('carga-segura')
  @UseInterceptors(
    FileFieldsInterceptor(
      [...CARGA_SEGURA_MULTER_FIELDS],
      CARGA_SEGURA_MULTER_OPTIONS,
    ),
  )
  async cargar(
    @UploadedFiles()
    files: CargaSeguraUploadedFiles | undefined,
    @Body() body: CargaSeguraMultipartBody,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertAllowedBodyFields(body);
    assertSingleRawHeader(request, 'idempotency-key');

    const file = resolveSingleFile(files);

    validateCargaSeguraFileSize(file.buffer);

    const contentType = validateCargaSeguraFileSignature(
      file.mimetype,
      file.buffer,
    );

    const identity = resolveCargaSeguraHttpIdentity({
      workspaceId: request.headers['x-workspace-id'],
      empresaCodigo: request.headers['x-empresa-codigo'],
      clienteDestinoId: request.headers['x-cliente-destino-id'],
      actorId: request.headers['x-actor-id'],
      userId: request.headers['x-user-id'],
      requestId: request.headers['x-request-id'],
      correlationId: request.headers['x-correlation-id'],
      idempotencyKey: request.headers['idempotency-key'],
    });

    request.headers['x-request-id'] = identity.requestId;
    response.setHeader('x-request-id', identity.requestId);

    const command: CargaSeguraCommand = {
      workspaceId: identity.workspaceId,
      empresaCodigo: identity.empresaCodigo,
      clienteDestinoId: identity.clienteDestinoId,
      expedienteId: parseNullablePositiveInteger(
        body.expedienteId,
        'expedienteId',
      ),
      actorId: identity.actorId,
      idempotencyKey: identity.idempotencyKey,
      requestId: identity.requestId,
      correlationId: identity.correlationId,
      canalIngreso: parseRequiredBodyText(body.canalIngreso, 'canalIngreso'),
      tipoDocumental: parseRequiredBodyText(
        body.tipoDocumental,
        'tipoDocumental',
      ),
      tipoRelacion: parseNullableBodyText(body.tipoRelacion, 'tipoRelacion'),
      esPrincipal: parseRequiredBoolean(body.esPrincipal, 'esPrincipal'),
      nombreArchivo: sanitizeCargaSeguraFilename(
        file.originalname,
        contentType,
      ),
      contentType,
      tamanoBytes: file.buffer.length,
      archivo: file.buffer,
      metadata: parseCargaSeguraMetadata(body.metadata),
    };

    const result = await this.cargaSeguraService.ejecutar(command);

    const mapped = mapCargaSeguraResultToHttp(result);

    response.status(mapped.status);

    return mapped.data;
  }
}

function resolveSingleFile(
  files: CargaSeguraUploadedFiles | undefined,
): CargaSeguraUploadedFile {
  const archivo = files?.archivo?.[0];
  const alias = files?.file?.[0];

  if (archivo && alias) {
    throw validationError('No se puede enviar archivo y file simultáneamente');
  }

  const resolved = archivo ?? alias;

  if (!resolved) {
    throw validationError('La solicitud debe contener exactamente un archivo');
  }

  if (
    !Buffer.isBuffer(resolved.buffer) ||
    resolved.size <= 0 ||
    resolved.size !== resolved.buffer.length
  ) {
    throw validationError('El archivo multipart es inválido');
  }

  return resolved;
}

function assertAllowedBodyFields(body: CargaSeguraMultipartBody): void {
  for (const field of Object.keys(body)) {
    if (!ALLOWED_BODY_FIELDS.has(field)) {
      throw validationError(`El campo ${field} no está permitido`, {
        field,
      });
    }
  }
}

function assertSingleRawHeader(request: Request, headerName: string): void {
  let occurrences = 0;

  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    const currentName = request.rawHeaders[index];

    if (currentName?.toLowerCase() === headerName.toLowerCase()) {
      occurrences += 1;
    }
  }

  if (occurrences > 1) {
    throw validationError('Idempotency-Key contiene valores ambiguos');
  }
}

function validationError(
  message: string,
  details: Readonly<Record<string, unknown>> = {},
): CargaSeguraHttpValidationError {
  return new CargaSeguraHttpValidationError(
    'VALIDATION_ERROR',
    message,
    details,
  );
}
