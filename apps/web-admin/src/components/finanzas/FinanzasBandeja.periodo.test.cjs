const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function harness() {
  const states = []; let index = 0, query, picker;
  const react = { useState(v) { const i = index++; if (!(i in states)) states[i] = typeof v === 'function' ? v() : v; return [states[i], v => { states[i] = typeof v === 'function' ? v(states[i]) : v; }]; }, useMemo: f => f(), useRef: () => ({ current: {} }), useEffect(f) { if (String(f).includes('flatpickr')) f(); } };
  const generic = new Proxy({ __esModule: true, default: 'Component' }, { get: (o, k) => k in o ? o[k] : String(k) });
  const mod = { exports: {} };
  function req(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
    if (name === 'flatpickr') return { __esModule: true, default: (_, options) => { picker = options; return { destroy() {} }; } };
    if (name.includes('plugins/monthSelect') && !name.endsWith('.css')) return { __esModule: true, default: () => ({}) };
    if (name === 'next/navigation') return { useRouter: () => ({ push() {} }) };
    if (name.includes('auth-storage')) return { getContexto: () => ({ workspaceId: 13, empresa: 'BBTI', permisos: { menus: ['finanzas'], actions: ['documentos.subir'] } }) };
    if (name === '@tanstack/react-query') return { useQuery: q => { query = q; return { data: { items: [] }, refetch() {}, isLoading: false, isFetching: false }; } };
    return generic;
  }
  const code = ts.transpileModule(fs.readFileSync(__dirname + '/FinanzasBandeja.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { require: req, module: mod, exports: mod.exports, console, setTimeout, clearTimeout });
  const render = () => { index = 0; const tree = mod.exports.FinanzasBandeja(); return { tree, query, picker }; };
  return { render };
}
function nodes(tree) { if (!tree || typeof tree !== 'object') return []; if (Array.isArray(tree)) return tree.flatMap(nodes); return [tree, ...nodes(tree.props?.children)]; }
function text(n) { if (typeof n === 'string') return n; if (Array.isArray(n)) return n.map(text).join(''); return n && typeof n === 'object' ? text(n.props?.children) : ''; }
test('sin período no consulta; seleccionar no consulta hasta Consultar; búsqueda queda dentro del período', () => {
  const h = harness(); let v = h.render(); assert.equal(v.query.enabled, false);
  v.picker.onChange([new Date(2026, 1, 1)]); v = h.render(); assert.equal(v.query.enabled, false);
  nodes(v.tree).find(n => n.type === 'Button' && text(n).includes('Consultar')).props.onClick();
  v = h.render(); assert.equal(v.query.enabled, true); assert.equal(v.query.queryKey.at(-1).anio, 2026); assert.equal(v.query.queryKey.at(-1).mes, 2);
  nodes(v.tree).find(n => n.type === 'Input' && n.props.placeholder?.includes('Buscar OP')).props.onChange({ target: { value: 'RIMAC' } });
  v = h.render(); assert.equal(v.query.queryKey.at(-1).q, 'RIMAC'); assert.equal(v.query.queryKey.at(-1).mes, 2);
  v.picker.onChange([new Date(2027, 0, 1)]); v = h.render(); assert.equal(v.query.queryKey.at(-1).anio, 2026);
  nodes(v.tree).find(n => n.type === 'Button' && text(n).includes('Consultar')).props.onClick();
  v = h.render(); assert.equal(v.query.queryKey.at(-1).anio, 2027); assert.equal(v.query.queryKey.at(-1).mes, 1);
});
test('período actual predeterminado sin consulta automática y un solo botón Consultar', () => {
  const h = harness(); const v = h.render(); const now = new Date();
  assert.equal(v.picker.defaultDate.getFullYear(), now.getFullYear());
  assert.equal(v.picker.defaultDate.getMonth(), now.getMonth());
  assert.equal(v.query.enabled, false);
  assert.ok(nodes(v.tree).some(n => n.type === 'CrearOrdenPagoModal'));
  assert.equal(nodes(v.tree).filter(n => n.type === 'Button' && text(n).includes('Consultar')).length, 1);
  assert.equal(nodes(v.tree).some(n => n.type === 'Button' && text(n).includes('Actualizar')), false);
  assert.ok(text(v.tree).includes('Observados'));
});
test('búsqueda menor de tres caracteres no consulta; limpiar período impide Consultar', () => {
  const h = harness(); let v = h.render();
  nodes(v.tree).find(n => n.type === 'Button' && text(n).includes('Consultar')).props.onClick();
  v = h.render(); assert.equal(v.query.enabled, true);
  nodes(v.tree).find(n => n.type === 'Input').props.onChange({ target: { value: 'AB' } });
  v = h.render(); assert.equal(v.query.enabled, false);
  nodes(v.tree).find(n => n.type === 'Input').props.onChange({ target: { value: 'ABC' } });
  v = h.render(); assert.equal(v.query.enabled, true); assert.equal(v.query.queryKey.at(-1).q, 'ABC');
  v.picker.onChange([]); v = h.render();
  assert.equal(nodes(v.tree).find(n => n.type === 'Button' && text(n).includes('Consultar')).props.disabled, true);
});
