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
  const calls = {
    uploads: [],
    saves: [],
    beneficiaries: [],
    providers: [],
    created: [],
    closes: 0,
    resets: 0,
  };
  const cleanups = [];
  const staged = { tempId: 292, estado: 'STAGED', nombreOriginal: 'inicial.pdf' };
  const services = {
    getOpcionesOrdenPago() {}, buscarContextosOrdenPago() {},
    buscarProveedoresOrdenPago(search, limit) {
      calls.providers.push({ search, limit });
      return overrides.providers
        ? overrides.providers(search, limit)
        : [
            { id: 849, ruc: '20100000001', razonSocial: 'Proveedor Agua' },
            { id: 850, ruc: '20100000002', razonSocial: 'Proveedor Internet' },
          ];
    },
    async getBeneficiariosOrdenPago(contenedorOperativoId, conceptoCodigo) {
      calls.beneficiaries.push({ contenedorOperativoId, conceptoCodigo });
      return overrides.beneficiaries
        ? overrides.beneficiaries(contenedorOperativoId, conceptoCodigo)
        : { tipoBeneficiario: 'PROVEEDOR', usoBeneficiario: 'REQUERIDO', items: [
            { id: 849, nombre: 'Proveedor configurado', detalle: '20131257750' },
          ] };
    },
    async subirArchivoInicialOrdenPago(file, key) { calls.uploads.push({ file, key }); return overrides.upload ? overrides.upload(file, key) : staged; },
    async crearOrdenPago(payload, key) { calls.saves.push({ payload, key }); return overrides.save ? overrides.save(payload, key) : { ordenPagoId: 151 }; },
  };
  let pendingEffects = [];
  let stateChangedByEffect = false;
  let runningEffect = false;

  const react = {
    useRef(value) { const i = cursor++; hooks[i] ??= { current: value }; return hooks[i]; },
    useState(value) {
      const i = cursor++;
      if (!(i in hooks)) {
        hooks[i] = typeof value === 'function' ? value() : value;
      }
      return [
        hooks[i],
        v => {
          const next =
            typeof v === 'function' ? v(hooks[i]) : v;
          if (!Object.is(hooks[i], next)) {
            hooks[i] = next;
            if (runningEffect) stateChangedByEffect = true;
          }
        },
      ];
    },
    useEffect(fn, deps) {
      const i = cursor++;
      const previous = hooks[i];
      const changed =
        !previous ||
        !deps ||
        !previous.deps ||
        deps.length !== previous.deps.length ||
        deps.some(
          (value, index) =>
            !Object.is(value, previous.deps[index]),
        );

      if (changed) {
        pendingEffects.push({
          i,
          fn,
          deps: deps ? [...deps] : undefined,
          previous,
        });
      }
    },
  };
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  const flatpickrOptions = [];
  vm.runInNewContext(code, {
    exports,
    Intl,
    Date: overrides.Date ?? Date,
    crypto: { randomUUID: () => `uuid-${++uuid}` },
    FormData: class { constructor(form) { this.values = form.values; } get(k) { return this.values[k] ?? null; } },
    require(name) {
      if (name === 'flatpickr') {
        const flatpickrStub = (_element, options = {}) => {
          flatpickrOptions.push(options);
          return {
            open() {},
            clear() {},
            destroy() {},
          };
        };
        return { default: flatpickrStub };
      }
      if (name === 'flatpickr/dist/plugins/monthSelect') {
        const monthSelectPluginStub = () => ({});
        return { default: monthSelectPluginStub };
      }
      if (name === 'flatpickr/dist/l10n/es') {
        return { Spanish: {} };
      }
      if (
        name === 'flatpickr/dist/flatpickr.css' ||
        name === 'flatpickr/dist/plugins/monthSelect/style.css'
      ) {
        return {};
      }
      if (name === 'react') return react;
      if (name === 'lucide-react') {
        return {
          CalendarDays: props => jsx('CalendarDays', props ?? {}),
        };
      }
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
      if (name === '@tanstack/react-query') return { useQuery: ({ queryKey, queryFn, enabled }) => {
        if (queryKey[0] === 'op-opciones') return {
          data: {
            monedas: [{ codigo: 'PEN', nombre: 'Soles' }],
            conceptos: [
              {
                codigo: 'AGUA',
                nombre: 'Agua',
                clasificacion: 'SERVICIOS',
                usoCodigoPago: 'OPCIONAL',
                tipoBeneficiario: 'PROVEEDOR',
                usoBeneficiario: 'REQUERIDO',
                modoSeleccionBeneficiario: 'AUTOCOMPLETE',
              },
              {
                codigo: 'INTERNET',
                nombre: 'Internet',
                clasificacion: 'SERVICIOS',
                usoCodigoPago: 'NO_APLICA',
                tipoBeneficiario: 'PROVEEDOR',
                usoBeneficiario: 'REQUERIDO',
                modoSeleccionBeneficiario: 'AUTOCOMPLETE',
              },
              {
                codigo: 'ESSALUD',
                nombre: 'ESSALUD',
                clasificacion: 'APORTES',
                usoCodigoPago: 'NO_APLICA',
                tipoBeneficiario: 'PROVEEDOR',
                usoBeneficiario: 'REQUERIDO',
                modoSeleccionBeneficiario: 'CONFIGURADO',
              },
              {
                codigo: 'RECIBO_HONORARIOS',
                nombre: 'Recibo por honorarios',
                clasificacion: 'HONORARIOS',
                usoCodigoPago: 'NO_APLICA',
                tipoBeneficiario: 'NOMBRE_LIBRE',
                usoBeneficiario: 'REQUERIDO',
                modoSeleccionBeneficiario: 'NO_APLICA',
              },
            ],
          },
          isLoading: false,
          isError: false,
        };
        if (queryKey[0] === 'op-proveedores') {
          if (!enabled) return {
            data: undefined,
            isLoading: false,
            isError: false,
          };

          const result = queryFn();

          if (result && typeof result.then === 'function') {
            return {
              data: undefined,
              isLoading: true,
              isError: false,
            };
          }

          return {
            data: result,
            isLoading: false,
            isError: false,
          };
        }

        if (queryKey[0] === 'op-beneficiarios') {
          const concepto = queryKey[3];
          const fallback = concepto === 'INTERNET'
            ? {
                tipoBeneficiario: 'PROVEEDOR',
                usoBeneficiario: 'REQUERIDO',
                items: [
                  {
                    id: 850,
                    nombre: 'Proveedor Internet',
                    detalle: '20100000002',
                  },
                ],
              }
            : {
                tipoBeneficiario: 'PROVEEDOR',
                usoBeneficiario: 'REQUERIDO',
                items: [
                  {
                    id: 849,
                    nombre: 'Proveedor Agua',
                    detalle: '20100000001',
                  },
                ],
              };

          const overrideData = overrides.beneficiaries
            ? overrides.beneficiaries(
                queryKey[3],
                concepto,
              )
            : null;

          if (
            overrideData &&
            typeof overrideData.then === 'function'
          ) {
            throw new Error(
              'El override beneficiaries del harness debe ser síncrono',
            );
          }

          return {
            data: enabled ? (overrideData ?? fallback) : undefined,
            isLoading: false,
            isError: false,
            refetch: queryFn,
          };
        }
        return {
          data: [{ contenedorOperativoId: 7, codigo: '050201', descripcion: 'Contexto LAB' }],
          isLoading: false,
          isError: false,
        };
      } };
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
    for (let cycle = 0; cycle < 10; cycle++) {
      cursor = 0;
      pendingEffects = [];

      tree = exports.CrearOrdenPagoModal({
        workspaceId: 13,
        onCreated: id => calls.created.push(id),
      });

      for (const n of nodes(tree)) {
        if (n.props.ref) {
          n.props.ref.current ??=
            n.type === 'dialog'
              ? {
                  showModal() {},
                  close() {
                    calls.closes++;
                    find('dialog').props.onClose();
                  },
                }
              : { value: '' };
        }
      }

      if (pendingEffects.length === 0) return;

      stateChangedByEffect = false;
      runningEffect = true;

      for (const effect of pendingEffects) {
        effect.previous?.cleanup?.();

        const cleanup = effect.fn();

        hooks[effect.i] = {
          deps: effect.deps,
          cleanup,
        };

        if (typeof cleanup === 'function') {
          cleanups.push(cleanup);
        }
      }

      runningEffect = false;

      if (!stateChangedByEffect) return;
    }

    throw new Error(
      'Harness React: effects no estabilizaron en 10 ciclos',
    );
  }
  function find(type, predicate = () => true) { return nodes(tree).find(n => n.type === type && predicate(n.props)); }
  function findAll(type, predicate = () => true) { return nodes(tree).filter(n => n.type === type && predicate(n.props)); }
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
    let selects = nodes(tree).filter(n => n.type === 'select' && n.props.value !== undefined);
    if (selects.length !== 2) throw new Error(`Se esperaban 2 selects controlados Tipo/Subtipo antes del concepto; encontrados=${selects.length}`);
    selects[0].props.onChange({ target: { value: 'SERVICIOS' } }); render();
    selects = nodes(tree).filter(n => n.type === 'select' && n.props.value !== undefined);
    const subtipo = selects[1];
    subtipo.props.onChange({ target: { value: 'AGUA' } }); render();

    // AGUA usa AUTOCOMPLETE: no debe existir un tercer select
    // ni debe consultar la lista CONFIGURADA.
    render();
    selects = nodes(tree).filter(
      n => n.type === 'select' && n.props.value !== undefined,
    );

    if (selects.length !== 2) {
      throw new Error(
        `AGUA AUTOCOMPLETE no debe crear selector configurado; encontrados=${selects.length}`,
      );
    }

    if (calls.beneficiaries.length !== 0) {
      throw new Error(
        `AGUA AUTOCOMPLETE no debe consultar beneficiarios configurados; llamadas=${calls.beneficiaries.length}`,
      );
    }

    const proveedor = find(
      'input',
      p => p.placeholder === 'Buscar por RUC o razón social',
    );

    if (!proveedor) {
      throw new Error(
        'No apareció autocomplete canónico de proveedor para AGUA',
      );
    }
  }
  render(); ready();
  return { calls, render, find, findAll, submit, choose, close, unmount: () => cleanups.forEach(fn => fn?.()),
    flush: async () => { await tick(); render(); },
    flatpickrOptions: () => flatpickrOptions,
    controlledSelects: () => nodes(tree)
      .filter(n => n.type === 'select' && n.props.value !== undefined)
      .slice(0, 2),
    selectProveedor: async (texto = 'Proveedor Agua') => {
      const input = find(
        'input',
        p => p.placeholder === 'Buscar por RUC o razón social',
      );
      if (!input) throw new Error('No existe autocomplete de proveedor');

      input.props.onChange({ target: { value: texto } });
      render();

      const candidatos = nodes(tree).filter(
        n =>
          n.type === 'button' &&
          typeof n.props.onClick === 'function' &&
          typeof n.props.className === 'string' &&
          n.props.className.includes('text-left'),
      );

      if (candidatos.length === 0) {
        throw new Error('No apareció proveedor candidato AUTOCOMPLETE');
      }

      candidatos[0].props.onClick();
      render();
    },
    saveDisabled: () => find('button', p => p.type === 'submit').props.disabled };
}

