export const EXPEDIENTES_CSV_LIMITS = {
  maxBytes: 2 * 1024 * 1024,
  maxRows: 10_000,
  maxCodigo: 50,
  maxDescripcion: 2_000,
} as const;

export interface ExpedienteCsvRow {
  codigo_expediente: string;
  descripcion: string;
}

export interface ExpedientesCsvResult {
  rows: ExpedienteCsvRow[];
  totalRegistros: number;
  registrosDuplicadosCsv: number;
}

export class ExpedientesCsvError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly row?: number,
  ) {
    super(message);
    this.name = 'ExpedientesCsvError';
  }
}

function fail(
  code: string,
  message: string,
  row?: number,
): never {
  throw new ExpedientesCsvError(code, message, row);
}

export function parseExpedientesCsv(
  bytes: Uint8Array,
): ExpedientesCsvResult {
  const limits = EXPEDIENTES_CSV_LIMITS;

  if (bytes.byteLength === 0) {
    fail('CSV_EMPTY', 'El archivo CSV está vacío.');
  }

  if (bytes.byteLength > limits.maxBytes) {
    fail('CSV_TOO_LARGE', 'El CSV supera el límite de 2 MiB.');
  }

  let text: string;

  try {
    text = new TextDecoder('utf-8', {
      fatal: true,
    }).decode(bytes);
  } catch {
    fail('CSV_INVALID_UTF8', 'El archivo debe utilizar UTF-8 válido.');
  }

  if (text.includes('\0')) {
    fail('CSV_INVALID_CHARACTER', 'El CSV contiene caracteres NUL.');
  }

  const records: string[][] = [];

  let record: string[] = [];
  let field = '';
  let quoted = false;
  let closedQuote = false;

  const pushField = () => {
    record.push(field);
    field = '';
    closedQuote = false;

    if (record.length > 2) {
      fail(
        'CSV_INVALID_COLUMNS',
        'Se esperaban exactamente dos columnas.',
        records.length + 1,
      );
    }
  };

  const pushRecord = () => {
    pushField();

    if (record.length !== 2) {
      fail(
        'CSV_INVALID_COLUMNS',
        'Se esperaban exactamente dos columnas.',
        records.length + 1,
      );
    }

    records.push(record);
    record = [];

    if (records.length > limits.maxRows + 1) {
      fail(
        'CSV_TOO_MANY_ROWS',
        'El CSV supera el límite de 10 000 registros.',
      );
    }
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else {
        field += ch;
      }

      continue;
    }

    if (ch === ',') {
      pushField();
      continue;
    }

    if (ch === '\n' || ch === '\r') {
      if (ch === '\r') {
        if (text[i + 1] !== '\n') {
          fail(
            'CSV_INVALID_NEWLINE',
            'El CSV debe utilizar LF o CRLF.',
            records.length + 1,
          );
        }

        i++;
      }

      pushRecord();
      continue;
    }

    if (closedQuote) {
      fail(
        'CSV_INVALID_QUOTE',
        'Contenido inesperado después de cerrar comillas.',
        records.length + 1,
      );
    }

    if (ch === '"') {
      if (field.length !== 0) {
        fail(
          'CSV_INVALID_QUOTE',
          'Comillas inesperadas en un campo.',
          records.length + 1,
        );
      }

      quoted = true;
      continue;
    }

    field += ch;
  }

  if (quoted) {
    fail(
      'CSV_UNCLOSED_QUOTE',
      'Existe un campo con comillas sin cerrar.',
      records.length + 1,
    );
  }

  if (field.length > 0 || record.length > 0 || closedQuote) {
    pushRecord();
  }

  const header = records.shift();

  if (
    !header ||
    header[0] !== 'codigo_expediente' ||
    header[1] !== 'descripcion'
  ) {
    fail(
      'CSV_INVALID_HEADER',
      'Encabezados requeridos: codigo_expediente,descripcion.',
      1,
    );
  }

  if (records.length === 0) {
    fail('CSV_NO_ROWS', 'El CSV no contiene registros.');
  }

  const unique = new Map<string, ExpedienteCsvRow>();
  let duplicates = 0;

  for (let i = 0; i < records.length; i++) {
    const rowNumber = i + 2;

    const codigo = records[i][0].trim();
    const descripcion = records[i][1].trim();

    if (
      !codigo ||
      Array.from(codigo).length > limits.maxCodigo ||
      /[\u0000-\u001f\u007f]/u.test(codigo)
    ) {
      fail(
        'CSV_INVALID_CODE',
        'Código de expediente inválido.',
        rowNumber,
      );
    }

    if (
      !descripcion ||
      Array.from(descripcion).length > limits.maxDescripcion
    ) {
      fail(
        'CSV_INVALID_DESCRIPTION',
        'Descripción inválida.',
        rowNumber,
      );
    }

    const previous = unique.get(codigo);

    if (previous) {
      if (previous.descripcion !== descripcion) {
        fail(
          'CSV_CONFLICTING_DUPLICATE',
          `El código ${codigo} tiene descripciones diferentes.`,
          rowNumber,
        );
      }

      duplicates++;
      continue;
    }

    unique.set(codigo, {
      codigo_expediente: codigo,
      descripcion,
    });
  }

  return {
    rows: Array.from(unique.values()),
    totalRegistros: records.length,
    registrosDuplicadosCsv: duplicates,
  };
}
