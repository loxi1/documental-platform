jest.mock('../logger/app-logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));
jest.mock('@documental/shared', () => ({
  REQUEST_ID_HEADER: 'x-request-id',
  ApiErrorCode: {
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    CONFLICT: 'CONFLICT',
  },
}));
import { ConflictException } from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';
import { logger } from '../logger/app-logger';
import { HttpExceptionFilter } from '../filters/http-exception.filter';
import { RequestLoggerInterceptor } from './request-logger.interceptor';

const requestId = '0906b48d-ffb4-4bb8-b89c-ebe496baa8d4';
function fixture(id: unknown = requestId) {
  const req: any = {
    headers: { 'x-request-id': id, authorization: 'Bearer TOKEN_PRIVATE' },
    method: 'POST',
    originalUrl: '/api/v1/documentos/tmp/320/promover?token=TOKEN_PRIVATE',
    route: { path: '/api/v1/documentos/tmp/:tempId/promover' },
    body: { metadata: { persona: 'PERSON_PRIVATE', sql: 'SQL_PRIVATE' } },
  };
  const res: any = {
    statusCode: 201,
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const context: any = {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  };
  return { req, res, context };
}
async function fail(error: unknown, f = fixture()) {
  await expect(
    firstValueFrom(
      new RequestLoggerInterceptor().intercept(f.context, {
        handle: () => throwError(() => error),
      }),
    ),
  ).rejects.toBe(error);
  return f;
}
function record() {
  return (logger.error as jest.Mock).mock.calls[0][0];
}
beforeEach(() => jest.resetAllMocks());

it('correlaciona TypeError y conserva ubicaciones de stack sin el mensaje libre', async () => {
  const error = Object.assign(new TypeError('DOCUMENT_PRIVATE'), {
    code: 'ERR_INVALID_ARG_TYPE',
  });
  error.stack =
    'TypeError: DOCUMENT_PRIVATE\n    at byteLength (node:buffer:777:3)\n    at save (/app/apps/ms-documentos/dist/documentos/tmp/tmp.repository.js:74:9)\n    at bind (file:///app/node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/src/connection.js:964:22)';
  await fail(error);
  expect(record()).toMatchObject({
    requestId,
    exceptionName: 'TypeError',
    technicalCode: 'ERR_INVALID_ARG_TYPE',
    statusCode: 500,
    path: '/api/v1/documentos/tmp/:tempId/promover',
  });
  expect(record().stack).toContain('/tmp/tmp.repository.js:74:9');
  expect(record().stack).toContain('node:buffer:777:3');
  expect(record().stack).toContain('postgres/src/connection.js:964:22');
  expect(JSON.stringify(record())).not.toContain('DOCUMENT_PRIVATE');
});

it('omite credenciales, URLs, SQL, metadatos y datos personales en error/cause/stack/request', async () => {
  const secrets = [
    'TOKEN_PRIVATE',
    'PASSWORD_PRIVATE',
    'SQL_PRIVATE',
    'PERSON_PRIVATE',
    'SIGNATURE_PRIVATE',
  ];
  const message =
    'postgresql://user:PASSWORD_PRIVATE@db SELECT SQL_PRIVATE PERSON_PRIVATE https://host/file?X-Amz-Signature=SIGNATURE_PRIVATE Bearer TOKEN_PRIVATE';
  const error: any = new Error(message);
  error.cause = { query: message, parameters: secrets };
  error.detail = message;
  error.stack =
    'Error: ' +
    message +
    '\n' +
    message +
    '\n at remote (https://host/file?X-Amz-Signature=SIGNATURE_PRIVATE)\n at PERSON_PRIVATE (/tmp/SQL_PRIVATE:1:1)\n at query (/app/node_modules/postgres/src/connection.js:964:22)';
  await fail(error);
  const logged = JSON.stringify(record());
  for (const secret of secrets) expect(logged).not.toContain(secret);
  expect(record()).not.toHaveProperty('cause');
  expect(record()).not.toHaveProperty('parameters');
  expect(record().stack).toContain('connection.js:964:22');
});

it('no serializa objetos lanzados ni invoca toString', async () => {
  const error = {
    metadata: 'PERSON_PRIVATE',
    toString: jest.fn(() => {
      throw Error('unsafe');
    }),
  };
  await fail(error);
  expect(error.toString).not.toHaveBeenCalled();
  expect(record()).toMatchObject({
    exceptionName: 'NonErrorThrown',
    error: 'Unexpected exception',
  });
  expect(JSON.stringify(record())).not.toContain('PERSON_PRIVATE');
});

it('no registra requestId arbitrario ni rutas sin plantilla', async () => {
  const f = fixture('Bearer TOKEN_PRIVATE');
  delete f.req.route;
  await fail(new Error('hidden'), f);
  expect(record().requestId).toBeUndefined();
  expect(record().path).toBe('[unmatched route]');
  expect(JSON.stringify(record())).not.toContain('TOKEN_PRIVATE');
});

it('permite SQLSTATE técnico pero omite códigos y nombres libres', async () => {
  await fail(
    Object.assign(new Error('hidden'), {
      name: 'PERSON_PRIVATE',
      code: 'TOKEN_PRIVATE',
    }),
  );
  expect(record().exceptionName).toBe('Error');
  expect(record().technicalCode).toBeUndefined();
  (logger.error as jest.Mock).mockClear();
  await fail(
    Object.assign(new Error('hidden'), {
      name: 'PostgresError',
      code: '23505',
    }),
  );
  expect(record()).toMatchObject({
    exceptionName: 'PostgresError',
    technicalCode: '23505',
  });
});

it('conserva contrato HTTP500 y no expone diagnóstico al cliente', async () => {
  const error = Object.assign(new TypeError('PASSWORD_PRIVATE'), {
    code: 'ERR_INVALID_ARG_TYPE',
  });
  const f = await fail(error);
  new HttpExceptionFilter().catch(error, f.context);
  expect(f.res.status).toHaveBeenCalledWith(500);
  expect(f.res.json).toHaveBeenCalledWith(
    expect.objectContaining({
      success: false,
      requestId,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error interno del servidor',
        details: null,
      },
    }),
  );
  expect(JSON.stringify(f.res.json.mock.calls)).not.toMatch(
    /PASSWORD_PRIVATE|ERR_INVALID_ARG_TYPE|TypeError|stack/,
  );
});

it('mantiene las excepciones HTTP esperadas y no registra sus detalles libres', async () => {
  const error = new ConflictException({
    message: 'business conflict',
    detail: 'PERSON_PRIVATE',
  });
  const f = await fail(error);
  new HttpExceptionFilter().catch(error, f.context);
  expect(f.res.status).toHaveBeenCalledWith(409);
  expect(f.res.json.mock.calls[0][0].error.message).toBe('business conflict');
  expect(record().statusCode).toBe(409);
  expect(record()).not.toHaveProperty('stack');
  expect(JSON.stringify(record())).not.toContain('PERSON_PRIVATE');
});

it('un fallo del logger no sustituye la excepción original', async () => {
  (logger.error as jest.Mock).mockImplementation(() => {
    throw Error('logger unavailable');
  });
  await fail(new TypeError('original'));
});

it('un stack con getter fallido no altera la propagación de error', async () => {
  const error = new Error('hidden');
  Object.defineProperty(error, 'stack', {
    get() {
      throw Error('unsafe getter');
    },
  });
  await fail(error);
  expect(record().exceptionName).toBe('Error');
});

it('conserva respuesta exitosa y no agrega diagnóstico', async () => {
  const f = fixture();
  const body = { documentoId: 99 };
  const result = await firstValueFrom(
    new RequestLoggerInterceptor().intercept(f.context, {
      handle: () => of(body),
    }),
  );
  expect(result).toBe(body);
  expect(logger.info).toHaveBeenCalledTimes(1);
  expect(logger.error).not.toHaveBeenCalled();
});
