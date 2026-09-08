// Focused contract tests; no HTTP requests or application runtime required.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(`${__dirname}/expedientes.ts`, 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const contract = {
  data: [
    { documentoId: 101, archivoId: 201, ocrResultadoId: 301, filename: 'uno.pdf', estadoDocumento: 'pendiente_ocr', estadoOcr: 'pendiente_validacion', fechaCarga: null, tipoVersion: 'original', esActual: true, accionSugerida: 'VALIDAR_OCR' },
    { documentoId: 102, archivoId: 202, ocrResultadoId: 302, filename: 'dos.pdf', estadoDocumento: 'pendiente_ocr', estadoOcr: 'pendiente_validacion', fechaCarga: null, tipoVersion: 'original', esActual: true, accionSugerida: 'VALIDAR_OCR' },
  ],
  contexto: { expedienteId: 9, principalId: 97 }, conflictos: [],
};
const wrap = data => ({ success: true, requestId: 'test', timestamp: '2026-09-08T00:00:00Z', data });
function service(payload) {
  const exports = {};
  vm.runInNewContext(code, { exports, require(name) {
    assert.equal(name, './api');
    return { api: { get: async path => {
      assert.equal(path, '/expedientes/9/principales/97/facturas-pendientes');
      return { data: payload };
    } } };
  } });
  return () => exports.getFacturasPendientes(9, 97);
}
for (const [name, payload] of [['directo', contract], ['un wrapper', wrap(contract)], ['dos wrappers reales', wrap(wrap(contract))]]) {
  test(`conserva dos filas y contexto: ${name}`, async () => assert.equal(await service(payload)(), contract));
}
test('acepta colección vacía válida', async () => {
  const empty = { ...contract, data: [] };
  assert.equal(await service(wrap(wrap(empty)))(), empty);
});
for (const [name, payload] of [
  ['contexto ausente', { data: [], conflictos: [] }],
  ['contexto nulo', { ...contract, contexto: null }],
  ['IDs con tipo incorrecto', { ...contract, contexto: { expedienteId: '9', principalId: '97' } }],
  ['otro principal', { ...contract, contexto: { expedienteId: 9, principalId: 98 } }],
  ['otro expediente', { ...contract, contexto: { expedienteId: 10, principalId: 97 } }],
  ['data malformada', { ...contract, data: {} }],
  ['conflictos malformados', { ...contract, conflictos: null }],
  ['success false', { success: false, data: contract }],
  ['wrapper no contractual', { data: contract }],
  ['tres wrappers', wrap(wrap(wrap(contract)))],
]) {
  test(`rechaza ${name}`, async () => assert.rejects(service(payload), /Respuesta inválida/));
}
