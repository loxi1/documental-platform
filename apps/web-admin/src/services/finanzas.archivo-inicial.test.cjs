const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(`${__dirname}/finanzas.ts`, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
}).outputText;
function service(post) {
  const exports = {};
  vm.runInNewContext(code, { exports, FormData, require(name) { assert.equal(name, './api'); return { api: { post } }; } });
  return exports;
}
test('TEMP usa multipart con un archivo y clave; autenticación queda en api existente', async () => {
  const s = service(async (path, form, config) => {
    assert.equal(path, '/documentos/tmp');
    assert.deepEqual([...form.keys()], ['archivo']); assert.equal(form.get('archivo').name, 'inicial.pdf');
    assert.deepEqual(Object.keys(config.headers), ['Idempotency-Key']); assert.equal(config.headers['Idempotency-Key'], 'temp-key');
    return { data: { data: { data: { tempId: 292, estado: 'STAGED', nombreOriginal: 'inicial.pdf', storageKey: 'server-only' } } } };
  });
  const result = await s.subirArchivoInicialOrdenPago(new File(['%PDF-1.4'], 'inicial.pdf', { type: 'application/pdf' }), 'temp-key');
  assert.equal(result.tempId, 292); assert.equal(result.storageKey, undefined);
});
test('OP usa endpoint existente y exactamente metadata/tempId; sin promoción u OCR frontend', async () => {
  const payload = { contenedorOperativoId: 7, tempId: 292 };
  const s = service(async (path, sent, config) => {
    assert.equal(path, '/documental-v2/finanzas/ordenes-pago'); assert.equal(sent, payload);
    assert.equal(config.headers['Idempotency-Key'], 'op-key');
    return { data: { data: { ordenPagoId: 151, archivoInicial: { archivoId: 441 } } } };
  });
  assert.equal((await s.crearOrdenPago(payload, 'op-key')).ordenPagoId, 151);
});
for (const result of [{ tempId: 0, estado: 'STAGED' }, { tempId: 292, estado: 'RESERVED' }, null]) {
  test(`rechaza respuesta TEMP no preparada ${JSON.stringify(result)}`, async () => {
    const s = service(async () => ({ data: result }));
    await assert.rejects(() => s.subirArchivoInicialOrdenPago(new File(['x'], 'a.pdf'), 'key'), /no quedó preparado/);
  });
}
