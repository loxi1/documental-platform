const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Ejecuta el componente real y sus eventos con hooks/servicios simulados,
// siguiendo el runner node:test existente, sin dependencias ni red adicional.
const source = fs.readFileSync(`${__dirname}/CrearOrdenPagoModal.tsx`, 'utf8');
const code = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function modal(overrides = {}) {
  const hooks = []; let cursor = 0, tree, uuid = 0;
  const calls = { uploads: [], saves: [], created: [], closes: 0, resets: 0 };
  const cleanups = [];
  const staged = { tempId: 292, estado: 'STAGED', nombreOriginal: 'inicial.pdf' };
  const services = {
    getOpcionesOrdenPago() {}, buscarContextosOrdenPago() {},
    async subirArchivoInicialOrdenPago(file, key) { calls.uploads.push({ file, key }); return overrides.upload ? overrides.upload(file, key) : staged; },
    async crearOrdenPago(payload, key) { calls.saves.push({ payload, key }); return overrides.save ? overrides.save(payload, key) : { ordenPagoId: 151 }; },
  };
  const react = {
    useRef(value) { const i = cursor++; hooks[i] ??= { current: value }; return hooks[i]; },
    useState(value) { const i = cursor++; if (!(i in hooks)) hooks[i] = typeof value === 'function' ? value() : value;
      return [hooks[i], v => { hooks[i] = typeof v === 'function' ? v(hooks[i]) : v; }]; },
    useEffect(fn) { const i = cursor++; if (!(i in hooks)) { hooks[i] = true; cleanups.push(fn()); } },
  };
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  vm.runInNewContext(code, { exports, Intl, Date, crypto: { randomUUID: () => `uuid-${++uuid}` },
    FormData: class { constructor(form) { this.values = form.values; } get(k) { return this.values[k] ?? null; } },
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
      if (name === '@tanstack/react-query') return { useQuery: ({ queryKey }) => ({
        data: queryKey[0] === 'op-opciones' ? { monedas: [{ codigo: 'PEN', nombre: 'Soles' }], tipos: { SEGUROS: [] } }
          : [{ contenedorOperativoId: 7, codigo: '050201', descripcion: 'Contexto LAB' }],
      }) };
      if (name === '@/components/ui/button') return { Button: 'button' };
      if (name === '@/components/ui/input') return { Input: 'input' };
      if (name === '@/services/finanzas') return services;
      throw new Error(`Import inesperado (incluye OCR/OP02): ${name}`);
    },
  });
  function nodes(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(nodes);
    return [node, ...nodes(node.props?.children ?? null)];
  }
  function render() {
    cursor = 0; tree = exports.CrearOrdenPagoModal({ workspaceId: 13, onCreated: id => calls.created.push(id) });
    for (const n of nodes(tree)) if (n.props.ref) {
      n.props.ref.current ??= n.type === 'dialog' ? { showModal() {}, close() { calls.closes++; find('dialog').props.onClose(); } } : { value: '' };
    }
  }
  function find(type, predicate = () => true) { return nodes(tree).find(n => n.type === type && predicate(n.props)); }
  const form = { values: { monto: '19.50', moneda: 'PEN', observacion: 'Prueba' }, reset() { calls.resets++; } };
  function submit() { find('form').props.onSubmit({ preventDefault() {}, currentTarget: form }); }
  function choose(name = 'inicial.pdf') {
    find('input', p => p.type === 'file').props.onChange({ target: { files: [{ name }], value: name } }); render();
  }
  function close() { find('dialog').props.onClose(); render(); }
  function ready() {
    find('button', p => p.children === '+ Agregar Orden de Pago').props.onClick(); render();
    find('input', p => p.id === 'op-centro-costo').props.onChange({ target: { value: '050' } }); render();
    find('button', p => typeof p.className === 'string' && p.className.includes('items-start')).props.onClick(); render();
    find('select', p => p.value !== undefined).props.onChange({ target: { value: 'SEGUROS' } }); render();
  }
  render(); ready();
  return { calls, render, find, submit, choose, close, unmount: () => cleanups.forEach(fn => fn?.()),
    flush: async () => { await tick(); render(); },
    saveDisabled: () => find('button', p => p.type === 'submit').props.disabled };
}

