const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(`${__dirname}/page.tsx`, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const op = { ordenPagoId: 153, documentoId: 443, grupoFacturaId: 116, contenedorOperativoId: 1,
  numero: 'OP-153', fechaEmision: '2026-09-15', monto: '100.00', moneda: 'PEN', estado: 'confirmado',
  tipo: 'SERVICIOS_GENERALES', subtipo: 'OTROS', observacion: 'Pagar un servidcio',
  contexto: { codigo: '090101', nombre: 'CC Pruebas', centroCostoCodigo: null },
  archivoInicial: { archivoId: 444, nombreArchivo: 'imagen_correo.png', mime: 'image/png', tamanoBytes: 132400, storageKey: 'NO_ES_URL' } };
function page({ id = '153', query = { data: op }, workspaceId = 13 } = {}) {
  const exports = {}; let options; const calls = [];
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(code, { exports, require(name) {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'next/navigation') return { useParams: () => ({ ordenPagoId: id }) };
    if (name === '@tanstack/react-query') return { useQuery: config => { options = config; return query; } };
    if (name === '@/lib/auth-storage') return { getContexto: () => ({ workspaceId, sub: 6 }) };
    if (name === '@/services/finanzas') return { getOrdenPago: async id => { calls.push(id); return op; } };
    if (name === '@/components/finanzas/OrdenPagoAdjuntarPagoView') return { OrdenPagoAdjuntarPagoView: 'OPView' };
    throw new Error(`Import no autorizado: ${name}`);
  } });
  return { node: exports.default(), options, calls };
}
test('hidrata OP-153 real y conserva grupoFacturaId en respuesta/cache sin conectar pagos', async () => {
  const p = page(); assert.equal(p.node.type, 'OPView');
  assert.equal(p.options.enabled, true);
  assert.equal((await p.options.queryFn()).grupoFacturaId, 116);
  assert.deepEqual(p.calls, [153]);
  assert.deepEqual(JSON.parse(JSON.stringify(p.node.props.resumen)), { codigo: 'OP-153', centroCostoCodigo: '090101',
    centroCostoDescripcion: 'CC Pruebas', tipo: 'SERVICIOS_GENERALES', subtipo: 'OTROS', fechaEmision: '2026-09-15', moneda: 'PEN', monto: '100.00' });
  assert.equal(p.node.props.documentoEconomico, undefined); assert.equal(p.node.props.sustentos, undefined);
});
test('archivo inicial preserva ID/nombre/MIME para preview; nunca URL', () => {
  const props = page().node.props;
  assert.deepEqual(JSON.parse(JSON.stringify(props.sustentoOrden)), { archivoId: 444, nombre: 'imagen_correo.png', tipo: 'image/png', visualizable: true });
  assert.equal(JSON.stringify(props).includes('NO_ES_URL'), false);
});
test('archivo inicial ausente se representa como null', () => {
  assert.equal(page({ query: { data: { ...op, archivoInicial: null } } }).node.props.sustentoOrden, null);
});
test('prioriza centroCostoCodigo cuando está disponible', () => {
  const data = { ...op, contexto: { ...op.contexto, centroCostoCodigo: 'CC-REAL' } };
  assert.equal(page({ query: { data } }).node.props.resumen.centroCostoCodigo, 'CC-REAL');
});
test('loading no renderiza vista con datos ficticios', () => {
  const p = page({ query: { isPending: true } });
  assert.equal(p.node.type, 'main'); assert.equal(p.node.props.children.props.role, 'status');
});
for (const status of [404, 500]) test(`error ${status} no renderiza datos, incluso si existe cache`, () => {
  const p = page({ query: { isError: true, error: { response: { status } }, data: op } });
  assert.equal(p.node.type, 'main'); assert.equal(p.node.props.children.props.role, 'alert');
  assert.equal(p.node.props.children.props.children, status === 404 ? 'Orden de Pago no disponible.' : 'No se pudo cargar la Orden de Pago.');
});
for (const id of ['0', '-1', 'abc', '1.5', '9007199254740992', ['153']]) test(`id inválido ${id} no habilita GET`, () => {
  const p = page({ id }); assert.equal(p.options.enabled, false); assert.equal(p.node.type, 'main');
});
test('sin contexto no habilita GET; cache aislado por workspace/actor', () => {
  assert.equal(page({ workspaceId: null }).options.enabled, false);
  assert.notDeepEqual(page({ workspaceId: 13 }).options.queryKey, page({ workspaceId: 14 }).options.queryKey);
});
function viewHarness(props) {
  const viewSource = fs.readFileSync(require.resolve('../../../../../components/finanzas/OrdenPagoAdjuntarPagoView.tsx'), 'utf8');
  const viewCode = ts.transpileModule(viewSource, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const states = []; let cursor = 0;
  vm.runInNewContext(viewCode, { exports, require(name) {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'react') return { useMemo: fn => fn(), useState: value => {
      const i = cursor++; if (!(i in states)) states[i] = value;
      return [states[i], next => { states[i] = next; }];
    } };
    if (name === '@/constants/catalogos') return { BANCO_OPTIONS: [], MONEDA_OPTIONS: [], hasCatalogValue: () => false };
    return new Proxy({}, { get: (_, key) => key });
  } });
  function nodes(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(nodes);
    return [node, ...nodes(node.props?.children)];
  }
  return () => { cursor = 0; return nodes(exports.OrdenPagoAdjuntarPagoView(props)); };
}
test('la vista conserva pagos vacíos y estado/importes no disponibles', () => {
  const panel = viewHarness(page().node.props)().find(n => n.type === 'FinanzasPaymentPanel');
  assert.equal(panel.props.estadoPago, 'No disponible');
  assert.equal(panel.props.pagadoAcumuladoLabel, 'No disponible');
  assert.equal(panel.props.saldoLabel, 'No disponible');
  assert.equal(panel.props.pagos.length, 0);
});
test('solo Ver del sustento abre archivo 444 en PreviewDocumento y permite cerrar', () => {
  const props = page().node.props;
  assert.equal(props.documentoEconomico, undefined);
  const render = viewHarness(props);
  const text = node => Array.isArray(node) ? node.map(text).join('') : typeof node === 'object' && node ? text(node.props?.children) : String(node ?? '');
  const buttons = render().filter(n => n.type === 'Button' && text(n).trim() === 'Ver');
  assert.equal(buttons.length, 1); // Ningún Ver del principal ni del documento económico.
  assert.equal(render().some(n => n.type === 'PreviewDocumento'), false);
  buttons[0].props.onClick();
  const preview = render().find(n => n.type === 'PreviewDocumento');
  assert.equal(preview.props.archivoId, 444);
  assert.equal(preview.props.title, 'imagen_correo.png');
  assert.equal(preview.props.src, undefined);
  render().find(n => n.props['aria-label'] === 'Cerrar vista previa').props.onClick();
  assert.equal(render().some(n => n.type === 'PreviewDocumento'), false);
});
for (const archivoId of [undefined, null, 0, -1, 1.5, '444']) test(`sin archivoId válido ${archivoId} no ofrece Ver`, () => {
  const data = { ...op, archivoInicial: { ...op.archivoInicial, archivoId } };
  const props = page({ query: { data } }).node.props;
  assert.equal(props.sustentoOrden.visualizable, false);
  // La vista también protege el ID aunque alguien le pase visualizable=true.
  const nodes = viewHarness({ ...props, sustentoOrden: { ...props.sustentoOrden, visualizable: true } })();
  assert.equal(nodes.some(n => n.type === 'Button' && JSON.stringify(n.props.children).includes('Ver')), false);
  assert.equal(nodes.some(n => n.type === 'PreviewDocumento'), false);
});
