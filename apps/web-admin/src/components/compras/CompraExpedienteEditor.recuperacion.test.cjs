const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = `${__dirname}/CompraExpedienteEditor.tsx`;
const text = fs.readFileSync(path, 'utf8');
const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['FacturaPendienteCard', 'abrirOcrPendiente', 'abrirFacturaManualPendiente', 'agregarVersionPendiente', 'refrescarPendientesCompras', 'validarOcrPersistido'];
const functions = [];
function visit(node) {
  if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) functions.push(node.getText(source));
  ts.forEachChild(node, visit);
}
visit(source);
const compiled = ts.transpileModule(functions.join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React } }).outputText;
const React = { createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }) };
function elements(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(elements);
  return [tree, ...elements(tree.children)];
}
function setup(override = {}) {
  const calls = { opened: [], readonly: [], versions: [], queries: [], saved: 0, confirmed: 0, result: null };
  const context = {
    React, Button: 'button', formatFechaHumana: String,
    modoSoloLectura: false, principalPendientesId: 2, id: 1, modalAbierto: false,
    aperturaEnCursoRef: { current: false }, aperturaPendienteRef: { current: 0 },
    versionPendienteEnCursoRef: { current: false },
    contextoPendienteRef: { current: { expedienteId: '1', principalId: 2, readOnly: false } },
    setAbriendoPendiente() {}, setMensajeValidacion() {}, setAccionActual() {}, setVersionPendienteEnCurso() {},
    setPendienteOcrAbierto() {}, setPendienteManualAbierto(value) { calls.manual = value; },
    setModalSoloLectura(v) { calls.readonly.push(v); }, setModalAbierto(v) { calls.opened.push(v); },
    setResultadoModal(v) { calls.result = typeof v === 'function' ? v(calls.result) : v; },
    getOcrResultado: async () => ({ id: 20, documento_id: 10, archivo_id: 11, estado: 'editado', metadata: { metadata: { montoTotal: '2730.02' } } }),
    DOCUMENTO_ADJUNTO_OPTIONS: [{ tipoRelacionSugerida: 'adjunto_factura' }],
    parseRecordLocal: v => v, buildResultadoConContexto: v => v,
    agregarArchivoComoVersion: async (...args) => { calls.versions.push(args); },
    queryClient: { invalidateQueries({ queryKey }) { calls.queries.push(queryKey); return Promise.resolve(); } },
    codigo: 'EXP', rucComprador: '', empresa: 'TEST',
    normalizeTipoDocumentalParaBackend: v => v,
    buildMetadataDesdeFormulario: form => ({ ...form }),
    editarOcrResultado: async () => { calls.saved++; },
    confirmarOcrConExpediente: async () => { calls.confirmed++; },
    ...override,
  };
  vm.createContext(context); vm.runInContext(compiled, context);
  return { context, calls };
}
const fila = { documentoId: 10, archivoId: 11, ocrResultadoId: 20, accionSugerida: 'VALIDAR_OCR', clasificacion: 'PENDIENTE_OCR' };
for (const [accion, label] of [['VALIDAR_OCR', 'Editar'], ['VALIDAR_MANUAL', 'Editar'], ['AGREGAR_VERSION', 'Agregar versión']]) {
  test(`card ${accion}: Ver + ${label}`, () => {
    const { context } = setup();
    const buttons = elements(context.FacturaPendienteCard({ pendiente: { ...fila, accionSugerida: accion }, readOnly: false, loading: false })).filter(e => e.type === 'button');
    assert.deepEqual(buttons.map(b => b.children.join('')), ['Ver', label]);
  });
}
test('ambas secciones comparten cards y no añaden tabla de versiones', () => {
  assert.ok(text.includes('["PENDIENTE_OCR", "IDENTIFICADO"] as const'));
  assert.ok(text.includes('"PENDIENTES DE OCR" : "DOCUMENTOS IDENTIFICADOS"'));
});
test('Ver OCR abre readonly, conserva monto, sin mutations', async () => {
  const { context, calls } = setup();
  await context.abrirOcrPendiente(fila, true);
  assert.deepEqual(calls.readonly, [true]); assert.equal(calls.result.metadata.montoTotal, '2730.02');
  assert.equal(calls.saved + calls.confirmed + calls.versions.length, 0);
});
test('Editar OCR abre editable sin confirmar', async () => {
  const { context, calls } = setup(); await context.abrirOcrPendiente(fila);
  assert.deepEqual(calls.readonly, [false]); assert.equal(calls.confirmed, 0);
});
test('sin OCR Editar usa pendiente_manual, Ver usa readonly, sin OCR/upload', () => {
  const { context, calls } = setup(); const manual = { ...fila, ocrResultadoId: null, accionSugerida: 'VALIDAR_MANUAL' };
  context.abrirFacturaManualPendiente(manual);
  assert.ok(calls.manual); assert.deepEqual(calls.readonly, [false]);
  context.abrirFacturaManualPendiente(manual, true);
  assert.deepEqual(calls.readonly, [false, true]); assert.equal(calls.confirmed, 0);
});
test('Guardar cambios persiste, relee monto y reclasifica sin confirmar', async () => {
  const { context, calls } = setup({ pendienteOcrAbierto: { fila, expedienteId: 1, principalId: 2 } });
  await context.validarOcrPersistido({ tipoDocumental: 'FACTURA', montoTotal: '2730.02' }, 'guardar');
  assert.equal(calls.saved, 1); assert.equal(calls.confirmed, 0);
  assert.equal(calls.result.metadata.montoTotal, '2730.02');
  assert.ok(calls.queries.some(q => q[0] === 'compras-facturas-pendientes'));
});
test('confirmar solamente se ejecuta con acción explícita', async () => {
  const { context, calls } = setup({ pendienteOcrAbierto: { fila, expedienteId: 1, principalId: 2 } });
  await context.validarOcrPersistido({ tipoDocumental: 'FACTURA' }, 'confirmar');
  assert.equal(calls.confirmed, 1);
});
test('versión directa una llamada aun con doble click; sin modal, refresca contador y pendientes', async () => {
  let finish;
  const { context, calls } = setup();
  context.agregarArchivoComoVersion = async (...args) => { calls.versions.push(args); await new Promise(resolve => { finish = resolve; }); };
  const copy = { ...fila, accionSugerida: 'AGREGAR_VERSION', documentoIdDestino: 99 };
  const first = context.agregarVersionPendiente(copy);
  await context.agregarVersionPendiente(copy); assert.equal(calls.versions.length, 1);
  finish(); await first;
  assert.deepEqual(calls.opened, []);
  assert.ok(calls.queries.some(q => q[0] === 'almacen-documento-versiones-contador'));
  assert.ok(calls.queries.some(q => q[0] === 'compras-facturas-pendientes'));
});
test('error de versión conserva card/modal y libera guardia', async () => {
  const { context, calls } = setup({ agregarArchivoComoVersion: async () => { throw new Error('409'); } });
  await context.agregarVersionPendiente({ ...fila, accionSugerida: 'AGREGAR_VERSION', documentoIdDestino: 99 });
  assert.deepEqual(calls.opened, []); assert.deepEqual(calls.queries, []);
  assert.equal(context.versionPendienteEnCursoRef.current, false);
});
test('solo lectura impide versión; las funciones aisladas no tienen OCR ni upload disponibles', async () => {
  const { context, calls } = setup({ modoSoloLectura: true });
  await context.agregarVersionPendiente({ ...fila, accionSugerida: 'AGREGAR_VERSION', documentoIdDestino: 99 });
  assert.equal(calls.versions.length, 0);
  assert.doesNotMatch(functions.join('\n'), /procesarArchivoOcr|subirDocumento|upload\(/);
});

// Render the shared modal with inert hooks: exercise actual mode capabilities.
const modalSource = fs.readFileSync(`${__dirname}/../ocr/OcrValidationModal.tsx`, 'utf8');
const modalCode = ts.transpileModule(modalSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React } }).outputText;
function modal(modo, readOnly = false) {
  const exports = {};
  vm.runInNewContext(modalCode, { exports, React, require(name) {
    if (name === 'react') return { useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}], useMemo: fn => fn(), useEffect() {} };
    if (name.includes('catalogos')) return { BANCO_OPTIONS: [], MONEDA_OPTIONS: [], hasCatalogValue: () => true };
    return {};
  } });
  return elements(exports.OcrValidationModal({ open: true, resultado: { tipoDocumental: 'FACTURA', metadata: {} }, modo, readOnly, expedienteContexto: { id: 1 }, onClose() {} }));
}
test('sin OCR manual omite Guardar cambios y conserva Guardar y confirmar', () => {
  const labels = modal('pendiente_manual').filter(e => e.type === 'button').map(b => b.children.join(''));
  assert.equal(labels.includes('Guardar cambios'), false); assert.ok(labels.includes('Guardar y confirmar'));
});
test('OCR incompleto conserva ambas capacidades; readonly solo permite cerrar', () => {
  const labels = modal('ocr').filter(e => e.type === 'button').map(b => b.children.join(''));
  assert.ok(labels.includes('Guardar cambios')); assert.ok(labels.includes('Guardar y confirmar'));
  const ro = modal('ocr', true).filter(e => e.type === 'button').map(b => b.children.join(''));
  assert.equal(ro.includes('Guardar y confirmar'), false);
});
