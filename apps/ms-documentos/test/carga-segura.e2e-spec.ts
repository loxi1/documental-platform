import { type INestApplication, type NestMiddleware } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';

import type {
  CargaSeguraCommand,
  CargaSeguraResult,
} from '../src/documentos/carga-segura/carga-segura.types';

jest.mock('../src/documentos/carga-segura/carga-segura.service', () => ({
  CargaSeguraService: class CargaSeguraService {},
}));

jest.mock('@documental/shared', () => ({
  REQUEST_ID_HEADER: 'x-request-id',
}));

import { ApiResponseInterceptor } from '../src/common/interceptors/api-response.interceptor';
import { RequestIdMiddleware } from '../src/common/middleware/request-id.middleware';
import { CargaSeguraError } from '../src/documentos/carga-segura/carga-segura.errors';
import { CargaSeguraService } from '../src/documentos/carga-segura/carga-segura.service';
import { CargaSeguraController } from '../src/documentos/carga-segura/http/carga-segura.controller';
import { CARGA_SEGURA_HTTP_MAX_FILE_SIZE_BYTES } from '../src/documentos/carga-segura/http/carga-segura-http.constants';

describe('CargaSeguraController HTTP multipart (e2e)', () => {
  let app: INestApplication<App>;

  const ejecutar = jest.fn<Promise<CargaSeguraResult>, [CargaSeguraCommand]>();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CargaSeguraController],
      providers: [
        {
          provide: CargaSeguraService,
          useValue: {
            ejecutar,
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    const requestIdMiddleware: NestMiddleware = new RequestIdMiddleware();

    app.use((req: Request, res: Response, next: NextFunction): void => {
      requestIdMiddleware.use(req, res, next);
    });

    app.useGlobalInterceptors(new ApiResponseInterceptor());

    app.setGlobalPrefix('api/v1');

    await app.init();
  });

  beforeEach(() => {
    ejecutar.mockReset();
  });

  afterAll(async () => {
    await app.close();
  });

  it('crea una carga con archivo y devuelve envelope 201', async () => {
    ejecutar.mockResolvedValue({
      kind: 'CREATED',
      operacionId: 100,
      documentoId: 200,
      archivoId: 300,
      hashSha256: 'hash-created',
    });

    const pdf = validPdf();

    const response = await baseRequest()
      .set('X-Request-Id', 'req-e2e-created')
      .field('expedienteId', '41')
      .field('tipoDocumental', 'FACTURA')
      .field('tipoRelacion', 'adjunto_factura')
      .field('esPrincipal', 'false')
      .field('canalIngreso', 'COMPRAS_UPLOAD_PRINCIPAL')
      .field('metadata', '{"origen":"e2e"}')
      .attach('archivo', pdf, {
        filename: 'factura prueba.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    expect(response.headers['x-request-id']).toBe('req-e2e-created');

    expect(response.body).toMatchObject({
      success: true,
      requestId: 'req-e2e-created',
      data: {
        kind: 'CREATED',
        operacionId: 100,
        documentoId: 200,
        archivoId: 300,
        hashSha256: 'hash-created',
      },
    });

    const createdBody = asJsonRecord(response.body as unknown);

    expect(typeof createdBody.timestamp).toBe('string');

    expect(ejecutar).toHaveBeenCalledTimes(1);

    const command = ejecutar.mock.calls[0]?.[0];

    expect(command).toBeDefined();

    if (!command) {
      throw new Error('No se recibió CargaSeguraCommand');
    }

    expect(command).toMatchObject({
      workspaceId: 7,
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
      expedienteId: 41,
      actorId: 55,
      idempotencyKey: 'idem-e2e-1',
      requestId: 'req-e2e-created',
      correlationId: 'corr-e2e-1',
      canalIngreso: 'COMPRAS_UPLOAD_PRINCIPAL',
      tipoDocumental: 'FACTURA',
      tipoRelacion: 'adjunto_factura',
      esPrincipal: false,
      nombreArchivo: 'factura prueba.pdf',
      contentType: 'application/pdf',
      tamanoBytes: pdf.length,
      metadata: {
        origen: 'e2e',
      },
    });

    expect(command.archivo).toEqual(pdf);
  });

  it('acepta file como alias y devuelve replay 200', async () => {
    ejecutar.mockResolvedValue({
      kind: 'REPLAYED',
      operacionId: 101,
      documentoId: 201,
      archivoId: 301,
      hashSha256: 'hash-replayed',
    });

    const response = await baseRequest()
      .set('X-Request-Id', 'req-e2e-replay')
      .field('tipoDocumental', 'OTRO')
      .field('esPrincipal', 'true')
      .field('canalIngreso', 'WEB_ADMIN')
      .attach('file', validPng(), {
        filename: 'imagen.png',
        contentType: 'image/png',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      requestId: 'req-e2e-replay',
      data: {
        kind: 'REPLAYED',
        operacionId: 101,
      },
    });

    expect(ejecutar).toHaveBeenCalledTimes(1);
  });

  it('genera requestId cuando el cliente no lo envía', async () => {
    ejecutar.mockResolvedValue({
      kind: 'CREATED',
      operacionId: 102,
      documentoId: 202,
      archivoId: 302,
      hashSha256: 'hash-request-id',
    });

    const response = await baseRequest(false)
      .field('tipoDocumental', 'FACTURA')
      .field('esPrincipal', 'false')
      .field('canalIngreso', 'WEB_ADMIN')
      .attach('archivo', validPdf(), {
        filename: 'documento.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    expect(response.headers['x-request-id']).toEqual(expect.any(String));

    const generatedBody = asJsonRecord(response.body as unknown);

    const generatedRequestId = generatedBody.requestId;

    expect(generatedRequestId).toBe(response.headers['x-request-id']);

    expect(typeof generatedRequestId).toBe('string');

    if (typeof generatedRequestId !== 'string') {
      throw new Error('Se esperaba requestId textual en el envelope');
    }

    expect(generatedRequestId.length).toBeGreaterThan(0);
  });

  it('rechaza ausencia de archivo con 422', async () => {
    const response = await baseRequest()
      .field('tipoDocumental', 'FACTURA')
      .field('esPrincipal', 'false')
      .field('canalIngreso', 'WEB_ADMIN')
      .expect(422);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'CARGA_SEGURA_SOLICITUD_INVALIDA',
      },
    });

    expect(ejecutar).not.toHaveBeenCalled();
  });

  it('rechaza archivo y file simultáneos con 422', async () => {
    const response = await baseRequest()
      .field('tipoDocumental', 'FACTURA')
      .field('esPrincipal', 'false')
      .field('canalIngreso', 'WEB_ADMIN')
      .attach('archivo', validPdf(), {
        filename: 'uno.pdf',
        contentType: 'application/pdf',
      })
      .attach('file', validPdf(), {
        filename: 'dos.pdf',
        contentType: 'application/pdf',
      })
      .expect(422);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'CARGA_SEGURA_SOLICITUD_INVALIDA',
      },
    });

    expect(ejecutar).not.toHaveBeenCalled();
  });

  it('rechaza campo físico inesperado con 422', async () => {
    const response = await baseRequest()
      .field('tipoDocumental', 'FACTURA')
      .field('esPrincipal', 'false')
      .field('canalIngreso', 'WEB_ADMIN')
      .attach('otro', validPdf(), {
        filename: 'otro.pdf',
        contentType: 'application/pdf',
      })
      .expect(422);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'CARGA_SEGURA_SOLICITUD_INVALIDA',
      },
    });

    expect(ejecutar).not.toHaveBeenCalled();
  });

  it('rechaza campo textual inesperado con 422', async () => {
    const response = await baseRequest()
      .field('tipoDocumental', 'FACTURA')
      .field('esPrincipal', 'false')
      .field('canalIngreso', 'WEB_ADMIN')
      .field('nombreArchivo', 'ignorado.pdf')
      .attach('archivo', validPdf(), {
        filename: 'documento.pdf',
        contentType: 'application/pdf',
      })
      .expect(422);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'CARGA_SEGURA_SOLICITUD_INVALIDA',
        details: {
          field: 'nombreArchivo',
        },
      },
    });

    expect(ejecutar).not.toHaveBeenCalled();
  });

  it('rechaza firma incompatible con MIME usando 415', async () => {
    const response = await baseRequest()
      .field('tipoDocumental', 'FACTURA')
      .field('esPrincipal', 'false')
      .field('canalIngreso', 'WEB_ADMIN')
      .attach('archivo', validJpeg(), {
        filename: 'falso.pdf',
        contentType: 'application/pdf',
      })
      .expect(415);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'CARGA_SEGURA_SOLICITUD_INVALIDA',
      },
    });

    expect(ejecutar).not.toHaveBeenCalled();
  });

  it('rechaza más de 15 MiB usando 413', async () => {
    const oversized = Buffer.alloc(
      CARGA_SEGURA_HTTP_MAX_FILE_SIZE_BYTES + 1,
      0x41,
    );

    oversized.write('%PDF-', 0, 'ascii');

    const response = await baseRequest()
      .field('tipoDocumental', 'FACTURA')
      .field('esPrincipal', 'false')
      .field('canalIngreso', 'WEB_ADMIN')
      .attach('archivo', oversized, {
        filename: 'grande.pdf',
        contentType: 'application/pdf',
      })
      .expect(413);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'CARGA_SEGURA_SOLICITUD_INVALIDA',
      },
    });

    expect(ejecutar).not.toHaveBeenCalled();
  });

  it('mapea duplicate a 409 y conserva código', async () => {
    ejecutar.mockResolvedValue({
      kind: 'DUPLICATE',
      operacionId: 103,
      documentoId: 203,
      archivoId: 303,
      hashSha256: 'hash-duplicate',
    });

    const response = await validUpload().expect(409);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'CARGA_SEGURA_DUPLICATE',
        details: {
          operacionId: 103,
          documentoId: 203,
          archivoId: 303,
        },
      },
    });
  });

  it('mapea operación en progreso a 409', async () => {
    ejecutar.mockResolvedValue({
      kind: 'RECONCILIATION_REQUIRED',
      operacionId: 104,
      errorCode: 'CARGA_SEGURA_OPERACION_EN_PROGRESO',
    });

    const response = await validUpload().expect(409);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'CARGA_SEGURA_OPERACION_EN_PROGRESO',
      },
    });
  });

  it('mapea reconciliación real a 202', async () => {
    ejecutar.mockResolvedValue({
      kind: 'RECONCILIATION_REQUIRED',
      operacionId: 105,
      errorCode: 'ARCHIVO_REQUIERE_RECONCILIACION',
    });

    const response = await validUpload().expect(202);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        kind: 'RECONCILIATION_REQUIRED',
        operacionId: 105,
        errorCode: 'ARCHIVO_REQUIERE_RECONCILIACION',
      },
    });
  });

  it('mapea feature deshabilitada a 503 seguro', async () => {
    ejecutar.mockRejectedValue(
      new CargaSeguraError(
        'CARGA_SEGURA_DESHABILITADA',
        'mensaje interno no público',
      ),
    );

    const response = await validUpload().expect(503);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'CARGA_SEGURA_DESHABILITADA',
        message: 'La carga documental segura no está disponible',
        details: null,
      },
    });

    expect(JSON.stringify(response.body)).not.toContain(
      'mensaje interno no público',
    );
  });

  it('oculta errores desconocidos usando 500 genérico', async () => {
    ejecutar.mockRejectedValue(new Error('secreto-interno-e2e'));

    const response = await validUpload().expect(500);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error interno del servidor',
        details: null,
      },
    });

    expect(JSON.stringify(response.body)).not.toContain('secreto-interno-e2e');
  });

  function baseRequest(includeRequestId = true): request.Test {
    let pending = request(app.getHttpServer())
      .post('/api/v1/documentos/carga-segura')
      .set('X-Workspace-Id', '7')
      .set('X-Empresa-Codigo', 'BBTI')
      .set('X-Cliente-Destino-Id', '2')
      .set('X-Actor-Id', '55')
      .set('X-Correlation-Id', 'corr-e2e-1')
      .set('Idempotency-Key', 'idem-e2e-1');

    if (includeRequestId) {
      pending = pending.set('X-Request-Id', 'req-e2e-default');
    }

    return pending;
  }

  function validUpload(): request.Test {
    return baseRequest()
      .field('tipoDocumental', 'FACTURA')
      .field('esPrincipal', 'false')
      .field('canalIngreso', 'WEB_ADMIN')
      .attach('archivo', validPdf(), {
        filename: 'documento.pdf',
        contentType: 'application/pdf',
      });
  }
});

function validPdf(): Buffer {
  return Buffer.from('%PDF-1.7\ncontenido-e2e');
}

function validPng(): Buffer {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
}

function validJpeg(): Buffer {
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
}

function asJsonRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Se esperaba un objeto JSON como respuesta HTTP');
  }

  return value as Record<string, unknown>;
}
