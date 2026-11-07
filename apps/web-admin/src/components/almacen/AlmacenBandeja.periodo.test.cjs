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
    if (name === '@/lib/almacen-periodo') {
      const m={exports:{}}; const file=__dirname+'/../../lib/almacen-periodo.ts';
      vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021}}).outputText,{module:m,exports:m.exports});
      return m.exports;
    }
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
    if (name === 'flatpickr') return { __esModule: true, default: (_, options) => { picker = options; return { destroy() {} }; } };
    if (name.includes('plugins/monthSelect') && !name.endsWith('.css')) return { __esModule: true, default: () => ({}) };
    if (name === 'next/navigation') return { useRouter: () => ({ push() {} }) };
    if (name.includes('auth-storage')) return { getContexto: () => ({ workspaceId: 13, empresa: 'BBTI', permisos: { menus: ['almacen'], actions: ['documentos.subir'] } }) };
    if (name === '@/hooks/useRevisionContable') return { useRevisionContable: (params, enabled) => { query = {enabled, queryKey: ['revision-contable',params]}; return { data:{items:[]}, refetch(){}, isLoading:false, isFetching:false }; } };
    if (name === '@tanstack/react-query') return { useQuery: q => { query = q; return { data: { items: [] }, refetch() {}, isLoading: false, isFetching: false }; } };
    return generic;
  }
  const code = ts.transpileModule(fs.readFileSync(__dirname + '/AlmacenBandeja.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { require: req, module: mod, exports: mod.exports, console, setTimeout, clearTimeout });
  const render = () => { index = 0; const tree = mod.exports.AlmacenBandeja(); return { tree, query, picker }; };
  return { render };
}
function nodes(tree) { if (!tree || typeof tree !== 'object') return []; if (Array.isArray(tree)) return tree.flatMap(nodes); return [tree, ...nodes(tree.props?.children)]; }
function text(n) { if (typeof n === 'string') return n; if (Array.isArray(n)) return n.map(text).join(''); return n && typeof n === 'object' ? text(n.props?.children) : ''; }
test('período actual consulta automáticamente sin exigir texto y conserva un solo Consultar',()=>{const h=harness(),v=h.render(),now=new Date();assert.equal(v.query.enabled,true);assert.equal(v.query.queryKey.at(-1).anio,now.getFullYear());assert.equal(v.query.queryKey.at(-1).mes,now.getMonth()+1);assert.equal(v.query.queryKey.at(-1).q,undefined);assert.equal(nodes(v.tree).filter(n=>n.type==='Button'&&text(n).includes('Consultar')).length,1);assert.equal(nodes(v.tree).some(n=>n.props?.['aria-label']==='Período'),true);});
test('cambio de período consulta inmediatamente; Buscar permanece en el período seleccionado',()=>{const h=harness();let v=h.render();v.picker.onChange([new Date(2026,1,1)]);v=h.render();assert.equal(v.query.enabled,true);assert.equal(v.query.queryKey.at(-1).anio,2026);assert.equal(v.query.queryKey.at(-1).mes,2);nodes(v.tree).find(n=>n.type==='Input').props.onChange({target:{value:'RIMAC'}});v=h.render();assert.equal(v.query.queryKey.at(-1).q,'RIMAC');v.picker.onChange([new Date(2027,0,1)]);v=h.render();assert.equal(v.query.queryKey.at(-1).anio,2027);assert.equal(v.query.queryKey.at(-1).mes,1);nodes(v.tree).find(n=>n.type==='Button'&&text(n).includes('Consultar')).props.onClick();v=h.render();assert.equal(v.query.queryKey.at(-1).anio,2027);assert.equal(v.query.queryKey.at(-1).mes,1);});
test('sin período no hay consulta sin límite; texto corto no se envía como q',()=>{const h=harness();let v=h.render();nodes(v.tree).find(n=>n.type==='Input').props.onChange({target:{value:'AB'}});v=h.render();assert.equal(v.query.enabled,true);assert.equal(v.query.queryKey.at(-1).q,undefined);assert.ok(v.query.queryKey.at(-1).anio);v.picker.onChange([]);v=h.render();assert.equal(v.query.enabled,false);assert.equal(nodes(v.tree).find(n=>n.type==='Button'&&text(n).includes('Consultar')).props.disabled,true);});
