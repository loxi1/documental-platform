const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "../..");

const reg = fs.readFileSync(
  path.join(__dirname, "RegularizarOrdenPagoModal.tsx"),
  "utf8",
);
const bandeja = fs.readFileSync(
  path.join(__dirname, "FinanzasBandeja.tsx"),
  "utf8",
);
const edit = fs.readFileSync(
  path.join(__dirname, "EditarOrdenPagoModal.tsx"),
  "utf8",
);
const services = fs.readFileSync(
  path.join(root, "services/finanzas.ts"),
  "utf8",
);

function visibility(estado, permitidos) {
  const supported = ["FACTURA", "RECIBO_HONORARIO"];
  const frozen = new Set(
    permitidos.map(value => String(value).trim().toUpperCase()),
  );
  const operational = supported.filter(tipo => frozen.has(tipo));

  return estado === "PENDIENTE" && operational.length > 0;
}

/* R28-P5 — T02-T17, T20 */

test("T02 Editar desde Bandeja abre modal directo", () => {
  assert.match(bandeja, /async function abrirEditarOp\(ordenPagoId: number\)/);
  assert.match(bandeja, /setEditarOpOpen\(true\)/);
  assert.match(bandeja, /<EditarOrdenPagoModal/);
  assert.match(
    bandeja,
    /onClick=\{\(\) =>\s*void abrirEditarOp\(Number\(op\.ordenPagoId\)\)/,
  );
});

test("T03 Editar desde Bandeja no usa /ver?accion=editar", () => {
  assert.doesNotMatch(bandeja, /\/ver\?accion=editar/);
});

test("UX04 Editar OP usa numero persistido read-only y fallback legacy de presentacion", () => {
  assert.match(
    edit,
    /String\(ordenPago\.numero \?\? ""\)\.trim\(\)\s*\|\|\s*`OP-\$\{ordenPago\.ordenPagoId\}`/,
  );
  assert.match(edit, /\{numeroPresentacion\}/);

  const payload = edit.slice(
    edit.indexOf("function buildPayload"),
    edit.indexOf("function validate"),
  );

  assert.doesNotMatch(payload, /\.numero\s*=/);
  assert.doesNotMatch(payload, /numeroPresentacion/);
});


/* R28-P5 — B01-B15 Bandeja identidad / origen / estado */

test("B01-B04 OP muestra tipo y numero autoritativo sin fabricar identidad visual", () => {
  const opBranchStart = bandeja.indexOf("if (itemRecord(item).origen === 'ORDEN_PAGO')");
  const historicBranchStart = bandeja.indexOf("const expId = expedienteId(item)", opBranchStart);
  const opBranch = bandeja.slice(opBranchStart, historicBranchStart);

  assert.ok(opBranchStart >= 0);
  assert.ok(historicBranchStart > opBranchStart);
  assert.match(opBranch, /<DocumentoRegularizadorOpCell/);
  assert.match(opBranch, /\{text\(op\.numero\)\}/);
  assert.doesNotMatch(
    opBranch,
    /\{`OP-\$\{op\.ordenPagoId\}`\}/,
  );
});

test("B05 historico conserva Factura y numero", () => {
  assert.match(bandeja, /<FacturaCell item=\{item\} \/>/);
  assert.match(bandeja, /function facturaNumero\(item: RevisionContableItem\)/);
});

test("B06-B08 Origen reemplaza OC\\/OS, historico usa principal y OP no duplica numero", () => {
  assert.match(bandeja, />Origen<\/th>/);
  assert.doesNotMatch(bandeja, />OC\/OS<\/th>/);
  assert.match(bandeja, /<PrincipalCell item=\{item\} \/>/);

  const opBranchStart = bandeja.indexOf("if (itemRecord(item).origen === 'ORDEN_PAGO')");
  const historicBranchStart = bandeja.indexOf("const expId = expedienteId(item)", opBranchStart);
  const opBranch = bandeja.slice(opBranchStart, historicBranchStart);

  assert.ok(opBranchStart >= 0);
  assert.ok(historicBranchStart > opBranchStart);
  assert.match(opBranch, /<DocumentoRegularizadorOpCell/);
  assert.equal((opBranch.match(/\{text\(op\.numero\)\}/g) ?? []).length, 1);
});

test("B09-B13 Estado OP usa estadoRegularizacion e historico queda neutral", () => {
  const opBranchStart = bandeja.indexOf("if (itemRecord(item).origen === 'ORDEN_PAGO')");
  const historicBranchStart = bandeja.indexOf("const expId = expedienteId(item)", opBranchStart);
  const opBranch = bandeja.slice(opBranchStart, historicBranchStart);
  const historicBranch = bandeja.slice(historicBranchStart);

  assert.ok(opBranchStart >= 0);
  assert.ok(historicBranchStart > opBranchStart);
  assert.match(opBranch, /\{text\(op\.estadoRegularizacion\)\}/);
  assert.doesNotMatch(
    opBranch,
    /estadoRegularizacion[\s\S]*?(?:documentos_relacionados|documentosRelacionados)/,
  );
  assert.match(
    historicBranch,
    /\{String\(item\.estadoRegularizacion \?\? ""\)\.trim\(\) \|\| "—"\}/,
  );
});

test("B14 Regularizar conserva guard frozen interseccion consumers", () => {
  assert.match(
    bandeja,
    /String\(detalle\.estadoRegularizacion \?\? ""\)\.trim\(\)\.toUpperCase\(\) !==\s*"PENDIENTE"/,
  );
  assert.match(bandeja, /tiposDocumentalesRegularizadoresPermitidos/);
  assert.match(bandeja, /operationalConsumersFrontend/);
});

test("B15 OC\\/OS funcional conserva celdas y acciones historicas", () => {
  assert.match(bandeja, /<FacturaCell item=\{item\} \/>/);
  assert.match(bandeja, /<PrincipalCell item=\{item\} \/>/);
  assert.match(bandeja, /<ActionsCell item=\{item\} \/>/);
});

test("T04 PENDIENTE + snapshot FACTURA habilita Regularizar", () => {
  assert.equal(visibility("PENDIENTE", ["FACTURA"]), true);
});

test("T05 PENDIENTE + snapshot RH habilita Regularizar", () => {
  assert.equal(
    visibility("PENDIENTE", ["RECIBO_HONORARIO"]),
    true,
  );
});

test("T06 PENDIENTE + FACTURA/RH conserva ambos consumers", () => {
  assert.equal(
    visibility(
      "PENDIENTE",
      ["FACTURA", "RECIBO_HONORARIO"],
    ),
    true,
  );

  assert.match(
    reg,
    /type RegularizadorOperativo = "FACTURA" \| "RECIBO_HONORARIO"/,
  );
  assert.match(
    reg,
    /const SUPPORTED_REGULARIZERS:\s*(?:readonly\s+)?RegularizadorOperativo\[\]\s*=\s*\[\s*"FACTURA",\s*"RECIBO_HONORARIO",?\s*\]/,
  );
});

test("T07 PENDIENTE con tipo no soportado no muestra Regularizar", () => {
  assert.equal(visibility("PENDIENTE", ["OTRO_DOCUMENTO"]), false);

  assert.match(
    bandeja,
    /operationalConsumersFrontend/,
  );
  assert.match(
    bandeja,
    /tiposDocumentalesRegularizadoresPermitidos/,
  );
});

test("T08 NO_REQUIERE no muestra Regularizar", () => {
  assert.equal(
    visibility("NO_REQUIERE", ["FACTURA", "RECIBO_HONORARIO"]),
    false,
  );
});

test("T09 REGULARIZADO no muestra Regularizar ordinario", () => {
  assert.equal(
    visibility("REGULARIZADO", ["FACTURA", "RECIBO_HONORARIO"]),
    false,
  );
});

test("T10 FACTURA conserva flujo operacional TEMP -> materialización -> A7F", () => {
  assert.match(reg, /subirArchivoInicialOrdenPago/);
  assert.match(reg, /materializarFacturaTemporalOrdenPago/);
  assert.match(reg, /regularizarOrdenPagoFactura/);

  const materializar = reg.indexOf(
    "materializarFacturaTemporalOrdenPago(",
  );
  const asociar = reg.indexOf(
    "regularizarOrdenPagoFactura(",
    materializar,
  );

  assert.ok(materializar >= 0 && asociar > materializar);
});

test("T11 RH usa identidad canónica RECIBO_HONORARIO", () => {
  assert.match(reg, /"RECIBO_HONORARIO"/);
  assert.match(
    services,
    /materializarReciboHonorarioTemporalOrdenPago/,
  );
  assert.match(
    services,
    /materializar-recibo-honorario-op/,
  );
  assert.match(
    services,
    /regularizarOrdenPagoReciboHonorario/,
  );
  assert.match(
    services,
    /regularizar-recibo-honorario/,
  );
});

test("T12 RH conserva identidad propia y A7F propio", () => {
  const rhMaterializer = reg.indexOf(
    ": await materializarReciboHonorarioTemporalOrdenPago(",
  );
  const canonicalId = reg.indexOf(
    "documentoId = Number(materializada.documentoId)",
    rhMaterializer,
  );

  assert.ok(rhMaterializer >= 0);
  assert.ok(canonicalId > rhMaterializer);

  const rhMaterializationFlow = reg.slice(
    rhMaterializer,
    canonicalId,
  );

  for (const field of [
    "rucEmisor",
    "serie",
    "numero",
    "fechaEmision",
    "moneda",
    "montoTotal",
  ]) {
    assert.match(
      rhMaterializationFlow,
      new RegExp(
        `reciboHonorario\\.${field}(?:\\.trim\\(\\))?`,
      ),
    );
  }

  assert.doesNotMatch(
    rhMaterializationFlow,
    /rucProveedor:\s*factura/,
  );
  assert.doesNotMatch(
    rhMaterializationFlow,
    /proveedor:\s*factura/,
  );
  assert.doesNotMatch(
    rhMaterializationFlow,
    /materializarFacturaTemporalOrdenPago/,
  );

  assert.match(
    reg,
    /if \(tipoSeleccionado === "FACTURA"\) \{\s*await regularizarOrdenPagoFactura\(\s*ordenPago\.grupoFacturaId,\s*documentoId,\s*\);\s*\} else \{\s*await regularizarOrdenPagoReciboHonorario\(\s*ordenPago\.grupoFacturaId,\s*documentoId,\s*\);/s,
  );

  assert.match(
    services,
    /materializarReciboHonorarioTemporalOrdenPago/,
  );
  assert.match(
    services,
    /materializar-recibo-honorario-op/,
  );
  assert.match(
    services,
    /regularizarOrdenPagoReciboHonorario/,
  );
  assert.match(
    services,
    /regularizar-recibo-honorario/,
  );
});

test("T13 claveDocumental permanece oculta y no editable", () => {
  assert.doesNotMatch(reg, /claveDocumental/);
});

test("T14 Regularizar muestra sustentos de pago sólo como referencia", () => {
  assert.match(reg, /Sustentos de pago/);
  assert.match(reg, /sustento\.banco/);
  assert.match(reg, /sustento\.operacion/);
  assert.match(reg, /sustento\.moneda/);
  assert.match(reg, /sustento\.monto/);

  assert.doesNotMatch(
    reg,
    /adjuntarPago|editarPago|guardarPago|eliminarPago/,
  );
});

test("T15 éxito refresca autoridad y permanece en la misma Bandeja", () => {
  assert.match(reg, /await onCompleted\?\.\(\)/);
  assert.match(
    bandeja,
    /async function refrescarDespuesDeAccionOp\(\)/,
  );
  assert.match(bandeja, /await refetch\(\)/);

  const refresh = bandeja.slice(
    bandeja.indexOf("async function refrescarDespuesDeAccionOp()"),
    bandeja.indexOf("return (", bandeja.indexOf(
      "async function refrescarDespuesDeAccionOp()",
    )),
  );

  assert.doesNotMatch(refresh, /router\.push|router\.replace/);
});

test("T16 Adjuntar pago permanece como flujo independiente por página", () => {
  assert.match(bandeja, /\/adjuntar-pago/);
  assert.doesNotMatch(reg, /adjuntar-pago/);
});

test("T17 OC/OS no recibe acción Regularizar", () => {
  assert.match(
    bandeja,
    /\/finanzas\/\$\{expId\}\/ver/,
  );
  assert.match(
    bandeja,
    /\/finanzas\/\$\{expId\}\/editar\?grupoFacturaId=/,
  );

  assert.match(
    bandeja,
    /function puedeRegularizarOp\(detalle: OrdenPagoDetalle \| undefined\)/,
  );
  assert.match(
    bandeja,
    /async function abrirRegularizarOp\(ordenPagoId: number\)/,
  );
  assert.match(
    bandeja,
    /\{puedeRegularizarOp\(\s*opDetallePorId\[Number\(op\.ordenPagoId\)\],?\s*\) \? \(/,
  );
  assert.match(
    bandeja,
    /void abrirRegularizarOp\(\s*Number\(op\.ordenPagoId\),?\s*\)/,
  );
});

test("T20 contratos antiguos FACTURA-only y Editar-vía-Ver fueron retirados", () => {
  assert.doesNotMatch(bandeja, /\/ver\?accion=editar/);

  assert.match(
    services,
    /materializarFacturaTemporalOrdenPago/,
  );
  assert.match(
    services,
    /regularizarOrdenPagoFactura/,
  );
  assert.match(
    services,
    /materializarReciboHonorarioTemporalOrdenPago/,
  );
  assert.match(
    services,
    /regularizarOrdenPagoReciboHonorario/,
  );

  assert.match(
    reg,
    /tipoEsperado: tipoSeleccionado/,
  );
});

/* R28-P7 — E01-E07 Editar OP visual convergence */

test("E01 Editar OP conserva apertura como modal directo desde Bandeja", () => {
  assert.match(bandeja, /<EditarOrdenPagoModal/);
  assert.match(bandeja, /setEditarOpOpen\(true\)/);
  assert.doesNotMatch(bandeja, /\/ver\?accion=editar/);
});

test("E02-E03 Editar OP presenta numero persistido con fallback legacy y no lo edita", () => {
  assert.match(
    edit,
    /String\(ordenPago\.numero \?\? ""\)\.trim\(\)\s*\|\|\s*`OP-\$\{ordenPago\.ordenPagoId\}`/,
  );
  assert.match(
    edit,
    /\{numeroPresentacion\}\s*·\s*\{ordenPago\.contexto\.codigo\}/,
  );

  const payload = edit.slice(
    edit.indexOf("function buildPayload"),
    edit.indexOf("function validate"),
  );

  assert.doesNotMatch(payload, /\.numero\s*=/);
  assert.doesNotMatch(payload, /numeroPresentacion/);
});

test("E04 Editar OP conserva flujo de guardado y refresh", () => {
  assert.match(
    edit,
    /await editarOrdenPago\(\s*currentOrdenPago\.ordenPagoId,\s*buildPayload\(\),?\s*\)/s,
  );
  assert.match(edit, /await onCompleted\?\.\(\)/);
  assert.match(edit, /onClose\(\)/);
});

test("E05 Editar OP conserva replacement TEMP sin OCR", () => {
  assert.match(edit, /await subirArchivoInicialOrdenPago\(/);
  assert.match(edit, /await reemplazarArchivoInicialOrdenPago\(/);
  assert.match(edit, /currentOrdenPago\.ordenPagoId/);

  const submitStart = edit.indexOf("async function submit()");
  const returnStart = edit.indexOf("  return (", submitStart);
  const submitFlow = edit.slice(submitStart, returnStart);

  assert.match(
    submitFlow,
    /Deliberadamente NO se ejecuta OCR/,
  );
  assert.doesNotMatch(
    submitFlow,
    /(?:ejecutar|procesar|solicitar|iniciar|run|request)[A-Za-z0-9_]*OCR\s*\(/i,
  );
});

test("E06 Editar OP preserva campos funcionales autorizados", () => {
  for (const token of [
    "fechaEmision",
    "monto",
    "moneda",
    "observacion",
    "periodoAnio",
    "periodoMes",
    "codigoPago",
    "conceptoCodigo",
    "beneficiario",
  ]) {
    assert.match(edit, new RegExp(token));
  }

  assert.match(edit, /ref=\{fechaInput\}/);
  assert.match(edit, /ref=\{periodoInput\}/);
});

test("E07 Editar OP reutiliza estrictamente la composición estructural de Crear", () => {
  assert.match(
    edit,
    /w-\[min\(95vw,760px\)\][^"]*rounded-xl[^"]*border[^"]*bg-background[^"]*p-6[^"]*shadow-xl/,
  );
  assert.doesNotMatch(edit, /overflow-y-auto/);

  assert.match(
    edit,
    /<form[\s\S]*className="space-y-3"/,
  );
  assert.match(
    edit,
    /<fieldset disabled=\{busy\} className="space-y-3">/,
  );

  const grids = edit.match(
    /grid grid-cols-1 gap-3 md:grid-cols-2/g,
  ) ?? [];
  assert.ok(
    grids.length >= 4,
    `se esperaban al menos 4 grids del patrón Crear; encontrados=${grids.length}`,
  );

  assert.doesNotMatch(edit, />\s*Datos de la orden\s*</);
  assert.doesNotMatch(edit, />\s*Datos de obligación\s*</);
  assert.doesNotMatch(edit, /<section/);
  assert.doesNotMatch(
    edit,
    /<footer className="mt-4 flex flex-wrap items-center justify-between gap-3">/,
  );

  assert.match(edit, />Archivo inicial \/ sustento</);

  assert.match(
    edit,
    /Número documental: \{numeroPresentacion\}/,
  );
  assert.match(edit, /Guardar cambios/);
  assert.match(edit, />\s*Cerrar\s*</s);

  assert.match(
    edit,
    /String\(ordenPago\.numero \?\? ""\)\.trim\(\)\s*\|\|\s*`OP-\$\{ordenPago\.ordenPagoId\}`/,
  );
});
