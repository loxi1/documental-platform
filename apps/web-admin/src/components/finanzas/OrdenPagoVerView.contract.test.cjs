const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "../..");

const view = fs.readFileSync(
  path.join(__dirname, "OrdenPagoVerView.tsx"),
  "utf8",
);
const page = fs.readFileSync(
  path.join(
    root,
    "app/finanzas/ordenes-pago/[ordenPagoId]/ver/page.tsx",
  ),
  "utf8",
);
const bandeja = fs.readFileSync(
  path.join(__dirname, "FinanzasBandeja.tsx"),
  "utf8",
);

/* R28-P5 — T01, T18, T19 + regresiones visuales focales */

test("T01 Ver OP navega por ordenPagoId", () => {
  assert.match(
    bandeja,
    /\/finanzas\/ordenes-pago\/\$\{encodeURIComponent\(\s*String\(op\.ordenPagoId\),?\s*\)\}\/ver/,
  );
  assert.match(
    page,
    /useParams<\{ ordenPagoId: string \}>/,
  );
});

test("T18 Ver OP conserva loader e identidad propios de Orden de Pago", () => {
  assert.match(page, /getOrdenPago\(ordenPagoId\)/);
  assert.match(
    page,
    /getDocumentoEconomicoOp\(regularizadorId\)/,
  );
  assert.match(
    page,
    /getGrupoFacturaDocumentosV2\(detalle!\.grupoFacturaId\)/,
  );

  assert.match(view, /detalle\.ordenPagoId/);
  assert.doesNotMatch(view, /detalle\.expedienteId/);
});

test("T19 Ver OP alinea jerarquía visual sin identidad de expediente", () => {
  for (const label of [
    "Documento principal",
    "Periodo",
    "Beneficiario",
    "Estado regularización",
    "Referencia",
    "Documento económico",
  ]) {
    assert.match(view, new RegExp(label));
  }

  assert.match(
    view,
    /new Set\(\["FACTURA", "RECIBO_HONORARIO"\]\)/,
  );

  assert.doesNotMatch(view, /detalle\.expedienteId/);
});

test("Ver OP representa FACTURA y RH como documentos económicos", () => {
  assert.match(
    view,
    /new Set\(\["FACTURA", "RECIBO_HONORARIO"\]\)/,
  );
  assert.match(
    view,
    /tipo === "RECIBO_HONORARIO" \? "RECIBO POR HONORARIOS" : "FACTURA"/,
  );
  assert.doesNotMatch(
    view,
    /TIPOS_ECONOMICOS.*TRANSFERENCIA/,
  );
});

test("Ver OP conserva estado vacío y preview por archivoId", () => {
  assert.match(
    view,
    /Sin documento económico asociado\./,
  );
  assert.match(
    view,
    /<PreviewDocumento archivoId=\{preview\.archivoId\}/,
  );
});

test("principal conserva solo el botón de su archivo inicial", () => {
  assert.doesNotMatch(view, /Sustento de la orden/);
  assert.match(view, /archivoId: detalle\.archivoInicial!\.archivoId/);
  assert.doesNotMatch(view, /label="Estado"/);
  assert.match(view, /label="Estado regularización"/);
});

test("principal lógico no fabrica PreviewDocumento", () => {
  const component = view.slice(
    view.indexOf("export function OrdenPagoVerView"),
  );
  const jsx = component.slice(component.indexOf("  return ("));
  const principal = jsx.split("Documento económico")[0];

  assert.doesNotMatch(principal, /<PreviewDocumento/);
});

