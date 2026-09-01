import assert from 'node:assert/strict';
import test from 'node:test';

import { parseCommand } from '../cli.js';

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