test('R5B-1: Tipo filtra Subtipo y cambiar Tipo invalida concepto previo', () => {
  const m = modal();

  let selects = m.controlledSelects();
  assert.equal(selects.length, 2);
  assert.equal(selects[0].props.value, 'SERVICIOS');
  assert.equal(selects[1].props.value, 'AGUA');

  const opcionesServicios = selects[1].props.children
    .flat(Infinity)
    .filter(Boolean)
    .filter(n => n.type === 'option')
    .map(n => n.props.value);
  assert.ok(opcionesServicios.includes('AGUA'));
  assert.ok(!opcionesServicios.includes('RECIBO_HONORARIOS'));

  selects[0].props.onChange({ target: { value: 'HONORARIOS' } });
  m.render();

  selects = m.controlledSelects();
  assert.equal(selects[0].props.value, 'HONORARIOS');
  assert.equal(selects[1].props.value, 'RECIBO_HONORARIOS');
  assert.equal(selects[1].props.disabled, false);

  const opcionesHonorarios = selects[1].props.children
    .flat(Infinity)
    .filter(Boolean)
    .filter(n => n.type === 'option')
    .map(n => n.props.value);
  assert.ok(opcionesHonorarios.includes('RECIBO_HONORARIOS'));
  assert.ok(!opcionesHonorarios.includes('AGUA'));

  // 1 -> N: al volver a un Tipo con múltiples conceptos,
  // el concepto autoseleccionado anterior debe invalidarse.
  selects[0].props.onChange({ target: { value: 'SERVICIOS' } });
  m.render();

  selects = m.controlledSelects();
  assert.equal(selects[0].props.value, 'SERVICIOS');
  assert.equal(selects[1].props.value, '');
  assert.equal(selects[1].props.disabled, false);
});

