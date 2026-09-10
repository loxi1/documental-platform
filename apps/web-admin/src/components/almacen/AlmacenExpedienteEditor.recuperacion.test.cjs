const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = `${__dirname}/AlmacenExpedienteEditor.tsx`;
const text = fs.readFileSync(path, 'utf8');
const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['abrirRecuperacionAlmacen','guardarRecuperacionAlmacen','agregarVersionRecuperacionAlmacen','refrescarRecuperacionAlmacen','contextoRecuperacionVigente','agregarDuplicadoComoVersion','resolverVersionAntiguaAlmacen','isArchivoVersionOperativa'];
const functions = [];
function visit(n) { if (ts.isFunctionDeclaration(n) && names.includes(n.name?.text)) functions.push(n.getText(source)); ts.forEachChild(n,visit); }
visit(source);
const code = ts.transpileModule(functions.join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const contexto = { expedienteId: 9, grupoFacturaId: 50, documentoBaseId: 106, facturaDocumentoId: 212 };
const fila = { documentoId: 10, archivoId: 11, ocrResultadoId: 20, tipoDocumental: 'GUIA_REMISION', accionSugerida: 'VALIDAR_OCR' };
function setup() {
  const calls = { open: [], version: [], query: [], confirm: 0, save: 0, result: null, abierto: null };
  const context = { modalAbierto: false, id: 9, codigo: 'EXP', empresa: 'TEST', rucComprador: '',
    contextoRecuperacionRef: { current: contexto }, recuperacionOcupadaRef: { current: false },
    setRecuperacionOcupada() {}, setMensajeValidacion() {}, setAccionActual() {}, setVersionDocumentoDestinoId() {}, setVersionDocumentoDestinoDoc() {},
    setModalAbierto(v) { calls.open.push(v); }, setRecuperacionAbierta(v) { calls.abierto = v; },
    setResultadoModal(v) { calls.result = typeof v === 'function' ? v(calls.result) : v; },
    DOCUMENTO_ALMACEN_ADJUNTO_OPTIONS: [{ tipoEsperado: 'GUIA_REMISION' }, { tipoEsperado: 'NOTA_INGRESO' }, { tipoEsperado: 'FACTURA' }],
    normalizeTipoDocumentalParaBackend: v => v, getRecoveryGrupoFacturaId: r => r.grupoFacturaId,
    getOcrResultado: async () => ({ id: 20, documento_id: 10, archivo_id: 11, grupoFacturaId: 50, estado: 'editado', metadata: { metadata: { numero: '12' } } }),
    queryClient: { invalidateQueries({ queryKey }) { calls.query.push(queryKey); return Promise.resolve(); } },
    agregarArchivoComoVersion: async (...args) => { calls.version.push(args); },
    confirmarRecuperacionAlmacen: async () => { calls.confirm++; },
    getDocumentoArchivos: async () => ({ data: [] }), normalizeCompare: v => String(v).toUpperCase(),
    editarOcrResultado: async () => { calls.save++; }, buildMetadataDesdeFormulario: form => ({ ...form }),
    versionDocumentoDestinoId: null, versionesModalDoc: null, resultadoModal: {}, getArchivoId: () => '11',
  };
  vm.createContext(context); vm.runInContext(code,context);
  return { context,calls };
}
test('dos secciones; NI nunca recibe botón versión', () => {
  assert.ok(text.includes("['PENDIENTE_OCR','IDENTIFICADO'] as const"));
  assert.ok(text.includes("['GUIA_REMISION','FACTURA'].includes(fila.tipoDocumental) && fila.accionSugerida === 'AGREGAR_VERSION'"));
  assert.ok(text.includes('>Ver</Button>')); assert.ok(text.includes('>Editar</Button>'));
});
test('Ver usa readOnly, OCR editado recuperado sin mutation', async () => {
  const { context,calls } = setup(); await context.abrirRecuperacionAlmacen(fila, true);
  assert.equal(calls.abierto.soloVer, true); assert.equal(calls.result.metadata.numero, '12');
  assert.equal(calls.confirm + calls.save + calls.version.length, 0);
});
test('Ver versión de FACTURA legacy sin grupo OCR usa pertenencia al destino autorizado', async () => {
  const { context,calls } = setup();
  context.getOcrResultado = async () => ({ id:20, documento_id:212, archivo_id:11, estado:'editado', metadata:{} });
  await context.abrirRecuperacionAlmacen({ ...fila, tipoDocumental:'FACTURA', documentoId:212 }, true);
  assert.equal(calls.abierto.soloVer, true);
  assert.equal(calls.confirm + calls.save + calls.version.length, 0);
});
test('Editar sin OCR abre modo manual sin ejecutar GET OCR', async () => {
  const { context,calls } = setup(); context.getOcrResultado = () => { throw new Error('OCR prohibido'); };
  await context.abrirRecuperacionAlmacen({ ...fila, ocrResultadoId: null, tipoDocumental: 'NOTA_INGRESO' });
  assert.equal(calls.abierto.soloVer, false); assert.equal(calls.abierto.fila.ocrResultadoId, null);
  assert.ok(text.includes("? 'pendiente_manual_almacen' : 'ocr'"));
  assert.equal(calls.confirm,0);
});
test('guardar OCR relee/reclasifica sin confirmar', async () => {
  const { context,calls } = setup(); context.recuperacionAbierta = { fila, contexto, soloVer: false };
  await context.guardarRecuperacionAlmacen({ tipoDocumental: 'GUIA_REMISION', numero: '12' });
  assert.equal(calls.save,1); assert.equal(calls.confirm,0);
  assert.ok(calls.query.some(q => q[0] === 'almacen-recuperacion'));
});
test('manual confirmar explícito, sin editar OCR', async () => {
  const { context,calls } = setup(); context.recuperacionAbierta = { fila: { ...fila, ocrResultadoId: null }, contexto, soloVer: false };
  await context.guardarRecuperacionAlmacen({ numero: '12' }, true);
  assert.equal(calls.confirm,1); assert.equal(calls.save,0); assert.deepEqual(calls.open,[false]);
});
test('versión directa protege doble click y refresca contador', async () => {
  const { context,calls } = setup(); let finish;
  context.agregarArchivoComoVersion = async (...args) => { calls.version.push(args); await new Promise(r => { finish=r; }); };
  const copia = { ...fila, accionSugerida: 'AGREGAR_VERSION', documentoIdDestino: 99 };
  const first = context.agregarVersionRecuperacionAlmacen(copia);
  await context.agregarVersionRecuperacionAlmacen(copia); assert.equal(calls.version.length,1); finish(); await first;
  assert.deepEqual(calls.open,[]); assert.ok(calls.query.some(q=>q[0]==='almacen-documento-versiones-contador'));
});
test('NI no versiona aunque un payload lo sugiera', async () => {
  const { context,calls } = setup();
  await context.agregarVersionRecuperacionAlmacen({ ...fila, tipoDocumental:'NOTA_INGRESO', accionSugerida:'AGREGAR_VERSION', documentoIdDestino:99 });
  assert.equal(calls.version.length,0);
});
test('error conserva pendiente y contexto cambiado impide guardar', async () => {
  const { context,calls } = setup(); context.agregarArchivoComoVersion = async () => { throw new Error('409'); };
  await context.agregarVersionRecuperacionAlmacen({ ...fila, accionSugerida:'AGREGAR_VERSION',documentoIdDestino:99 });
  assert.deepEqual(calls.open,[]);
  context.recuperacionAbierta = { fila, contexto, soloVer:false }; context.contextoRecuperacionRef.current = { ...contexto, grupoFacturaId:51 };
  await assert.rejects(context.guardarRecuperacionAlmacen({}),/contexto cambió/);
});
test('resolución antigua invalida contador y nuevas listas', async () => {
  const { context,calls } = setup(); await context.agregarDuplicadoComoVersion({ documentoIdExistente:99,archivoIdActual:11 });
  assert.ok(calls.query.some(q=>q[0]==='almacen-documento-versiones-contador'));
  assert.ok(calls.query.some(q=>q[0]==='almacen-recuperacion'));
});
test('resolución antigua ya completada tras timeout no repite mutación', async () => {
  const { context,calls } = setup();
  context.getDocumentoArchivos = async () => ({ data: [{ id:11, estado:'activo', versionado:{ accion:'AGREGADO_COMO_VERSION' } }] });
  await context.agregarDuplicadoComoVersion({ documentoIdExistente:99,archivoIdActual:11 });
  assert.equal(calls.version.length, 0);
  assert.ok(calls.query.some(q=>q[0]==='almacen-documento-versiones-contador'));
});
test('recuperación no invoca OCR ni upload', () => {
  assert.doesNotMatch(functions.join('\n'), /procesarArchivoOcr|subirDocumento|subirArchivo/);
});
const modal = fs.readFileSync(`${__dirname}/../ocr/OcrValidationModal.tsx`,'utf8');
test('modo manual Almacén no fuerza FACTURA ni ofrece Guardar cambios', () => {
  assert.ok(modal.includes('"pendiente_manual_almacen"'));
  assert.ok(modal.includes('modo !== "pendiente_manual" && modo !== "pendiente_manual_almacen"'));
  assert.ok(modal.includes('if (modo === "pendiente_manual")'));
});

test('FACTURA: timeout después del commit reconcilia ambas listas, historial y contador, sin repetir versión', async () => {
  const { context, calls } = setup();
  const copia = { ...fila, tipoDocumental: 'FACTURA', clasificacion: 'IDENTIFICADO', accionSugerida: 'AGREGAR_VERSION', documentoIdDestino: 99 };
  let pendientes = [copia];
  const archivos = [{ id: 100, estado: 'subido', tipo_version: 'original', version: 1, es_version_actual: true }];
  let contador = 1;
  context.versionesModalDoc = { id: 99 }; context.getDocumentoId = () => '99';
  let historial = { documentoId: '99', archivos: [] };
  context.getDocumentoArchivos = async () => ({ data: archivos });
  context.setVersionesModal = update => { historial = update(historial); };
  context.queryClient.invalidateQueries = async ({ queryKey }) => {
    calls.query.push(queryKey);
    if (queryKey[0] === 'almacen-documento-versiones-contador') contador = archivos.filter(a => context.isArchivoVersionOperativa(a, 'FACTURA')).length;
  };
  context.agregarArchivoComoVersion = async (...args) => {
    calls.version.push(args); archivos[0].es_version_actual = false;
    archivos.push({ id: copia.archivoId, estado: 'activo', version: 2, es_version_actual: true });
    pendientes = []; // persisted candidate absorbed; GET excludes duplicado_versionado / active file.
    throw new Error('timeout después del commit');
  };
  await context.agregarVersionRecuperacionAlmacen(copia);
  assert.equal(pendientes.filter(p => p.clasificacion === 'PENDIENTE_OCR').length, 0);
  assert.equal(pendientes.filter(p => p.clasificacion === 'IDENTIFICADO').length, 0);
  assert.equal(contador, 2); assert.equal(historial.archivos.length, 2);
  await context.refrescarRecuperacionAlmacen(9); // reload/refetch is read-only, never a mutation retry.
  assert.equal(calls.version.length, 1); assert.deepEqual(calls.open, []);
  assert.equal((await context.getDocumentoArchivos()).data.filter(a => context.isArchivoVersionOperativa(a, 'FACTURA')).length, 2);
  assert.equal(calls.confirm + calls.save, 0);
});
test('contador FACTURA incluye original subido, excluye candidatos y conserva regla GUIA', () => {
  const { context } = setup();
  assert.equal(context.isArchivoVersionOperativa({ estado:'subido',tipo_version:'original' }, 'FACTURA'), true);
  assert.equal(context.isArchivoVersionOperativa({ estado:'subido',tipo_version:null,origen_archivo:'upload_version_candidata' }, 'FACTURA'), false);
  assert.equal(context.isArchivoVersionOperativa({ estado:'subido',tipo_version:'original' }, 'GUIA_REMISION'), false);
  assert.equal(context.isArchivoVersionOperativa({ estado:'anulado',tipo_version:'original' }, 'FACTURA'), false);
});
