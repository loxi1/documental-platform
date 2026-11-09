const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const componentPath = path.join(__dirname, 'AlmacenBandeja.tsx');

test('Almacén no vuelve a filtrar por texto los resultados del backend', () => {
  const source = fs.readFileSync(componentPath, 'utf8');

  const file = ts.createSourceFile(
    componentPath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  assert.equal(
    file.parseDiagnostics.length,
    0,
    'El componente debe conservar sintaxis TSX válida'
  );

  const filteredRowsDeclarations = [];

  function visit(node) {
    if (ts.isVariableDeclaration(node) &&
        node.name.getText(file) === 'filteredRows') {
      filteredRowsDeclarations.push(node);
    }

    ts.forEachChild(node, visit);
  }

  visit(file);

  assert.equal(
    filteredRowsDeclarations.length,
    1,
    'Debe existir una única declaración de filteredRows'
  );

  const declaration = filteredRowsDeclarations[0];

  assert.ok(
    declaration.initializer &&
    ts.isIdentifier(declaration.initializer) &&
    declaration.initializer.text === 'rows',
    'Las filas del backend no deben pasar por un segundo filtro textual'
  );
});