test('A/F: sin archivo conserva payload OP-01A y cierre/refresco mediante onCreated', async () => {
  const m = modal();
  await m.selectProveedor();
  m.submit();
  await m.flush();
  assert.equal(m.calls.uploads.length, 0); assert.equal(m.calls.saves.length, 1);
  assert.deepEqual(Object.keys(m.calls.saves[0].payload).sort(), [
    'contenedorOperativoId',
    'fechaEmision',
    'moneda',
    'monto',
    'observacion',
    'conceptoCodigo',
    'periodoAnio',
    'periodoMes',
    'codigoPago',
    'proveedorId',
    'beneficiarioClienteDestinoId',
    'beneficiarioUsuarioId',
    'beneficiarioNombreLibre',
  ].sort());
  assert.equal(m.calls.saves[0].payload.conceptoCodigo, 'AGUA');
  assert.ok(Number.isInteger(m.calls.saves[0].payload.periodoAnio));
  assert.ok(
    m.calls.saves[0].payload.periodoMes >= 1 &&
    m.calls.saves[0].payload.periodoMes <= 12,
  );
  assert.equal(m.calls.saves[0].payload.codigoPago, null);
  assert.equal(m.calls.saves[0].payload.proveedorId, 849);
  assert.equal(m.calls.saves[0].payload.beneficiarioClienteDestinoId, null);
  assert.equal(m.calls.saves[0].payload.beneficiarioUsuarioId, null);
  assert.equal(m.calls.saves[0].payload.beneficiarioNombreLibre, null);
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
  const m = modal();
  await m.selectProveedor();
  m.choose();
  await m.flush();
  m.submit();
  await m.flush();
  assert.equal(m.calls.saves[0].payload.tempId, 292);
  assert.deepEqual(Object.keys(m.calls.saves[0].payload).sort(), [
    'tempId',
    'contenedorOperativoId',
    'fechaEmision',
    'moneda',
    'monto',
    'observacion',
    'conceptoCodigo',
    'periodoAnio',
    'periodoMes',
    'codigoPago',
    'proveedorId',
    'beneficiarioClienteDestinoId',
    'beneficiarioUsuarioId',
    'beneficiarioNombreLibre',
  ].sort());
  assert.equal(m.calls.saves[0].payload.conceptoCodigo, 'AGUA');
  assert.equal(m.calls.saves[0].payload.proveedorId, 849);
  assert.deepEqual(m.calls.created, [151]); assert.equal(m.calls.closes, 1);
});
for (const status of [undefined, 503, 409]) test(`D: error ${status ?? 'red'} conserva TEMP, payload y clave sin reupload`, async () => {
  let fail = true;
  const m = modal({ save: async () => { if (fail) throw status ? { response: { status } } : new Error('timeout'); return { ordenPagoId: 151 }; } });
  await m.selectProveedor();
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
  await m.selectProveedor();
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
  await m.selectProveedor();
  m.choose('viejo.pdf'); m.choose('nuevo.pdf'); await m.flush();
  old.resolve({ tempId: 292, estado: 'STAGED' }); await m.flush(); m.submit(); await m.flush();
  assert.equal(m.calls.saves[0].payload.tempId, 300); assert.equal(m.calls.uploads.length, 2);
});
test('upload fallido impide crear OP accidentalmente sin archivo; quitar permite continuar', async () => {
  const m = modal({ upload: async () => { throw new Error('upload'); } });
  await m.selectProveedor();
  m.choose();
  await m.flush();
  assert.equal(m.saveDisabled(), true); m.submit(); assert.equal(m.calls.saves.length, 0);
  m.find('button', p => p.children === 'Quitar archivo').props.onClick(); m.render(); m.submit(); await m.flush();
  assert.equal(m.calls.saves[0].payload.tempId, undefined);
});


