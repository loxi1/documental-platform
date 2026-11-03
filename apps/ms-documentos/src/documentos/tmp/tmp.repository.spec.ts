const connection: any = jest.fn();
connection.unsafe = jest.fn();
connection.release = jest.fn();
jest.mock('@documental/database', () => ({ sql: { reserve: jest.fn(async () => connection) } }));
import { TmpRepository } from './tmp.repository';

describe('P3 bounded mutex (isolated doubles)', () => {
  const repo = new TmpRepository();
  beforeEach(() => {
    connection.mockReset().mockResolvedValue([]);
    connection.release.mockClear();
  });
  it('acquires and releases on the same reserved session', async () => {
    connection.mockResolvedValueOnce([{ acquired: true }]).mockResolvedValueOnce([{ released: true }]);
    const result = await repo.lockedBounded('12:BBTI:8', async c => {
      expect(c).toBe(connection);
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(connection.mock.calls[0][0].join('?')).toContain('pg_try_advisory_lock');
    expect(connection.mock.calls[1][0].join('?')).toContain('pg_advisory_unlock');
    expect(connection.release).toHaveBeenCalledTimes(1);
  });
  it('does not execute callback when mutex is busy', async () => {
    connection.mockResolvedValue([{ acquired: false }]);
    const work = jest.fn();
    await expect(repo.lockedBounded('busy', work, 0)).rejects.toThrow('P3_MUTEX_BUSY');
    expect(work).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });
  it('preserves original error if unlock fails', async () => {
    connection.mockResolvedValueOnce([{ acquired: true }]).mockRejectedValueOnce(new Error('unlock failed'));
    await expect(repo.lockedBounded('failure', async () => { throw new Error('original'); })).rejects.toThrow('original');
    expect(connection.release).toHaveBeenCalledTimes(1);
  });
  it('rejects invalid timeouts before reserving a connection', async () => {
    await expect(repo.lockedBounded('invalid', async () => null, -1)).rejects.toThrow('P3_LOCK_TIMEOUT_INVALID');
  });
});

describe('TmpRepository conexión reservada', () => {
  const repo = new TmpRepository();
  const actor = { actorId: 6, workspaceId: 12, empresaCodigo: 'BBTI', clienteDestinoId: 2, idempotencyKey: 'key', requestId: 'req', correlationId: 'corr' };
  beforeEach(() => { connection.mockReset().mockResolvedValue([]); connection.unsafe.mockReset().mockResolvedValue([]); connection.release.mockClear(); });
  it('guarda metadata documental serializada explícitamente como JSONB', async () => {
    const metadata = { integration: { consumer: 'COMPRAS_TEMP_DOCUMENTAL', identity: 'confirm', completed: false },
      destinoReservado: 'documentos/2026/01/BBTI/50__a.pdf', promocionIdentity: 'confirm' };
    const parameter = { driverJsonParameter: true };
    const c: any = jest.fn().mockResolvedValue([]);
    c.json = jest.fn().mockReturnValue(parameter);
    await repo.saveDocumentalMetadata(c, 50, metadata);
    expect(c.json).toHaveBeenCalledTimes(1);
    expect(c.json).toHaveBeenCalledWith(JSON.stringify(metadata));
    expect(c.mock.calls[0][0].join('?')).toContain('metadata=?::jsonb');
    expect(c.mock.calls[0][1]).toBe(parameter);
    expect(c.mock.calls[0][2]).toBe(50);
    expect(metadata.integration.identity).toBe('confirm');
  });
  it('bind preserva metadata e identidad durable con el parámetro JSON del driver', async () => {
    const metadata = { integration: { consumer: 'COMPRAS_TEMP_DOCUMENTAL', identity: 'confirm', completed: false },
      borradorDocumental: { tipoDocumental: 'OC' } };
    const row = { id: 50, metadata };
    const destination = 'documentos/2026/01/BBTI/50__a.pdf';
    const parameter = { driverJsonParameter: true };
    const c: any = jest.fn().mockResolvedValue([]);
    c.json = jest.fn().mockReturnValue(parameter);
    await repo.bind(c, row, destination, 'confirm');
    expect(c.json).toHaveBeenCalledTimes(1);
    expect(c.json).toHaveBeenCalledWith(JSON.stringify({ ...metadata, destinoReservado: destination, promocionIdentity: 'confirm' }));
    expect(c.mock.calls[0][0].join('?')).toContain('metadata=?::jsonb');
    expect(c.mock.calls[0][1]).toBe(parameter);
    expect(c.mock.calls[0][2]).toBe(50);
    expect(row.metadata).toEqual(metadata);
    expect(row.metadata).not.toHaveProperty('destinoReservado');
  });
  it('reserva y auditoría en una transacción sin depender de begin en reserve()', async () => {
    connection.mockImplementation(async (parts: TemplateStringsArray) => {
      const query = parts.join('?');
      if (query.includes('INSERT INTO documentos.carga_operaciones')) return [{ id: 10 }];
      return [];
    });
    const r = await repo.locked('reserve', c => repo.reserve(c, actor, { name: 'p.pdf', mime: 'application/pdf', size: 4, hash: 'a'.repeat(64) }, 'b'.repeat(64), 'lab'));
    expect(r.storage_key).toBe('documentos/tmp/12/10');
    expect(connection.unsafe.mock.calls.map((c: any[]) => c[0])).toEqual(['BEGIN', 'COMMIT']);
    expect(connection.mock.calls.some((c: any[]) => c[0].join('').includes('INSERT INTO core.auditoria_eventos'))).toBe(true);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });
  it('fallo de auditoría revierte promoción y libera bloqueo', async () => {
    connection.mockImplementation(async (parts: TemplateStringsArray) => {
      if (parts.join('').includes('INSERT INTO core.auditoria_eventos')) throw new Error('audit');
      return [];
    });
    await expect(repo.locked('10', c => repo.promoted(c, { id: 10, hash_sha256: 'a'.repeat(64), tamano_bytes: 4 }, actor, 'destino'))).rejects.toThrow('audit');
    expect(connection.unsafe.mock.calls.map((c: any[]) => c[0])).toEqual(['BEGIN', 'ROLLBACK']);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });
});


describe('regresión JSONB con cliente compartido inicializado por Drizzle', () => {
  it('reproduce el fallo previo y serializa la reserva sin conectar a PostgreSQL', () => {
    const { execFileSync } = require('node:child_process');
    const { mkdtempSync, mkdirSync } = require('node:fs');
    const { tmpdir } = require('node:os');
    const path = require('node:path');
    const root = path.resolve(__dirname, '../../../../..');
    // Ancestros exclusivos sin .env: el módulo real nunca lee configuración privada.
    const sandbox = mkdtempSync(path.join(tmpdir(), 'bbti-jsonb-regression-'));
    const cwd = path.join(sandbox, 'a/b/c');
    mkdirSync(cwd, { recursive: true });
    const script = `
      import assert from 'node:assert/strict';
      import fs from 'node:fs';
      import Module, { createRequire } from 'node:module';
      import { pathToFileURL } from 'node:url';
      const root = process.argv[1];
      const repositoryPath = root + '/apps/ms-documentos/src/documentos/tmp/tmp.repository.ts';
      const require = createRequire(repositoryPath);
      const ts = require('typescript');
      // Este es el paquete compartido real: crea sql y llama drizzle(sql, {schema}).
      const shared = await import(pathToFileURL(root + '/packages/database/dist/index.js'));
      const sql = shared.sql;
      assert.equal(typeof shared.db, 'object');
      const metadata = {integration:{consumer:'COMPRAS_TEMP_DOCUMENTAL',identity:'confirm',completed:false},
        destinoReservado:'documentos/2026/07/BBTI/320__test.pdf', nested:{array:[1,null,'á']}};
      const previous = sql.json(metadata);
      assert.equal(previous.type, 3802);
      assert.equal(sql.options.serializers[3802](previous.value), metadata);
      assert.throws(() => Buffer.byteLength(sql.options.serializers[3802](previous.value)),
        {code:'ERR_INVALID_ARG_TYPE'});
      const compiled = ts.transpileModule(fs.readFileSync(repositoryPath,'utf8'), {
        compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
          experimentalDecorators:true,emitDecoratorMetadata:true,esModuleInterop:true}
      }).outputText;
      const module = new Module(repositoryPath);
      module.filename = repositoryPath;
      module.paths = Module._nodeModulePaths(root + '/apps/ms-documentos');
      module.require = name => name === '@documental/database' ? shared : require(name);
      module._compile(compiled, repositoryPath);
      let captured;
      const connection = (parts, ...args) => {captured={parts,args}; return Promise.resolve([])};
      connection.json = sql.json;
      const original = structuredClone(metadata);
      await new module.exports.TmpRepository().saveDocumentalMetadata(connection,320,metadata);
      const parameter = captured.args[0];
      assert.equal(parameter.type,3802);
      const wire = sql.options.serializers[parameter.type](parameter.value);
      assert.equal(typeof wire,'string');
      assert.ok(Buffer.byteLength(wire)>0);
      const object = JSON.parse(wire);
      assert.equal(typeof object,'object');
      assert.deepEqual(object,original);
      assert.equal(object.integration.identity,'confirm');
      assert.equal(captured.args[1],320);
      assert.deepEqual(metadata,original);
      assert.ok(captured.parts.join('?').includes('metadata=?::jsonb'));
      const boundDestination = 'documentos/2026/07/BBTI/320__bound.pdf';
      const row = {id:320,metadata:original};
      await new module.exports.TmpRepository().bind(connection,row,boundDestination,'confirm');
      const boundParameter = captured.args[0];
      assert.equal(boundParameter.type,3802);
      const boundWire = sql.options.serializers[3802](boundParameter.value);
      assert.equal(typeof boundWire,'string');
      assert.ok(Buffer.byteLength(boundWire)>0);
      const bound = JSON.parse(boundWire);
      assert.deepEqual(bound,{...original,destinoReservado:boundDestination,promocionIdentity:'confirm'});
      assert.equal(bound.integration.identity,'confirm');
      assert.equal(captured.args[1],320);
      assert.deepEqual(row.metadata,original);
      await sql.end({timeout:0});
      console.log('PREVIOUS_TYPE_ERROR_REPRODUCED; FIX_OBJECT_ROUNDTRIP_PASS; NO_DB_CONNECTION');
    `;
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', script, root], {
      cwd, timeout: 15000, encoding: 'utf8',
      env: { PATH: process.env.PATH, DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/no_connection' },
    });
    expect(output).toContain('PREVIOUS_TYPE_ERROR_REPRODUCED; FIX_OBJECT_ROUNDTRIP_PASS; NO_DB_CONNECTION');
  });
});
