jest.mock('@documental/database', () => ({ sql: jest.fn() }));
import { sql } from '@documental/database';
import { ExpedientesRepository } from './expedientes.repository';
const scope = { empresa: 'TEST', workspaceId: 7, clienteDestinoId: 8 };
const metadata = { rucProveedor: '20123456789', serie: 'E001', numero: '137' };
const key = 'TEST|FACTURA|20123456789|E001|137';
const destino = { id: 99, clave_documental: key, vinculos: 1 };
async function consultar(campos: any = metadata, destinos: any[] = [], estado = 'pendiente_validacion') {
  (sql as unknown as jest.Mock).mockResolvedValue([{ autorizado: true, destinos, candidatos: [{
    documentoId: 10, archivoId: 11, actuales: 1, documentoMetadata: {},
    ocr: campos === null ? [] : [{ id: 20, estado, tipo_propuesto: 'FACTURA', metadata: { metadata: campos } }],
  }] }]);
  return new ExpedientesRepository().findFacturasPendientes(1, 2, scope);
}
describe('Clasificación defensiva de facturas', () => {
  it('sin OCR no infiere identidad ni ofrece versión', async () => {
    expect((await consultar(null, [destino])).data[0]).toMatchObject({ clasificacion: 'PENDIENTE_OCR', accionSugerida: 'VALIDAR_MANUAL', documentoIdDestino: null });
  });
  it.each(['rucProveedor', 'serie', 'numero'])('sin %s conserva edición OCR', async campo => {
    expect((await consultar({ ...metadata, [campo]: '' }, [destino])).data[0])
      .toMatchObject({ clasificacion: 'PENDIENTE_OCR', accionSugerida: 'VALIDAR_OCR' });
  });
  it('completa sin destino identificado', async () => {
    expect((await consultar()).data[0]).toMatchObject({ clasificacion: 'IDENTIFICADO', accionSugerida: 'VALIDAR_OCR' });
  });
  it.each(['pendiente_validacion', 'editado'])('coincidencia única %s', async estado => {
    expect((await consultar(metadata, [destino], estado)).data[0]).toMatchObject({ clasificacion: 'IDENTIFICADO', accionSugerida: 'AGREGAR_VERSION', documentoIdDestino: 99, estadoOcr: estado });
  });
  it('factura distinta no versiona', async () => {
    expect((await consultar({ ...metadata, numero: '138' }, [destino])).data[0].accionSugerida).toBe('VALIDAR_OCR');
  });
  it.each([[destino, { ...destino, id: 100 }], [{ ...destino, vinculos: 2 }]])('ambigüedad conserva edición', async (...destinos) => {
    expect((await consultar(metadata, destinos)).data[0].accionSugerida).toBe('VALIDAR_OCR');
  });
  it('SQL restringe destinos por principal, expediente, empresa, cliente, workspace y pertenencia', async () => {
    await consultar();
    const mock = sql as unknown as jest.Mock;
    const query = mock.mock.calls.at(-1)[0].join('?').replace(/\s+/g, ' ');
    expect(query).toContain('gf.documento_operativo_principal_id = p.id');
    expect(query).toContain("d.estado = 'confirmado'");
    expect(query).toContain("gf.estado <> 'anulado'");
    for (const field of ['workspace_id', 'empresa_codigo', 'cliente_destino_id', 'expediente_id']) {
      expect(query).toContain(`a.${field} IS DISTINCT FROM ?`);
    }
    expect(query).toContain('otro.documento_operativo_principal_id <> p.id');
    expect(query).toContain("da.metadata->>'documentoBaseId' = ?");
  });
});