test('I2: período opcional se persiste como año/mes y referencia OPCIONAL se transmite', async () => {
  const m = modal();

  const periodo = m.find('input', p =>
    p['aria-label'] === 'Período MM-YYYY' ||
    p.placeholder === 'MM-YYYY'
  );
  assert.ok(periodo);
  assert.equal(periodo.props.type, 'text');

  const periodoOptions = m.flatpickrOptions().find(options =>
    options?.dateFormat === 'm-Y' &&
    typeof options?.onChange === 'function'
  );
  assert.ok(periodoOptions);
  periodoOptions.onChange([new Date(2026, 8, 1)]);
  m.render();

  const referencia = m.find('input', p =>
    p.maxLength === 250 &&
    p.placeholder !== 'Nombre completo' &&
    p.type !== 'file'
  );
  assert.ok(referencia);
  assert.equal(referencia.props.required, false);
  referencia.props.onChange({ target: { value: '  REF-2026-09  ' } });
  m.render();

  await m.selectProveedor();
  m.submit();
  await m.flush();

  const payload = m.calls.saves[0].payload;
  assert.equal(payload.periodoAnio, 2026);
  assert.equal(payload.periodoMes, 9);
  assert.equal(payload.codigoPago, 'REF-2026-09');
  assert.equal(payload.proveedorId, 849);
});