test('A/F: sin archivo conserva payload OP-01A y cierre/refresco mediante onCreated', async () => {
  const m = modal(); m.submit(); await m.flush();
  assert.equal(m.calls.uploads.length, 0); assert.equal(m.calls.saves.length, 1);
  assert.deepEqual(Object.keys(m.calls.saves[0].payload).sort(), ['contenedorOperativoId','fechaEmision','moneda','monto','observacion','subtipo','tipo'].sort());
  assert.equal(m.calls.saves[0].payload.contenedorOperativoId, 7);
  assert.equal(m.calls.saves[0].payload.moneda, 'PEN');
  assert.deepEqual(m.calls.created, [151]); assert.equal(m.calls.closes, 1); assert.equal(m.calls.resets, 1);
});
test('B: seleccionar solo sube TEMP; bloquea Guardar durante la carga', async () => {
  const wait = deferred(); const m = modal({ upload: () => wait.promise }); m.choose();
  assert.equal(m.calls.uploads.length, 1); assert.equal(m.calls.saves.length, 0); assert.equal(m.saveDisabled(), true);
  m.submit(); assert.equal(m.calls.saves.length, 0);
  wait.resolve({ tempId: 292, estado: 'STAGED' }); await m.flush();
  assert.equal(m.saveDisabled(), false); assert.equal(m.calls.saves.length, 0);
  assert.equal(m.find('p', p => p.role === 'status').props.children, 'Archivo preparado para guardar');
});
test('C/F/H: Guardar transmite tempId, cierra y notifica bandeja; no usa OCR/OP02', async () => {
  const m = modal(); m.choose(); await m.flush(); m.submit(); await m.flush();
  assert.equal(m.calls.saves[0].payload.tempId, 292);
  assert.deepEqual(Object.keys(m.calls.saves[0].payload).sort(), ['tempId','contenedorOperativoId','fechaEmision','moneda','monto','observacion','subtipo','tipo'].sort());
  assert.deepEqual(m.calls.created, [151]); assert.equal(m.calls.closes, 1);
});
for (const status of [undefined, 503, 409]) test(`D: error ${status ?? 'red'} conserva TEMP, payload y clave sin reupload`, async () => {
  let fail = true;
  const m = modal({ save: async () => { if (fail) throw status ? { response: { status } } : new Error('timeout'); return { ordenPagoId: 151 }; } });
  m.choose(); await m.flush(); m.submit(); await m.flush();
  assert.equal(m.calls.created.length, 0); assert.equal(m.find('fieldset').props.disabled, true);
  fail = false; m.submit(); await m.flush();
  assert.equal(m.calls.uploads.length, 1); assert.equal(m.calls.saves.length, 2);
  assert.equal(m.calls.saves[0].key, m.calls.saves[1].key);
  assert.equal(m.calls.saves[0].payload, m.calls.saves[1].payload);
  assert.equal(m.calls.saves[1].payload.tempId, 292); assert.deepEqual(m.calls.created, [151]);
});
test('E: dos submits antes del render generan una sola petición', async () => {
  const wait = deferred(); const m = modal({ save: () => wait.promise });
  m.submit(); m.submit(); assert.equal(m.calls.saves.length, 1);
  wait.resolve({ ordenPagoId: 151 }); await m.flush(); assert.deepEqual(m.calls.created, [151]);
});
test('G: cerrar durante upload descarta respuesta tardía y no crea OP', async () => {
  const wait = deferred(); const m = modal({ upload: () => wait.promise }); m.choose(); m.close();
  wait.resolve({ tempId: 292, estado: 'STAGED' }); await m.flush();
  assert.equal(m.calls.saves.length, 0); assert.equal(m.find('p', p => p.role === 'status').props.children, '');
});
test('F5/navegación: desmontar no guarda OP y descarta upload tardío', async () => {
  const wait = deferred(); const m = modal({ upload: () => wait.promise }); m.choose(); m.unmount();
  wait.resolve({ tempId: 292, estado: 'STAGED' }); await tick();
  assert.equal(m.calls.saves.length, 0); assert.equal(m.calls.created.length, 0);
});
test('reemplazar selección: respuesta vieja no sustituye al TEMP nuevo', async () => {
  const old = deferred(); const m = modal({ upload: file => file.name === 'viejo.pdf' ? old.promise : Promise.resolve({ tempId: 300, estado: 'STAGED' }) });
  m.choose('viejo.pdf'); m.choose('nuevo.pdf'); await m.flush();
  old.resolve({ tempId: 292, estado: 'STAGED' }); await m.flush(); m.submit(); await m.flush();
  assert.equal(m.calls.saves[0].payload.tempId, 300); assert.equal(m.calls.uploads.length, 2);
});
test('upload fallido impide crear OP accidentalmente sin archivo; quitar permite continuar', async () => {
  const m = modal({ upload: async () => { throw new Error('upload'); } }); m.choose(); await m.flush();
  assert.equal(m.saveDisabled(), true); m.submit(); assert.equal(m.calls.saves.length, 0);
  m.find('button', p => p.children === 'Quitar archivo').props.onClick(); m.render(); m.submit(); await m.flush();
  assert.equal(m.calls.saves[0].payload.tempId, undefined);
});