test("Ver OP incorpora resumen financiero sin recalcular pagos", () => {
  assert.match(page, /getResumenFinancieroGrupo/);
  assert.match(
    page,
    /getResumenFinancieroGrupo\(detalle!\.grupoFacturaId\)/,
  );

  assert.match(view, /resumenFinanciero\.pago\.estado/);
  assert.match(view, /resumenFinanciero\.pago\.pagado/);
  assert.match(view, /resumenFinanciero\.pago\.saldo/);
  assert.match(view, /Pagado acumulado/);
  assert.match(view, /Saldo/);

  assert.doesNotMatch(
    view,
    /resumenFinanciero\.sustentosActivos\.reduce\(/,
  );
});

test("Ver OP separa sustentos activos observados y anulados", () => {
  assert.match(view, /resumenFinanciero\.sustentosActivos/);
  assert.match(view, /resumenFinanciero\.sustentosObservados/);
  assert.match(view, /resumenFinanciero\.sustentosAnulados/);

  assert.match(view, /Sustentos de pago activos/);
  assert.match(view, /Sustentos observados/);
  assert.match(view, /Sustentos anulados/);
});

test("Ver OP previsualiza sustentos financieros por archivoId", () => {
  assert.match(view, /item\.archivoId/);
  assert.match(
    view,
    /<PreviewDocumento\s+archivoId=\{previewPago\.archivoId\}/s,
  );
});

test("Ver OP permite adjuntar otro pago mientras backend no marque COMPLETO", () => {
  assert.match(
    view,
    /resumenFinanciero\.pago\.estado !== "COMPLETO"/,
  );

  assert.match(
    view,
    /\/finanzas\/ordenes-pago\/\$\{encodeURIComponent\(/,
  );

  assert.match(view, /\/adjuntar-pago/);
  assert.match(view, /Adjuntar otro pago/);
  assert.match(view, /Adjuntar sustento de pago/);
});

test("Ver OP mantiene pago separado de estadoRegularizacion", () => {
  assert.match(view, /detalle\.estadoRegularizacion/);
  assert.match(view, /resumenFinanciero\.pago\.estado/);

  assert.doesNotMatch(
    view,
    /estadoRegularizacion\s*=\s*resumenFinanciero\.pago\.estado/,
  );
});

test("Bandeja conserva Ver y Adjuntar como navegación", () => {
  assert.match(bandeja, /\/ver/);
  assert.match(bandeja, /\/adjuntar-pago/);
  assert.doesNotMatch(
    bandeja,
    /\/ver\?accion=editar/,
  );
});

test("OC/OS conserva sus rutas existentes", () => {
  assert.match(
    bandeja,
    /\/finanzas\/\$\{expId\}\/ver/,
  );
  assert.match(
    bandeja,
    /\/finanzas\/\$\{expId\}\/editar\?grupoFacturaId=/,
  );
});

/* R28-P7 — V01-V11 Ver OP visual convergence */

function numeroVisible(numero, ordenPagoId) {
  const normalizado = String(numero ?? "").trim();
  return normalizado || `OP-${ordenPagoId}`;
}

test("V01-V04 numero persistido tiene prioridad y fallback OP-id queda sólo para legacy", () => {
  assert.equal(numeroVisible("0000000005", 5), "0000000005");
  assert.notEqual(numeroVisible("0000000005", 5), "OP-5");
  assert.equal(numeroVisible("", 4), "OP-4");
  assert.equal(numeroVisible(null, 4), "OP-4");

  assert.match(
    view,
    /const codigoLegacy = `OP-\$\{detalle\.ordenPagoId\}`;/,
  );
  assert.match(
    view,
    /const numeroPresentacion = text\(detalle\.numero, codigoLegacy\);/,
  );
  assert.match(
    view,
    /OP \{numeroPresentacion\}/,
  );

  assert.doesNotMatch(
    view,
    /OP \{codigoLegacy\}/,
  );
  assert.doesNotMatch(
    view,
    /OP \{codigo\}/,
  );
});

test("V05-V06 Ver OP conserva route identity ordenPagoId y loader propio", () => {
  assert.match(page, /useParams<\{ ordenPagoId: string \}>/);
  assert.match(page, /getOrdenPago\(ordenPagoId\)/);
  assert.match(
    page,
    /getDocumentoEconomicoOp\(regularizadorId\)/,
  );
  assert.match(
    page,
    /getGrupoFacturaDocumentosV2\(detalle!\.grupoFacturaId\)/,
  );

  assert.doesNotMatch(view, /detalle\.expedienteId/);
});

test("V07 OP permanece como documento principal", () => {
  assert.match(view, /<CardTitle>Orden de Pago<\/CardTitle>/);
  assert.match(
    view,
    /Documento principal/,
  );
  assert.match(
    view,
    /<span className="truncate font-semibold">\s*OP \{numeroPresentacion\}\s*<\/span>/s,
  );
});

test("V08 documento económico permanece separado del principal", () => {
  const principal = view.indexOf("Documento principal");
  const regularizador = view.indexOf("Documento económico");

  assert.ok(principal >= 0);
  assert.ok(regularizador > principal);

  assert.match(
    view,
    /new Set\(\["FACTURA", "RECIBO_HONORARIO"\]\)/,
  );
  assert.match(
    view,
    /tipo === "RECIBO_HONORARIO" \? "RECIBO POR HONORARIOS" : "FACTURA"/,
  );
});

test("V09 elimina el bloque redundante sin quitar pagos o el documento económico", () => {
  assert.doesNotMatch(view, /Sustento de la orden/);
  assert.match(view, /Documento económico/);
  assert.match(view, /sustentosActivos/);
  assert.match(view, /resumen\.archivoId/);
});

test("V10 estado de regularización permanece visible y autoritativo", () => {
  assert.match(
    view,
    /const estadoRegularizacion = text\(\s*detalle\.estadoRegularizacion,\s*"—",?\s*\)/s,
  );
  assert.match(view, /\{estadoRegularizacion\}/);
  assert.match(view, /Estado regularización/);
});

test("V11 Ver OP conserva estructura visual de familia Finanzas", () => {
  assert.match(
    view,
    /<main className="space-y-4">/,
  );
  assert.match(
    view,
    /grid gap-4 lg:grid-cols-\[minmax\(0,2fr\)_minmax\(0,3fr\)\]/,
  );
  assert.match(view, /<CardHeader className="pb-2">/);
  assert.match(view, /<CardContent className="space-y-3">/);
  assert.match(
    view,
    /<Badge variant="outline">Orden de pago<\/Badge>/,
  );

  assert.doesNotMatch(view, /detalle\.expedienteId/);
});

// Execute the actual presentation/selection functions without HTTP or database access.
const vm = require('node:vm');
const ts = require('typescript');
function viewFunction(name) {
  const tree = ts.createSourceFile('view.tsx', view, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = ['asRecord', 'text', 'nestedRecord', 'documentoSources', 'pickFromSources', 'tipoEconomico', 'seleccionarRegularizadorActivo', 'documentoEconomicoResumen'];
  const code = tree.statements.filter(n => ts.isFunctionDeclaration(n) && names.includes(n.name?.text)).map(n => n.getText(tree).replace(/^export /, '')).join('\n');
  return vm.runInNewContext(ts.transpileModule(code + '\nresult = '+name, {compilerOptions: {target: ts.ScriptTarget.ES2021}}).outputText, {});
}
const selectActive = viewFunction('seleccionarRegularizadorActivo');
const economicSummary = viewFunction('documentoEconomicoResumen');
const invoice = {documentoId: 42, estado: 'activo', tipoRelacion: 'regularizador_factura', documento: {tipo_documental: 'FACTURA', estado: 'activo', serie: 'F001', numero: '123', razon_social_emisor: 'Emisor fixture', ruc_emisor: '20123456789', fecha_emision: '2026-10-20', monto_total: '25', moneda: 'PEN'}, archivoId: 84};
test('documento económico uses only active regularizer links, never arbitrary invoices', () => {
  assert.equal(selectActive([]), null);
  assert.equal(selectActive([{...invoice, tipoRelacion: 'adjunto_factura'}]), null);
  for (const estado of ['anulado', 'observado']) {
    assert.equal(selectActive([{...invoice, estado}]), null);
    assert.equal(selectActive([{...invoice, documento: {...invoice.documento, estado}}]), null);
  }
  assert.equal(selectActive([invoice]), invoice);
  assert.equal(selectActive([invoice, {...invoice, documentoId: 43}]), null);
});
test('Factura displays its identity, issuer, amount and own file', () => {
  const result = economicSummary(invoice);
  assert.equal(result.numero, 'F001-123');
  assert.equal(result.emisor, 'Emisor fixture');
  assert.equal(result.ruc, '20123456789');
  assert.equal(result.fecha, '2026-10-20');
  assert.equal(result.monto, '25');
  assert.equal(result.moneda, 'PEN');
  assert.equal(result.archivoId, 84);
});
test('RH uses the associated receipt and its issuer name', () => {
  const rh = {...invoice, tipoRelacion: 'regularizador_recibo_honorario', documento: {...invoice.documento, tipo_documental: 'RECIBO_HONORARIO', razon_social_emisor: 'Persona fixture'}};
  assert.equal(selectActive([rh]), rh);
  assert.equal(economicSummary(rh).label, 'RECIBO POR HONORARIOS');
  assert.equal(economicSummary(rh).emisor, 'Persona fixture');
});
test('missing economic file preserves data without borrowing an old or principal file', () => {
  const missing = {...invoice, archivoId: null, metadata: {archivoId: 999}};
  const result = economicSummary(missing);
  assert.equal(result.archivoId, null);
  assert.equal(result.numero, 'F001-123');
  assert.equal(result.emisor, 'Emisor fixture');
});

test("vista utiliza concepto/clasificación y nunca tipo/subtipo legacy", () => {
  assert.match(view, /label="Concepto" value=\{text\(detalle\.conceptoNombre, "Sin concepto asociado"\)\}/);
  assert.match(view, /label="Clasificación" value=\{text\(detalle\.conceptoClasificacion, "—"\)\}/);
  assert.doesNotMatch(view, /detalle\.tipo\b|detalle\.subtipo\b|label="Tipo"|label="Subtipo"/);
});