test('I2: NOMBRE_LIBRE usa exclusivamente beneficiarioNombreLibre', async () => {
  const m = modal();

  let selects = m.controlledSelects();
  selects[0].props.onChange({ target: { value: 'HONORARIOS' } });
  m.render();

  selects = m.controlledSelects();
  assert.equal(selects[1].props.value, 'RECIBO_HONORARIOS');

  const nombre = m.find('input', p => p.placeholder === 'Nombre completo');
  assert.ok(nombre);
  assert.equal(nombre.props.required, true);
  nombre.props.onChange({ target: { value: '  Persona de Prueba  ' } });
  m.render();

  m.submit();
  await m.flush();

  const payload = m.calls.saves[0].payload;
  assert.equal(payload.conceptoCodigo, 'RECIBO_HONORARIOS');
  assert.equal(payload.beneficiarioNombreLibre, 'Persona de Prueba');
  assert.equal(payload.proveedorId, null);
  assert.equal(payload.beneficiarioClienteDestinoId, null);
  assert.equal(payload.beneficiarioUsuarioId, null);
});

test('I2: AUTOCOMPLETE selecciona proveedor canónico sin consultar CONFIGURADO', async () => {
  const m = modal();

  assert.equal(m.calls.beneficiaries.length, 0);

  await m.selectProveedor();

  m.submit();
  await m.flush();

  assert.equal(m.calls.saves.length, 1);
  assert.equal(m.calls.saves[0].payload.conceptoCodigo, 'AGUA');
  assert.equal(m.calls.saves[0].payload.proveedorId, 849);
  assert.equal(m.calls.beneficiaries.length, 0);
});

