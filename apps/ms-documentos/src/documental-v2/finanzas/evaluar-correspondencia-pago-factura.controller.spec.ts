import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Contrato del endpoint de evaluación de correspondencia', () => {
  const controllerPath = resolve(
    process.cwd(),
    'src/documental-v2/documental-v2.controller.ts',
  );
  const source = readFileSync(controllerPath, 'utf8');

  it('expone el endpoint GET esperado', () => {
    expect(source).toContain(
      "@Get('finanzas/correspondencia/evaluar')",
    );
  });

  it('declara facturaDocumentoId obligatorio y pagoDocumentoId opcional', () => {
    expect(source).toContain(
      "@ApiQuery({ name: 'facturaDocumentoId', required: true",
    );
    expect(source).toContain(
      "@ApiQuery({ name: 'pagoDocumentoId', required: false",
    );
  });

  it('delegará la evaluación al caso de uso sin inferir estado pagado', () => {
    expect(source).toContain(
      'this.evaluarCorrespondenciaPagoFacturaUseCase.execute({',
    );
    expect(source).toContain('facturaDocumentoId,');
    expect(source).toContain(
      "pagoDocumentoId === undefined || pagoDocumentoId === ''",
    );
    expect(source).not.toContain('facturaPagada');
    expect(source).not.toContain('conciliada');
  });
});
