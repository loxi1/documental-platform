const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the actual handler with mocked GET/state; no network or React runtime.
const path = `${__dirname}/CompraExpedienteEditor.tsx`;
const source = ts.createSourceFile(path, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'abrirOcrPendiente') handler = node.getText(source);
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(handler);
const code = ts.transpileModule(handler, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;

async function open(estado, overrides = {}, readOnly = false) {
  const calls = { opened: false, invalidated: false, result: null };
  const context = {
    modoSoloLectura: readOnly, principalPendientesId: 2, id: 1, modalAbierto: false,
    aperturaEnCursoRef: { current: false }, aperturaPendienteRef: { current: 0 },
    contextoPendienteRef: { current: { expedienteId: '1', principalId: 2, readOnly } },
    setAbriendoPendiente() {}, setMensajeValidacion() {}, setAccionActual() {},
    setPendienteOcrAbierto() {}, setModalSoloLectura() {},
    setModalAbierto(value) { calls.opened = value; },
    setResultadoModal(value) { calls.result = value; },
    getOcrResultado: async () => ({ id: 20, documento_id: 10, archivo_id: 12, estado,
      metadata: { metadata: { montoTotal: '2730.02' } }, ...overrides }),
    DOCUMENTO_ADJUNTO_OPTIONS: [{ tipoRelacionSugerida: 'adjunto_factura' }],
    parseRecordLocal: value => value,
    buildResultadoConContexto: value => value,
    queryClient: { invalidateQueries() { calls.invalidated = true; } },
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  await context.abrirOcrPendiente({ documentoId: 10, archivoId: 12, ocrResultadoId: 20, accionSugerida: 'VALIDAR_OCR' });
  return calls;
}
for (const estado of ['pendiente_validacion', 'editado']) {
  test(`abre ${estado} y conserva monto persistido`, async () => {
    const result = await open(estado);
    assert.equal(result.opened, true);
    assert.equal(result.result.metadata.montoTotal, '2730.02');
  });
}
for (const estado of ['confirmado', 'rechazado']) {
  test(`no abre ${estado} y refresca pendientes`, async () => {
    const result = await open(estado);
    assert.equal(result.opened, false);
    assert.equal(result.invalidated, true);
  });
}
test('editado conserva validación de correspondencia', async () => {
  const result = await open('editado', { archivo_id: 99 });
  assert.equal(result.opened, false);
  assert.equal(result.invalidated, true);
});
test('solo lectura no abre editado', async () => {
  assert.equal((await open('editado', {}, true)).opened, false);
});