test('I2: CONFIGURADO con único elegible autoselecciona proveedor', async () => {
  const m = modal();

  let selects = m.controlledSelects();
  selects[0].props.onChange({ target: { value: 'APORTES' } });
  m.render();

  selects = m.controlledSelects();
  assert.equal(selects[1].props.value, 'ESSALUD');

  const beneficiario =
    m.findAll('select', p => p.value !== undefined)[2];

  assert.ok(beneficiario);
  assert.equal(beneficiario.props.value, '849');

  m.submit();
  await m.flush();

  assert.equal(m.calls.saves.length, 1);
  assert.equal(m.calls.saves[0].payload.conceptoCodigo, 'ESSALUD');
  assert.equal(m.calls.saves[0].payload.proveedorId, 849);
});

test('I2: CONFIGURADO con N elegibles no autoselecciona y bloquea submit', async () => {
  const m = modal({
    beneficiaries: () => ({
      tipoBeneficiario: 'PROVEEDOR',
      usoBeneficiario: 'REQUERIDO',
      items: [
        { id: 901, nombre: 'Proveedor Uno', detalle: '20100000901' },
        { id: 902, nombre: 'Proveedor Dos', detalle: '20100000902' },
      ],
    }),
  });

  let selects = m.controlledSelects();
  selects[0].props.onChange({ target: { value: 'APORTES' } });
  m.render();

  selects = m.controlledSelects();
  assert.equal(selects[1].props.value, 'ESSALUD');

  const beneficiario =
    m.findAll('select', p => p.value !== undefined)[2];

  assert.ok(beneficiario);
  assert.equal(beneficiario.props.value, '');

  m.submit();
  await m.flush();

  assert.equal(m.calls.saves.length, 0);
  assert.equal(
    m.find('p', p => p.role === 'alert').props.children,
    'Seleccione el beneficiario.',
  );
});


test('I2: período inicia en mes actual de Lima y puede borrarse', async () => {
  const RealDate = Date;
  class FixedDate extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : ['2026-10-02T12:00:00-05:00']));
    }

    static now() {
      return new RealDate('2026-10-02T12:00:00-05:00').getTime();
    }
  }

  const m = modal({ Date: FixedDate });

  const periodo = m.find('input', p =>
    p['aria-label'] === 'Período MM-YYYY' ||
    p.placeholder === 'MM-YYYY'
  );
  assert.ok(periodo);
  assert.equal(periodo.props.type, 'text');
  assert.equal(periodo.props.defaultValue, '10-2026');

  const periodoOptions = m.flatpickrOptions().find(options =>
    options?.dateFormat === 'm-Y'
  );
  assert.ok(periodoOptions);
  assert.equal(periodoOptions.defaultDate, '10-2026');

  const limpiarPeriodo = m.find('button', p => p.children === 'Limpiar');
  assert.ok(limpiarPeriodo);
  limpiarPeriodo.props.onClick();
  m.render();

  const periodoVacio = m.find('input', p =>
    p['aria-label'] === 'Período MM-YYYY' ||
    p.placeholder === 'MM-YYYY'
  );
  assert.ok(periodoVacio);
  assert.equal(periodoVacio.props.defaultValue, '');

  await m.selectProveedor();
  m.submit();
  await m.flush();

  const payload = m.calls.saves[0].payload;
  assert.equal(payload.periodoAnio, null);
  assert.equal(payload.periodoMes, null);
});
