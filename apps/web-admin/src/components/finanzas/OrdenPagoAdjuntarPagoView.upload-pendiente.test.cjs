const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "../../..");
const service = fs.readFileSync(
  path.join(root, "src/services/finanzas.ts"),
  "utf8",
);
const view = fs.readFileSync(
  path.join(root, "src/components/finanzas/OrdenPagoAdjuntarPagoView.tsx"),
  "utf8",
);

test("R4Q usa ordenPagoId para recuperar upload persistido", () => {
  assert.match(service, /getUploadPendienteOrdenPago\(ordenPagoId: number\)/);
  assert.match(
    service,
    /ordenes-pago\/\$\{encodeURIComponent\(ordenPagoId\)\}\/upload-pendiente/,
  );
  assert.match(view, /getUploadPendienteOrdenPago\(id\)/);
});


test("solo SIN_UPLOAD habilita adjuntar un nuevo sustento", () => {
  assert.match(
    view,
    /estadoRecuperacion === "SIN_UPLOAD"[\s\S]*!decisionPendienteForm[\s\S]*!procesando/,
  );
  assert.match(
    view,
    /function seleccionarNuevoSustento\(\)[\s\S]*if \(!puedeAdjuntarOtroPago\) return;[\s\S]*inputAdjuntarRef\.current\?\.click\(\)/,
  );
});


test("seleccionar archivo desde el botón dispara pipeline automáticamente", () => {
  assert.match(
    view,
    /ref=\{inputAdjuntarRef\}[\s\S]*type="file"/,
  );
  assert.match(
    view,
    /const seleccionado = event\.target\.files\?\.\[0\] \?\? null;[\s\S]*setMostrarFormulario\(true\);[\s\S]*void iniciarPipeline\(seleccionado\)/,
  );
});

test("pipeline representa carga y OCR sin segundo click", () => {
  assert.match(view, /setMensajePipeline\("Cargando archivo…"\)/);
  assert.match(view, /setMensajePipeline\("Procesando OCR…"\)/);
  assert.doesNotMatch(view, /Guardar sustento/);
});

test("archivoId persistido cambia autoridad antes de OCR", () => {
  const persisted = view.indexOf("setArchivoIdPersistido(archivoId)");
  const recovery = view.indexOf(
    "const uploadPersistido = await getUploadPendienteOrdenPago",
    persisted,
  );
  const ocr = view.indexOf(
    "const resultadoProcesamiento = await procesarArchivoOcr",
    persisted,
  );

  assert.ok(persisted > 0);
  assert.ok(recovery > persisted);
  assert.ok(ocr > recovery);
  assert.match(view, /setEstadoRecuperacion\("UPLOAD_PERSISTIDO"\)/);
});

test("primera carga abre modal automáticamente con OCR obtenido", () => {
  const getResult = view.indexOf(
    "const resultadoOcr = await getOcrResultado(resultadoId)",
  );
  const open = view.indexOf("setOcrResultado(resultadoOcr)", getResult);

  assert.ok(getResult > 0);
  assert.ok(open > getResult);
  assert.match(view, /open=\{ocrResultado !== null\}/);
});

test("reload conserva Ver y Revisar OCR manual", () => {
  assert.match(view, />\s*Ver\s*</);
  assert.match(view, />\s*Revisar OCR\s*</);
  assert.match(
    view,
    /numeroPositivo\(recuperacionUpload\?\.ocr\?\.ocrResultadoId\)/,
  );
  assert.match(view, /const resultado = await getOcrResultado\(id\)/);
});

test("Revisar OCR recuperado no reprocesa OCR", () => {
  const start = view.indexOf("async function revisarOcrRecuperado()");
  const end = view.indexOf("async function iniciarPipeline(", start);
  const handler = view.slice(start, end);

  assert.ok(start > 0 && end > start);
  assert.doesNotMatch(handler, /procesarArchivoOcr/);
});

test("formulario previo documental fue eliminado", () => {
  assert.doesNotMatch(view, /const \[fechaPago, setFechaPago\]/);
  assert.doesNotMatch(view, /const \[monto, setMonto\]/);
  assert.doesNotMatch(view, /const \[moneda, setMoneda\]/);
  assert.doesNotMatch(view, /const \[banco, setBanco\]/);
  assert.doesNotMatch(view, /const \[referencia, setReferencia\]/);
  assert.doesNotMatch(view, /Seleccionar moneda/);
  assert.doesNotMatch(view, /Seleccionar banco/);
  assert.doesNotMatch(view, /Número \/ referencia de operación/);
});

test("observación pertenece al sustento validado y no a la página OP", () => {
  assert.doesNotMatch(view, /const \[observacion, setObservacion\]/);
  assert.doesNotMatch(view, /observacion-sustento-op/);
  assert.doesNotMatch(
    view,
    /Observación complementaria del sustento \(opcional\)/,
  );
  assert.match(
    view,
    /observacion: form\.observacion\?\.trim\(\) \|\| undefined/,
  );
  assert.match(
    view,
    /\{ observacion: form\.observacion\.trim\(\) \}/,
  );
});

test("error técnico y conflicto no se convierten en SIN_UPLOAD", () => {
  assert.match(view, /setEstadoRecuperacion\("ERROR"\)/);
  assert.match(
    view,
    /La recuperación falló\. No seleccione otro archivo hasta resolver este estado\./,
  );
});

test("no usa storage navegador como autoridad", () => {
  assert.doesNotMatch(view, /localStorage/);
  assert.doesNotMatch(view, /sessionStorage/);
});
