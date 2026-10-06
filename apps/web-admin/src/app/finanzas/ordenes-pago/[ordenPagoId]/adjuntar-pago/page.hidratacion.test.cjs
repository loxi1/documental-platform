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
const financiero = {
  grupoFacturaId: 116,
  origenObligacion: 'ORDEN_PAGO',
  obligacion: {
    tipo: 'ORDEN_PAGO',
    documentoId: 443,
    referencia: 'OP-153',
    monto: '100.00',
    moneda: 'PEN',
  },
  pago: { pagado: '0.00', saldo: '100.00', estado: 'SIN PAGOS' },
  sustentosActivos: [],
  sustentosObservados: [],
  sustentosAnulados: [],
};

function page({
  id = '153',
  query = { data: op },
  resumenQuery = { data: financiero },
  workspaceId = 13,
} = {}) {
  const exports = {};
  const options = [];
  const calls = { ordenPago: [], resumen: [] };
  const jsx = (type, props) => ({ type, props });

  vm.runInNewContext(code, { exports, require(name) {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'next/navigation') return { useParams: () => ({ ordenPagoId: id }) };
    if (name === '@tanstack/react-query') return {
      useQuery: config => {
        options.push(config);
        return options.length === 1 ? query : resumenQuery;
      },
      useQueryClient: () => ({
        invalidateQueries: ({ queryKey }) => {
          calls.invalidatedQueries ??= [];
          calls.invalidatedQueries.push(queryKey);
          return Promise.resolve();
        },
      }),
    };
    if (name === '@/lib/auth-storage') return { getContexto: () => ({ workspaceId, sub: 6 }) };
    if (name === '@/services/finanzas') return {
      getOrdenPago: async value => {
        calls.ordenPago.push(value);
        return op;
      },
      getResumenFinancieroGrupo: async value => {
        calls.resumen.push(value);
        return financiero;
      },
    };
    if (name === '@/components/finanzas/OrdenPagoAdjuntarPagoView') return { OrdenPagoAdjuntarPagoView: 'OPView' };
    throw new Error(`Import no autorizado: ${name}`);
  } });

  return {
    node: exports.default(),
    queryOptions: options[0],
    resumenOptions: options[1],
    calls,
  };
}

test('OP-153 usa grupoFacturaId 116 para R5-READ y consume resumen financiero canónico', async () => {
  const p = page();

  assert.equal(p.node.type, 'OPView');
  assert.equal(p.queryOptions.enabled, true);
  assert.equal(p.resumenOptions.enabled, true);

  assert.equal((await p.queryOptions.queryFn()).grupoFacturaId, 116);
  await p.resumenOptions.queryFn();

  assert.deepEqual(p.calls.ordenPago, [153]);
  assert.deepEqual(p.calls.resumen, [116]);
  assert.equal(p.calls.resumen.includes(443), false);

  const resumen = JSON.parse(JSON.stringify(p.node.props.resumen));
  assert.equal(resumen.codigo, 'OP-153');
  assert.equal(resumen.monto, '100.00');
  assert.equal(resumen.moneda, 'PEN');
  assert.equal(resumen.estadoPago, 'SIN PAGOS');
  assert.equal(resumen.pagado, '0.00');
  assert.equal(resumen.saldo, '100.00');

  assert.equal(p.node.props.documentoEconomico, undefined);
});
test('OP con concepto canónico hidrata conceptoCodigo/conceptoNombre y conserva fallback sin darle prioridad', () => {
  const data = {
    ...op,
    conceptoCodigo: 'AGUA',
    conceptoNombre: 'Agua',
    tipo: 'SERVICIOS_GENERALES',
    subtipo: 'OTROS',
  };

  const resumen = JSON.parse(JSON.stringify(
    page({ query: { data } }).node.props.resumen,
  ));

  assert.equal(resumen.conceptoCodigo, 'AGUA');
  assert.equal(resumen.conceptoNombre, 'Agua');
  assert.equal(resumen.tipo, 'SERVICIOS_GENERALES');
  assert.equal(resumen.subtipo, 'OTROS');
});

