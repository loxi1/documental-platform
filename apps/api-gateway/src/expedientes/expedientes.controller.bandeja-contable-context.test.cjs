const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const controllerPath = path.join(
  __dirname,
  'expedientes.controller.ts',
);

const source = fs.readFileSync(controllerPath, 'utf8');

function between(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `No se encontró: ${startMarker}`);

  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `No se encontró límite: ${endMarker}`);

  return source.slice(start, end);
}

test('bandeja-contable preserva scopedQuery y propaga contexto autenticado al proxy', () => {
  const block = between(
    "@Get('bandeja-contable')",
    "@Get('revision-contable')",
  );

  assert.match(
    block,
    /const contexto = await this\.validateAuthorization\(authorization\);/,
  );

  assert.match(
    block,
    /const scopedQuery = this\.buildWorkspaceScopedQuery\(query, contexto\);/,
  );

  assert.match(
    block,
    /path:\s*'\/expedientes\/bandeja-contable'[\s\S]*?query:\s*scopedQuery,[\s\S]*?contexto,/,
  );
});

test('proxy preserva los tres headers históricos requeridos desde contexto', () => {
  const block = between(
    'private async proxy(',
    "@ApiOperation({ summary: 'Obtener expediente por ID vía API Gateway' })",
  );

  assert.match(block, /contexto\?:\s*any;/);

  assert.match(
    block,
    /const workspaceId = Number\(params\.contexto\?\.workspaceId \?\? NaN\);/,
  );

  assert.match(
    block,
    /this\.getClienteDestinoIdFromContext\(params\.contexto\)/,
  );

  assert.match(
    block,
    /this\.getEmpresaFromContext\(params\.contexto\)/,
  );

  assert.match(
    block,
    /headers\['x-workspace-id'\]\s*=\s*String\(workspaceId\);/,
  );

  assert.match(
    block,
    /headers\['x-empresa-codigo'\]\s*=\s*empresaCodigo;/,
  );

  assert.match(
    block,
    /headers\['x-cliente-destino-id'\]\s*=\s*String\(clienteDestinoId\);/,
  );

  assert.match(
    block,
    /axios\.request\(\{[\s\S]*?headers,[\s\S]*?params:\s*params\.query,/,
  );
});
