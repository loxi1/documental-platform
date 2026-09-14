jest.mock('@documental/database', () => ({ sql: { begin: jest.fn() } }));
import { sql } from '@documental/database';
import { OrdenPagoService } from './orden-pago.service';
import { validarOrdenPago } from './orden-pago.dto';

const key = '571997eb-0175-4eb1-a287-11a8df3de272';
const body = { contenedorOperativoId: 7, fechaEmision: '2026-08-15', monto: '125.50',
  moneda: 'PEN', tipo: 'SEGUROS', subtipo: null, observacion: null };
const actor = { id: 5, workspaceId: 2, empresaCodigo: 'LAB', clienteDestinoId: 3,
  requestId: key, correlationId: key };

describe('OP-01A creación atómica', () => {
  const tx = jest.fn();
  const audit = { registrarCreacion: jest.fn() };
  const service = new OrdenPagoService(audit as any);
  beforeEach(() => {
    tx.mockReset(); audit.registrarCreacion.mockReset();
    (sql.begin as jest.Mock).mockImplementation(fn => fn(tx));
  });
  function created() {
    const timestamp = new Date('2026-09-14T18:30:00Z');
    tx.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 7 }])
      .mockResolvedValueOnce([{ codigo: 'PEN' }]).mockResolvedValueOnce([{ id: 10, creado_en: timestamp }])
      .mockResolvedValueOnce([{ id: 11 }]).mockResolvedValueOnce([{ id: 12 }]);
    return timestamp;
  }
  it('crea sin archivo/formal/OCR y audita actor, IDs y fecha real separada', async () => {
    const timestamp = created();
    expect(await service.crear(body, key, actor)).toEqual({ documentoId: 10, ordenPagoId: 11,
      grupoFacturaId: 12, contenedorOperativoId: 7, idempotente: false });
    expect(sql.begin).toHaveBeenCalled();
    const queries = tx.mock.calls.map(([parts]) => parts.join('?')).join('\n');
    expect(queries).toContain("NULL, 'ORDEN_PAGO'");
    expect(queries).not.toMatch(/ocr_resultados|documentos_archivos|documentos_factura|nats/);
    expect(audit.registrarCreacion).toHaveBeenCalledWith(expect.objectContaining({ usuario: expect.objectContaining(actor),
      despues: expect.objectContaining({ documentoId: 10, ordenPagoId: 11, grupoFacturaId: 12,
        creadoEn: timestamp, fechaEmision: '2026-08-15', workspaceId: 2 }) }), tx);
  });
  it('replay conserva IDs y no repite inserciones ni auditoría', async () => {
    created(); await service.crear(body, key, actor);
    const hash = tx.mock.calls[5].at(-1);
    tx.mockReset(); audit.registrarCreacion.mockClear();
    tx.mockResolvedValueOnce([]).mockResolvedValueOnce([{ ordenPagoId: 11, documentoId: 10,
      contenedorOperativoId: 7, grupoFacturaId: 12, op_payload_hash: hash, estado: 'activo' }]);
    expect(await service.crear(body, key, actor)).toMatchObject({ idempotente: true, ordenPagoId: 11, grupoFacturaId: 12 });
    expect(tx).toHaveBeenCalledTimes(2); expect(audit.registrarCreacion).not.toHaveBeenCalled();
  });
  it('misma clave con otro payload produce conflicto', async () => {
    tx.mockResolvedValueOnce([]).mockResolvedValueOnce([{ op_payload_hash: 'distinto' }]);
    await expect(service.crear(body, key, actor)).rejects.toThrow('OP_IDEMPOTENCY_CONFLICT');
    expect(audit.registrarCreacion).not.toHaveBeenCalled();
  });
  it('propaga fallo de auditoría al límite transaccional', async () => {
    created(); audit.registrarCreacion.mockRejectedValueOnce(new Error('audit failure'));
    await expect(service.crear(body, key, actor)).rejects.toThrow('audit failure');
  });
  it('rechaza contexto ajeno antes de insertar', async () => {
    tx.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await expect(service.crear(body, key, actor)).rejects.toThrow('Contexto OP');
    expect(tx).toHaveBeenCalledTimes(3);
  });
  it.each([{ ...body, actor: 9 }, { ...body, archivo: 'x' }, { ...body, monto: '0' },
    { ...body, fechaEmision: '2026-02-30' }, { ...body, tipo: 'FACTURA' },
    { ...body, tipo: 'SERVICIOS_GENERALES', subtipo: null }])('rechaza input inválido %#', input => {
    expect(() => validarOrdenPago(input, key)).toThrow();
  });
});
