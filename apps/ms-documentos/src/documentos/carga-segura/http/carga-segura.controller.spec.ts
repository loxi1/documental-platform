import type { Request, Response } from 'express';

import type { CargaSeguraService } from '../carga-segura.service';
import type {
  CargaSeguraCommand,
  CargaSeguraResult,
} from '../carga-segura.types';
jest.mock('../carga-segura.service', () => ({
  CargaSeguraService: class CargaSeguraService {},
}));

import { CargaSeguraController } from './carga-segura.controller';
import { CargaSeguraHttpValidationError } from './carga-segura-http.error';

describe('CargaSeguraController', () => {
  let ejecutar: jest.MockedFunction<
    (command: CargaSeguraCommand) => Promise<CargaSeguraResult>
  >;
  let controller: CargaSeguraController;

  beforeEach(() => {
    ejecutar = jest.fn();

    const service = {
      ejecutar,
    } as unknown as CargaSeguraService;

    controller = new CargaSeguraController(service);
  });

  it('construye y envía el comando usando archivo', async () => {
    ejecutar.mockResolvedValue({
      kind: 'CREATED',
      operacionId: 100,
      documentoId: 200,
      archivoId: 300,
      hashSha256: 'hash-created',
    });

    const pdf = Buffer.from('%PDF-1.7\ncontenido');
    const request = createRequest();
    const response = createResponse();

    const result = await controller.cargar(
      {
        archivo: [
          {
            fieldname: 'archivo',
            originalname: '../factura prueba.pdf',
            encoding: '7bit',
            mimetype: 'application/pdf',
            size: pdf.length,
            buffer: pdf,
          },
        ],
      },
      {
        expedienteId: '41',
        tipoDocumental: 'FACTURA',
        tipoRelacion: 'adjunto_factura',
        esPrincipal: 'false',
        canalIngreso: 'COMPRAS_UPLOAD_PRINCIPAL',
        metadata: '{"comentarioUsuario":"unit-test"}',
      },
      request,
      response.response,
    );

    expect(result).toEqual({
      kind: 'CREATED',
      operacionId: 100,
      documentoId: 200,
      archivoId: 300,
      hashSha256: 'hash-created',
    });

    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.setHeader).toHaveBeenCalledWith(
      'x-request-id',
      'req-unit-1',
    );

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
      idempotencyKey: 'idem-unit-1',
      requestId: 'req-unit-1',
      correlationId: 'corr-unit-1',
      canalIngreso: 'COMPRAS_UPLOAD_PRINCIPAL',
      tipoDocumental: 'FACTURA',
      tipoRelacion: 'adjunto_factura',
      esPrincipal: false,
      nombreArchivo: 'factura prueba.pdf',
      contentType: 'application/pdf',
      tamanoBytes: pdf.length,
      metadata: {
        comentarioUsuario: 'unit-test',
      },
    });

    expect(command.archivo).toEqual(pdf);
  });

  it('rechaza ausencia de archivo', async () => {
    await expect(
      controller.cargar(
        undefined,
        {},
        createRequest(),
        createResponse().response,
      ),
    ).rejects.toBeInstanceOf(CargaSeguraHttpValidationError);

    expect(ejecutar).not.toHaveBeenCalled();
  });

  it('rechaza campos multipart inesperados', async () => {
    const pdf = Buffer.from('%PDF-1.7\ncontenido');

    await expect(
      controller.cargar(
        {
          archivo: [
            {
              fieldname: 'archivo',
              originalname: 'documento.pdf',
              encoding: '7bit',
              mimetype: 'application/pdf',
              size: pdf.length,
              buffer: pdf,
            },
          ],
        },
        {
          nombreArchivo: 'ignorado.pdf',
        },
        createRequest(),
        createResponse().response,
      ),
    ).rejects.toBeInstanceOf(CargaSeguraHttpValidationError);

    expect(ejecutar).not.toHaveBeenCalled();
  });

  it('rechaza Idempotency-Key repetida en rawHeaders', async () => {
    const pdf = Buffer.from('%PDF-1.7\ncontenido');
    const request = createRequest();

    request.rawHeaders.push('Idempotency-Key', 'idem-unit-2');

    await expect(
      controller.cargar(
        {
          archivo: [
            {
              fieldname: 'archivo',
              originalname: 'documento.pdf',
              encoding: '7bit',
              mimetype: 'application/pdf',
              size: pdf.length,
              buffer: pdf,
            },
          ],
        },
        {},
        request,
        createResponse().response,
      ),
    ).rejects.toBeInstanceOf(CargaSeguraHttpValidationError);

    expect(ejecutar).not.toHaveBeenCalled();
  });
});

function createRequest(): Request {
  return {
    headers: {
      'x-workspace-id': '7',
      'x-empresa-codigo': 'BBTI',
      'x-cliente-destino-id': '2',
      'x-actor-id': '55',
      'x-request-id': 'req-unit-1',
      'x-correlation-id': 'corr-unit-1',
      'idempotency-key': 'idem-unit-1',
    },
    rawHeaders: [
      'X-Workspace-Id',
      '7',
      'X-Empresa-Codigo',
      'BBTI',
      'X-Cliente-Destino-Id',
      '2',
      'X-Actor-Id',
      '55',
      'X-Request-Id',
      'req-unit-1',
      'X-Correlation-Id',
      'corr-unit-1',
      'Idempotency-Key',
      'idem-unit-1',
    ],
  } as unknown as Request;
}

function createResponse(): {
  response: Response;
  status: jest.MockedFunction<(statusCode: number) => Response>;
  setHeader: jest.MockedFunction<(name: string, value: string) => Response>;
} {
  const status = jest.fn<Response, [number]>();

  const setHeader = jest.fn<Response, [string, string]>();

  const response = {
    status,
    setHeader,
  } as unknown as Response;

  status.mockReturnValue(response);
  setHeader.mockReturnValue(response);

  return {
    response,
    status,
    setHeader,
  };
}