test('OP histórica sin concepto canónico conserva tipo/subtipo para fallback', () => {
  const resumen = JSON.parse(JSON.stringify(page().node.props.resumen));

  assert.equal(resumen.conceptoCodigo, undefined);
  assert.equal(resumen.conceptoNombre, undefined);
  assert.equal(resumen.tipo, 'SERVICIOS_GENERALES');
  assert.equal(resumen.subtipo, 'OTROS');
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
  const p = page({ id });
  assert.equal(p.queryOptions.enabled, false);
  assert.equal(p.resumenOptions.enabled, false);
  assert.equal(p.node.type, 'main');
});
test('sin contexto no habilita GET; cache aislado por workspace/actor', () => {
  const sinContexto = page({ workspaceId: null });
  assert.equal(sinContexto.queryOptions.enabled, false);
  assert.equal(sinContexto.resumenOptions.enabled, false);
  assert.notDeepEqual(
    page({ workspaceId: 13 }).queryOptions.queryKey,
    page({ workspaceId: 14 }).queryOptions.queryKey,
  );
});
function renderedText(nodes) {
  const text = node =>
    Array.isArray(node)
      ? node.map(text).join('')
      : typeof node === 'object' && node
        ? text(node.props?.children)
        : String(node ?? '');

  return nodes.map(text).join(' ');
}
test('vista muestra Concepto y nombre canónico sin mostrar tipo/subtipo como segunda clasificación', () => {
  const data = {
    ...op,
    conceptoCodigo: 'AGUA',
    conceptoNombre: 'Agua',
    tipo: 'SERVICIOS_GENERALES',
    subtipo: 'OTROS',
  };

  const props = page({ query: { data } }).node.props;
  const contenido = renderedText(viewHarness(props)());

  assert.match(contenido, /Concepto/);
  assert.match(contenido, /Agua/);
  assert.doesNotMatch(contenido, /SERVICIOS_GENERALES/);
  assert.doesNotMatch(contenido, /OTROS/);
});

test('vista histórica sin concepto conserva tipo/subtipo sin separador vacío', () => {
  const props = page().node.props;
  const contenido = renderedText(viewHarness(props)());

  assert.match(contenido, /SERVICIOS_GENERALES/);
  assert.match(contenido, /OTROS/);
  assert.doesNotMatch(contenido, /undefined|null/);
  assert.doesNotMatch(contenido, /·\s*$/);
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
    if (name === 'react') return {
      useMemo: fn => fn(),
      useRef: value => {
        const i = cursor++;
        if (!(i in states)) states[i] = { current: value };
        return states[i];
      },
      useState: value => {
        const i = cursor++;
        if (!(i in states)) states[i] = typeof value === 'function' ? value() : value;
        return [states[i], next => {
          states[i] = typeof next === 'function' ? next(states[i]) : next;
        }];
      },
      useEffect: () => {
        cursor++;
      },
    };
    if (name === '@/constants/catalogos') return { BANCO_OPTIONS: [], MONEDA_OPTIONS: [], hasCatalogValue: () => false };
    if (name === '@tanstack/react-query') return {
      useQueryClient: () => ({
        invalidateQueries: ({ queryKey }) => {
          return Promise.resolve();
        },
      }),
    };
    if (name === '@/components/finanzas/finanzas-moneda') return {
      formatMontoFinanzas: (monto, moneda = 'PEN') => {
        if (monto === null || monto === undefined || monto === '') {
          return 'No disponible';
        }

        const raw = String(moneda ?? 'PEN').trim().toUpperCase();
        const normalizada = raw
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[\s._-]+/g, '');

        let monedaNormalizada;
        if (['S/', 'S/.', 'SOLES', 'SOL', 'PEN'].includes(raw)) {
          monedaNormalizada = 'PEN';
        } else if (
          ['$', 'US$', 'USD', 'DOLARES', 'DOLAR'].includes(raw) ||
          ['DOLARESAMERICANOS', 'DOLARAME', 'USDDOLLARS'].includes(normalizada)
        ) {
          monedaNormalizada = 'USD';
        } else {
          monedaNormalizada = raw || 'PEN';
        }

        const numero =
          typeof monto === 'number'
            ? monto
            : Number(String(monto).replace(/,/g, ''));

        if (!Number.isFinite(numero)) {
          return `${monedaNormalizada} ${String(monto)}`.trim();
        }

        return new Intl.NumberFormat('es-PE', {
          style: 'currency',
          currency: monedaNormalizada === 'USD' ? 'USD' : 'PEN',
        }).format(numero);
      },
    };
    return new Proxy({}, { get: (_, key) => key });
  } });
  function nodes(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(nodes);
    return [node, ...nodes(node.props?.children)];
  }
  return () => { cursor = 0; return nodes(exports.OrdenPagoAdjuntarPagoView(props)); };
}
test('la vista presenta estado, pagado y saldo recibidos de R5-READ sin cálculo local', () => {
  const panel = viewHarness(page().node.props)().find(n => n.type === 'FinanzasPaymentPanel');
  assert.equal(panel.props.estadoPago, 'SIN PAGOS');
  assert.equal(panel.props.pagadoAcumuladoLabel, 'S/\u00A00.00');
  assert.equal(panel.props.saldoLabel, 'S/\u00A0100.00');
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
