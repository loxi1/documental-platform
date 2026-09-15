jest.mock('@documental/database', () => ({ sql: jest.fn() }));
import { sql } from '@documental/database';
import { NotFoundException } from '@nestjs/common';
import { OrdenPagoService } from './orden-pago.service';
import { OrdenPagoController } from './orden-pago.controller';

const actor = { id: 6, workspaceId: 13, empresaCodigo: 'BBTI', clienteDestinoId: 2 };
const row = { ordenPagoId: '151', documentoId: 441, grupoFacturaId: '114', contenedorOperativoId: '7',
  fechaEmision: '2026-08-15', monto: '19.50', moneda: 'PEN', tipo: 'SEGUROS', subtipo: null,
  observacion: 'OP', estado: 'confirmado', contexto: { codigo: '050201', nombre: 'Contexto', centroCostoCodigo: '050201' }, archivoInicial: null };
describe('Detalle OP READ ONLY', () => {
  const audit = { registrarCreacion: jest.fn() };
  const service = new OrdenPagoService(audit as any);
  beforeEach(() => { jest.clearAllMocks(); (sql as unknown as jest.Mock).mockResolvedValue([row]); });
  it('detalle válido sin archivo devuelve IDs, metadata y numeración visual', async () => {
    expect(await service.obtenerDetalle(151, actor)).toEqual({ ...row, ordenPagoId: 151, grupoFacturaId: 114,
      contenedorOperativoId: 7, numero: 'OP-151' });
    expect(audit.registrarCreacion).not.toHaveBeenCalled();
  });
  it('archivo inicial vigente conserva campos funcionales sin credenciales', async () => {
    const file = { archivoId: 441, nombreArchivo: 'inicial.pdf', mime: 'application/pdf', tamanoBytes: 125,
      hashSha256: 'a'.repeat(64), storageKey: 'documentos/final.pdf' };
    (sql as unknown as jest.Mock).mockResolvedValue([{ ...row, archivoInicial: file }]);
    expect((await service.obtenerDetalle(151, actor)).archivoInicial).toEqual(file);
  });
  it('aplica scope real y filtros de principal/documento/contexto/grupo/archivo en SQL', async () => {
    await service.obtenerDetalle(151, actor);
    const [parts, ...values] = (sql as unknown as jest.Mock).mock.calls[0];
    const query = parts.join('?');
    for (const clause of ["d.id=p.documento_id", "d.tipo_documental='ORDEN_PAGO'", 'c.id=p.contenedor_operativo_id',
      'g.documento_operativo_principal_id=p.id', "g.origen_obligacion='ORDEN_PAGO'", "p.tipo_principal='ORDEN_PAGO'",
      "p.estado='activo'", 'p.es_principal_activo=true', "c.estado='activo'", 'c.empresa_codigo=?',
      'c.cliente_destino_id IS NOT DISTINCT FROM ?::bigint', "a.origen_archivo='OP_INICIAL'", 'a.es_version_actual=true',
      "d.metadata->'ordenPago'", "a.metadata->>'contentType'", "a.metadata->>'tamanoBytes'"]) expect(query).toContain(clause);
    expect(values).toEqual([151, 'BBTI', 2]);
    expect(query).not.toMatch(/INSERT|UPDATE|DELETE|carga_operaciones|ocr|storage_bucket|public_url|grupo_factura_documentos/i);
  });
  it.each(['inexistente', 'otra empresa', 'otro cliente', 'contexto inactivo'])('%s devuelve el mismo NotFound sin detalles', async () => {
    (sql as unknown as jest.Mock).mockResolvedValue([]);
    await expect(service.obtenerDetalle(151, actor)).rejects.toEqual(new NotFoundException('Orden de Pago no disponible'));
  });
  it.each([{ ...actor, empresaCodigo: 'OTRA' }, { ...actor, clienteDestinoId: 3 }, { ...actor, clienteDestinoId: null }])('usa el scope del actor sin sustituir cliente nulo %#', async a => {
    (sql as unknown as jest.Mock).mockResolvedValue([]);
    await expect(service.obtenerDetalle(151, a)).rejects.toBeInstanceOf(NotFoundException);
    expect((sql as unknown as jest.Mock).mock.calls[0].slice(1)).toEqual([151, a.empresaCodigo, a.clienteDestinoId]);
  });
  it('rechaza actor inválido antes de consultar', async () => {
    await expect(service.obtenerDetalle(151, { ...actor, id: 0 })).rejects.toThrow('Contexto autenticado');
    expect(sql).not.toHaveBeenCalled();
  });
  it.each([0, -1, NaN, 1.5])('id inválido %s responde NotFound sin SQL', async id => {
    await expect(service.obtenerDetalle(id, actor)).rejects.toBeInstanceOf(NotFoundException);
    expect(sql).not.toHaveBeenCalled();
  });
  it('controller convierte id y usa headers autenticados', async () => {
    const op = { obtenerDetalle: jest.fn() };
    await new OrdenPagoController(op as any, {} as any, {} as any).obtenerDetalle({
      'x-user-id': '6', 'x-workspace-id': '13', 'x-empresa-codigo': 'BBTI', 'x-cliente-destino-id': '2',
    }, '151');
    expect(op.obtenerDetalle).toHaveBeenCalledWith(151, expect.objectContaining(actor));
  });
});
