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
    /getDocumentoArchivos\(detalle!\.documentoId\)/,
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
    "Sustento de la orden",
    "Documento regularizador",
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
    /Sin documento regularizador asociado\./,
  );
  assert.match(
    view,
    /<PreviewDocumento archivoId=\{preview\.archivoId\}/,
  );
});

test("archivoInicial se deduplica exclusivamente por archivoId", () => {
  assert.match(
    view,
    /new Map<number, SustentoOrden>\(\)/,
  );
  assert.match(
    view,
    /!unique\.has\(inicial\.archivoId\)/,
  );
});

test("principal lógico no fabrica PreviewDocumento", () => {
  const component = view.slice(
    view.indexOf("export function OrdenPagoVerView"),
  );
  const jsx = component.slice(component.indexOf("  return ("));
  const principal = jsx.split(
    "Sustento de la orden",
  )[0];

  assert.doesNotMatch(principal, /<PreviewDocumento/);
});

test("Ver OP no incorpora cálculo de pagos", () => {
  for (const forbidden of [
    "Pagado acumulado",
    "Saldo",
    "adjunto_transferencia",
  ]) {
    assert.equal(
      view.toLowerCase().includes(forbidden.toLowerCase()),
      false,
    );
  }
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
    /getDocumentoArchivos\(detalle!\.documentoId\)/,
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
  const regularizador = view.indexOf("Documento regularizador");

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

test("V09 archivos y sustentos de la orden permanecen separados del documento económico", () => {
  const sustento = view.indexOf("Sustento de la orden");
  const regularizador = view.indexOf("Documento regularizador");

  assert.ok(sustento >= 0);
  assert.ok(regularizador > sustento);

  assert.match(
    view,
    /const unique = new Map<number, SustentoOrden>\(\);/,
  );
  assert.match(
    view,
    /!unique\.has\(inicial\.archivoId\)/,
  );
  assert.match(
    view,
    /Sin sustento inicial asociado a la orden\./,
  );
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
