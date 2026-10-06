import assert from 'node:assert/strict';
import test from 'node:test';

import { parseCliArguments, parseCommand } from '../cli.js';

test('acepta verify', () => {
  assert.equal(parseCommand('verify'), 'verify');
});

test('acepta status', () => {
  assert.equal(parseCommand('status'), 'status');
});

test('acepta migrate', () => {
  assert.equal(parseCommand('migrate'), 'migrate');
});

test('rechaza comandos desconocidos', () => {
  assert.throws(
    () => parseCommand('force'),
    /Comando inválido/,
  );
});

test('rechaza comando ausente', () => {
  assert.throws(
    () => parseCommand(undefined),
    /Comando inválido/,
  );
});


test('parsea migrate con target exacto', () => {
  assert.deepEqual(
    parseCliArguments(['migrate', '--target', '0020']),
    {
      command: 'migrate',
      targetVersion: '0020',
    },
  );
});

test('migrate sin target preserva comportamiento historico', () => {
  assert.deepEqual(
    parseCliArguments(['migrate']),
    { command: 'migrate' },
  );
});

test('rechaza target con formato no exacto', () => {
  for (const value of ['20', '0020x', 'latest', '0019-0020']) {
    assert.throws(
      () =>
        parseCliArguments([
          'migrate',
          '--target',
          value,
        ]),
      /TARGET_VERSION inválido/,
    );
  }
});

test('rechaza target en comandos distintos de migrate', () => {
  assert.throws(
    () =>
      parseCliArguments([
        'status',
        '--target',
        '0020',
      ]),
    /Argumentos inválidos/,
  );
});
