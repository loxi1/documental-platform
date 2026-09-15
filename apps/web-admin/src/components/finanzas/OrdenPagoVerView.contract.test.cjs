const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "../..");
const view = fs.readFileSync(path.join(__dirname, "OrdenPagoVerView.tsx"), "utf8");
const page = fs.readFileSync(path.join(root, "app/finanzas/ordenes-pago/[ordenPagoId]/ver/page.tsx"), "utf8");
const bandeja = fs.readFileSync(path.join(__dirname, "FinanzasBandeja.tsx"), "utf8");

test("ruta usa ordenPagoId y getOrdenPago", () => {
  assert.match(page, /useParams<\{ ordenPagoId: string \}>/);
  assert.match(page, /getOrdenPago\(ordenPagoId\)/);
});

test("documentoId de OP alimenta getDocumentoArchivos", () => {
  assert.match(page, /getDocumentoArchivos\(detalle!\.documentoId\)/);
});

test("grupoFacturaId alimenta getGrupoFacturaDocumentosV2", () => {
  assert.match(page, /getGrupoFacturaDocumentosV2\(detalle!\.grupoFacturaId\)/);
});

test("solo FACTURA y RECIBO_HONORARIO califican como económico", () => {
  assert.match(view, /new Set\(\["FACTURA", "RECIBO_HONORARIO"\]\)/);
  assert.doesNotMatch(view, /TIPOS_ECONOMICOS.*TRANSFERENCIA/);
});

test("estado vacío de documento económico está presente", () => {
  assert.match(view, /Sin documento económico asociado\./);
});

test("preview usa PreviewDocumento por archivoId", () => {
  assert.match(view, /<PreviewDocumento archivoId=\{preview\.archivoId\}/);
});

test("archivoInicial se deduplica exclusivamente por archivoId", () => {
  assert.match(view, /new Map<number, SustentoOrden>\(\)/);
  assert.match(view, /!unique\.has\(inicial\.archivoId\)/);
});

test("principal lógico no tiene acción Ver ni PreviewDocumento", () => {
  const principal = view.split("Documentos de la Orden de Pago")[0];
  assert.doesNotMatch(principal, /<PreviewDocumento/);
  assert.doesNotMatch(principal, />Ver</);
});

test("vista no contiene semántica de pagos", () => {
  for (const forbidden of ["Pagado acumulado", "Saldo", "sustentos de pago", "voucher", "adjunto_transferencia"]) {
    assert.equal(view.toLowerCase().includes(forbidden.toLowerCase()), false);
  }
});

test("bandeja activa Ver OP, preserva Editar disabled y Adjuntar", () => {
  assert.match(bandeja, /ordenes-pago\/\$\{encodeURIComponent\([\s\S]*\)\/ver/);
  assert.match(bandeja, /disabled>\s*Editar\s*<\/Button>/);
  assert.match(bandeja, /\/adjuntar-pago/);
});

test("acciones OC\/OS siguen usando sus rutas existentes", () => {
  assert.match(bandeja, /\/finanzas\/\$\{expId\}\/ver/);
  assert.match(bandeja, /\/finanzas\/\$\{expId\}\/editar\?grupoFacturaId=/);
});
