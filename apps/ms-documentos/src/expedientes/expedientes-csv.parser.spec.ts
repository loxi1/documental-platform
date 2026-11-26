import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  parseExpedientesCsv,
  ExpedientesCsvError,
  EXPEDIENTES_CSV_LIMITS,
} from './expedientes-csv.parser';

const header = 'codigo_expediente,descripcion\n';

const parse = (text: string) =>
  parseExpedientesCsv(Buffer.from(text, 'utf8'));

function rejectsCsv(text: string, code: string) {
  assert.throws(
    () => parse(text),
    (error) =>
      error instanceof ExpedientesCsvError &&
      error.code === code,
  );
}

test('preserva ceros iniciales', () => {
  const result = parse(header + '000123,ADMINISTRACION\n');

  assert.equal(result.rows[0].codigo_expediente, '000123');
  assert.equal(result.totalRegistros, 1);
});

test('Unicode y caracteres especiales', () => {
  const result = parse(
    header + '01,"DISEÑO, INGENIERÍA; O\'BRIEN Ñ"\n',
  );

  assert.equal(
    result.rows[0].descripcion,
    "DISEÑO, INGENIERÍA; O'BRIEN Ñ",
  );
});

test('comillas escapadas', () => {
  const result = parse(header + '01,"PROYECTO ""A"""\n');

  assert.equal(result.rows[0].descripcion, 'PROYECTO "A"');
});

test('UTF8 BOM y CRLF', () => {
  const result = parse(
    '\uFEFFcodigo_expediente,descripcion\r\n01,PRUEBA\r\n',
  );

  assert.equal(result.totalRegistros, 1);
});

test('campo entrecomillado multilínea', () => {
  const result = parse(header + '01,"LINEA 1\nLINEA 2"\n');

  assert.equal(result.rows[0].descripcion, 'LINEA 1\nLINEA 2');
});

test('último registro sin salto de línea', () => {
  assert.equal(parse(header + '01,PRUEBA').totalRegistros, 1);
});

test('consolida duplicados idénticos', () => {
  const result = parse(header + '01,PRUEBA\n01,PRUEBA\n');

  assert.equal(result.rows.length, 1);
  assert.equal(result.totalRegistros, 2);
  assert.equal(result.registrosDuplicadosCsv, 1);
});

test('rechaza duplicados contradictorios', () => {
  rejectsCsv(
    header + '01,PRUEBA A\n01,PRUEBA B\n',
    'CSV_CONFLICTING_DUPLICATE',
  );
});

test('rechaza código vacío', () => {
  rejectsCsv(header + ',PRUEBA\n', 'CSV_INVALID_CODE');
});

test('rechaza código demasiado largo', () => {
  rejectsCsv(
    header + '1'.repeat(51) + ',PRUEBA\n',
    'CSV_INVALID_CODE',
  );
});

test('rechaza descripción vacía', () => {
  rejectsCsv(header + '01,\n', 'CSV_INVALID_DESCRIPTION');
});

test('rechaza descripción demasiado larga', () => {
  rejectsCsv(
    header + '01,' + 'A'.repeat(2001),
    'CSV_INVALID_DESCRIPTION',
  );
});

test('rechaza encabezados incorrectos', () => {
  rejectsCsv('codigo,nombre\n01,PRUEBA', 'CSV_INVALID_HEADER');
});

test('rechaza columnas adicionales', () => {
  rejectsCsv(header + '01,PRUEBA,EXTRA', 'CSV_INVALID_COLUMNS');
});

test('rechaza columnas faltantes', () => {
  rejectsCsv(header + '01', 'CSV_INVALID_COLUMNS');
});

test('rechaza comillas sin cerrar', () => {
  rejectsCsv(header + '01,"PRUEBA', 'CSV_UNCLOSED_QUOTE');
});

test('rechaza contenido después de comillas', () => {
  rejectsCsv(header + '01,"PRUEBA"x', 'CSV_INVALID_QUOTE');
});

test('rechaza caracteres NUL', () => {
  rejectsCsv(header + '01,PRUEBA\0', 'CSV_INVALID_CHARACTER');
});

test('rechaza UTF8 inválido', () => {
  assert.throws(
    () => parseExpedientesCsv(Buffer.from([0xc3, 0x28])),
    (error) => error instanceof ExpedientesCsvError && error.code === 'CSV_INVALID_UTF8',
  );
});

test('rechaza archivo sin registros', () => {
  rejectsCsv(header, 'CSV_NO_ROWS');
});

test('rechaza archivo superior a 2 MiB', () => {
  assert.throws(
    () => parseExpedientesCsv(
      Buffer.alloc(EXPEDIENTES_CSV_LIMITS.maxBytes + 1),
    ),
    (error) => error instanceof ExpedientesCsvError && error.code === 'CSV_TOO_LARGE',
  );
});

test('rechaza más de 10000 registros', () => {
  const rows = Array.from(
    { length: 10001 },
    (_, i) => `${i},PRUEBA`,
  ).join('\n');

  rejectsCsv(header + rows, 'CSV_TOO_MANY_ROWS');
});

const testRealCsv = process.env.BBTI_CSV_TEST_FILE
  ? test
  : test.skip;

testRealCsv('CSV real ERP BBTI: 661 registros', () => {
  const path = process.env.BBTI_CSV_TEST_FILE;

  assert.ok(path, 'BBTI_CSV_TEST_FILE requerido');

  const result = parseExpedientesCsv(fs.readFileSync(path));

  assert.equal(result.totalRegistros, 661);
  assert.equal(result.rows.length, 661);
  assert.equal(result.registrosDuplicadosCsv, 0);

  assert.equal(
    result.rows.filter(
      (row) => row.codigo_expediente.startsWith('0'),
    ).length,
    581,
  );
});
