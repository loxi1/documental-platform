jest.mock('@documental/database', () => ({ sql: jest.fn() }));
jest.mock('@documental/shared', () => ({ NatsSubjects: {} }));
import { sql } from '@documental/database';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as ts from 'typescript';
import { DocumentosRepository } from './documentos.repository';
import { DocumentosService } from './documentos.service';

// Execute the actual pure form initializer, without mounting React or using HTTP/DB.
const path = resolve(__dirname, '../../../web-admin/src/components/ocr/OcrValidationModal.tsx');
const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = source.statements.filter(ts.isFunctionDeclaration)
  .filter(node => !node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword))
  .map(node => node.getText(source)).join('\n');
const compiled = ts.transpileModule(declarations, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
}).outputText;
const initialForm = new Function(`${compiled}; return buildInitialForm;`)();

describe('OCR pendiente: editar monto y volver a leer', () => {
  it('persists 2730.02 and reconstructs it from the GET envelope on reopening', async () => {
    let stored: any = { id: 20, documento_id: 10, archivo_id: 12, estado: 'pendiente_validacion',
      tipo_propuesto: 'FACTURA', metadata: { montoTotal: '', metadata: { montoTotal: '', serie: 'F001', numero: '1' } } };
    const queries: string[] = [];
    (sql as unknown as jest.Mock).mockImplementation(async (strings: TemplateStringsArray, ...values: any[]) => {
      const query = strings.join('?').replace(/\s+/g, ' ').trim();
      queries.push(query);
      if (query.startsWith('UPDATE documentos.ocr_resultados')) {
        stored = { ...stored, estado: 'editado', metadata: JSON.parse(values[2]) };
        return [stored];
      }
      if (query.startsWith('SELECT')) return [stored];
      throw new Error(`Unexpected query: ${query}`);
    });
    const service = new DocumentosService(new DocumentosRepository(), {} as any, {} as any, {} as any);
    await service.editarOcrResultado(20, { tipoPropuesto: 'FACTURA', metadata: { montoTotal: '2730.02' } });
    const reread = await service.findOcrResultadoById(20);
    expect(reread.metadata.metadata.montoTotal).toBe('2730.02');
    expect(initialForm(reread).montoTotal).toBe('2730.02');
    expect(queries.filter(q => q.startsWith('UPDATE'))).toHaveLength(1);
    expect(queries.some(q => q.includes('expediente_documentos'))).toBe(false);
  });
  it.each([
    [{ metadata: { montoTotal: '2730.02' } }, '2730.02'],
    [{ montoTotal: '2730.02' }, '2730.02'],
    [{ montoTotal: '', metadata: { montoTotal: '2730.02' } }, '2730.02'],
    [{ metadata: { metadata: { montoTotal: 0 } } }, '0'],
  ])('keeps flattened extraction compatible: %s', (result, expected) => {
    expect(initialForm(result).montoTotal).toBe(expected);
  });
});
