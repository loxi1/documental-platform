jest.mock('@documental/database', () => ({ sql: { begin: jest.fn() } }));
import { sql } from '@documental/database';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { GrupoFacturaService } from '../grupo-factura.service';
import { GrupoFacturaRepository } from '../grupo-factura.repository';
import { GrupoFacturaDocumentoRepository } from '../grupo-factura-documento.repository';
import { DocumentalV2Controller } from '../documental-v2.controller';

const actor = { id: 1, workspaceId: 1, empresaCodigo: 'LAB', clienteDestinoId: null };
const grupo = { origenObligacion: 'ORDEN_PAGO', principalId: 153, tipoPrincipal: 'ORDEN_PAGO',
  documentoPrincipalId: 443, facturaDocumentoId: null, contenedorId: 1, expedienteId: null };
const doc = { id: 443, tipoDocumental: 'ORDEN_PAGO', estado: 'confirmado', montoTotal: 100,
  moneda: 'PEN', clienteAbreviatura: 'LAB', metadata: {} };
const pago = { vinculoId: 1, documentoId: 500, archivoId: 501, estadoVinculo: 'activo',
  estadoDocumento: 'confirmado', metadata: { ocr: { metadata: { banco: 'BCP', numeroOperacion: 'REF-1' } } },
  monto: '40', moneda: 'PEN', fecha: '2026-09-15' };

describe('Resumen financiero canónico READ', () => {
  const repo = { buscarObligacionScoped: jest.fn() };
  const pagos = { sumarMontoTransferenciasActivas: jest.fn(), listarSustentosFinancieros: jest.fn(), listarDecisionesObservadas: jest.fn() };
  const docs = { buscarPorId: jest.fn() };
  const tx = jest.fn();
  const service = new GrupoFacturaService(repo as any, {} as any, pagos as any, docs as any);
  beforeEach(() => {
    jest.clearAllMocks();
    (sql.begin as jest.Mock).mockImplementation((_options, callback) => callback(tx));
    repo.buscarObligacionScoped.mockResolvedValue(grupo);
    docs.buscarPorId.mockResolvedValue(doc);
    pagos.sumarMontoTransferenciasActivas.mockResolvedValue(0);
    pagos.listarSustentosFinancieros.mockResolvedValue([]);
    pagos.listarDecisionesObservadas.mockResolvedValue([]);
  });
  it.each([
    [0, [], '0.00', '100.00', 'SIN PAGOS'],
    [40, [pago], '40.00', '60.00', 'PENDIENTE DE PAGO'],
    [100, [pago, { ...pago, documentoId: 502, monto: '60' }], '100.00', '0.00', 'COMPLETO'],
    [110, [pago], '110.00', '0.00', 'COMPLETO'],
  ])('OP153 pagado %s sin modificar WRITE', async (sum, rows, pagado, saldo, estado) => {
    pagos.sumarMontoTransferenciasActivas.mockResolvedValue(sum);
    pagos.listarSustentosFinancieros.mockResolvedValue(rows);
    const result = await service.obtenerResumenFinanciero(116, actor);
    expect(result.obligacion).toEqual({ tipo: 'ORDEN_PAGO', documentoId: 443, referencia: 'OP-153', monto: '100.00', moneda: 'PEN' });
    expect(result.pago).toEqual({ pagado, saldo, estado });
    expect(pagos.sumarMontoTransferenciasActivas).toHaveBeenCalledWith(116, tx);
    expect(sql.begin).toHaveBeenCalledWith('isolation level repeatable read read only', expect.any(Function));
  });
  it('observado y anulado no suman; listas/replay sin duplicados ni storage', async () => {
    const observado = { ...pago, estadoVinculo: null, estadoDocumento: 'observado', grupoArchivo: '116',
      decision: { estado: 'CONSUMIDO', accion: 'OBSERVAR', motivo: 'No corresponde', identidad: { grupoFacturaId: 116, expedienteId: null, facturaDocumentoId: null } } };
    pagos.listarDecisionesObservadas.mockResolvedValue([observado, observado]);
    pagos.listarSustentosFinancieros.mockResolvedValue([{ ...pago, documentoId: 600, estadoVinculo: 'anulado', motivo: 'Error' },
      { ...pago, documentoId: 600, estadoVinculo: 'anulado' }]);
    const result = await service.obtenerResumenFinanciero(116, actor);
    expect(result.pago).toEqual({ pagado: '0.00', saldo: '100.00', estado: 'SIN PAGOS' });
    expect(result.sustentosObservados).toHaveLength(1);
    expect(result.sustentosAnulados).toHaveLength(1);
    expect(result.sustentosObservados[0]).toMatchObject({ archivoId: 501, banco: 'BCP', numeroReferencia: 'REF-1', motivo: 'No corresponde' });
    expect(JSON.stringify(result)).not.toMatch(/storageKey|signedUrl/);
    expect(await service.obtenerResumenFinanciero(116, actor)).toEqual(result);
  });
  it('reactivación prevalece sobre historia sin duplicar categorías', async () => {
    pagos.listarSustentosFinancieros.mockResolvedValue([pago, { ...pago, estadoVinculo: 'anulado' }]);
    const result = await service.obtenerResumenFinanciero(116, actor);
    expect(result.sustentosActivos).toHaveLength(1);
    expect(result.sustentosAnulados).toEqual([]);
  });
  it.each([{ montoTotal: null }, { montoTotal: NaN }, { montoTotal: -1 }, { moneda: null }, { moneda: ' ' }, { moneda: '123' }])('rechaza obligación inválida %s', async invalid => {
    docs.buscarPorId.mockResolvedValue({ ...doc, ...invalid });
    await expect(service.obtenerResumenFinanciero(116, actor)).rejects.toBeInstanceOf(ConflictException);
  });
  it('conserva moneda USD canónica', async () => {
    docs.buscarPorId.mockResolvedValue({ ...doc, moneda: 'USD' });
    const result = await service.obtenerResumenFinanciero(116, actor);
    expect(result.obligacion.moneda).toBe('USD');
  });
  it('normaliza moneda legacy DOLARES AMERICANOS a USD', async () => {
    docs.buscarPorId.mockResolvedValue({ ...doc, moneda: 'DOLARES AMERICANOS' });
    const result = await service.obtenerResumenFinanciero(116, actor);
    expect(result.obligacion.moneda).toBe('USD');
  });
  it.each([{ tipoPrincipal: 'OC' }, { origenObligacion: 'FACTURA' }, { facturaDocumentoId: 800 }])('rechaza origen incoherente %s', async invalid => {
    repo.buscarObligacionScoped.mockResolvedValue({ ...grupo, ...invalid });
    await expect(service.obtenerResumenFinanciero(116, actor)).rejects.toBeInstanceOf(NotFoundException);
  });
  it.each(['OC', 'OS'])('FACTURA de %s conserva fallback documental y semántica', async tipoPrincipal => {
    repo.buscarObligacionScoped.mockResolvedValue({ ...grupo, origenObligacion: 'FACTURA', tipoPrincipal, facturaDocumentoId: 700 });
    docs.buscarPorId.mockResolvedValue({ ...doc, id: 700, tipoDocumental: 'FACTURA', montoTotal: null,
      moneda: null, serie: 'F001', numero: '10', metadata: { montoTotal: '100', moneda: 'PEN' } });
    pagos.sumarMontoTransferenciasActivas.mockResolvedValue(40);
    pagos.listarSustentosFinancieros.mockResolvedValue([pago]);
    const result = await service.obtenerResumenFinanciero(116, actor);
    expect(result.obligacion).toEqual({ tipo: 'FACTURA', documentoId: 700, referencia: 'F001-10', monto: '100.00', moneda: 'PEN' });
    expect(result.pago).toEqual({ pagado: '40.00', saldo: '60.00', estado: 'PENDIENTE DE PAGO' });
  });
  it.each(['inexistente', 'empresa ajena', 'cliente ajeno', 'contexto inactivo'])('%s uniforme', async () => {
    repo.buscarObligacionScoped.mockResolvedValue(null);
    await expect(service.obtenerResumenFinanciero(116, actor)).rejects.toEqual(new NotFoundException('Grupo financiero no disponible'));
    expect(pagos.sumarMontoTransferenciasActivas).not.toHaveBeenCalled();
  });
  it('actor inválido no consulta', async () => {
    await expect(service.obtenerResumenFinanciero(116, { ...actor, id: 0 })).rejects.toThrow();
    expect(sql.begin).not.toHaveBeenCalled();
  });
  it.each([0, -1, NaN, 1.5])('id inválido %s no consulta', async id => {
    await expect(service.obtenerResumenFinanciero(id, actor)).rejects.toBeInstanceOf(NotFoundException);
    expect(sql.begin).not.toHaveBeenCalled();
  });
  it('documento de empresa ajena no se expone aunque el grupo sea accesible', async () => {
    docs.buscarPorId.mockResolvedValue({ ...doc, clienteAbreviatura: 'OTRA' });
    await expect(service.obtenerResumenFinanciero(116, actor)).rejects.toEqual(new NotFoundException('Grupo financiero no disponible'));
  });
  it('metadata observada contradictoria falla explícitamente', async () => {
    pagos.listarDecisionesObservadas.mockResolvedValue([{ ...pago, grupoArchivo: '116', decision: {
      estado: 'CONSUMIDO', accion: 'OBSERVAR', identidad: { grupoFacturaId: 999 } } }]);
    await expect(service.obtenerResumenFinanciero(116, actor)).rejects.toThrow('Identidad de decisión');
  });
  it.each([{ expedienteId: 9 }, { facturaDocumentoId: 0 }, { documentoId: 9 },
    { archivoId: 9 }, { contenedorOperativoId: 9 }, { documentoBaseId: 9 }])('rechaza contradicción contextual %s', async extra => {
    pagos.listarDecisionesObservadas.mockResolvedValue([{ ...pago, grupoArchivo: '116', decision: {
      estado: 'CONSUMIDO', accion: 'OBSERVAR', identidad: { grupoFacturaId: 116, ...extra } } }]);
    await expect(service.obtenerResumenFinanciero(116, actor)).rejects.toThrow('Identidad de decisión');
  });
  it('controller usa únicamente headers autenticados y registra ruta READ', async () => {
    const obtenerResumenFinanciero = jest.fn();
    const handler = DocumentalV2Controller.prototype.obtenerResumenFinanciero;
    expect(Reflect.getMetadata('path', handler)).toBe('finanzas/grupos-factura/:grupoFacturaId/resumen');
    await handler.call({ gruposFactura: { obtenerResumenFinanciero } } as any, '116', {
      'x-user-id': '1', 'x-workspace-id': '1', 'x-empresa-codigo': 'LAB',
    });
    expect(obtenerResumenFinanciero).toHaveBeenCalledWith(116, actor);
  });
});

describe('Repositorios READ: contratos SQL de seguridad y fuente canónica', () => {
  const tx = jest.fn().mockResolvedValue([]);
  beforeEach(() => tx.mockClear());
  it('scope empresa/cliente/contexto/principal vigentes, origen persistido', async () => {
    await new GrupoFacturaRepository().buscarObligacionScoped(116, actor, tx as any);
    const [parts, ...values] = tx.mock.calls[0];
    const query = parts.join('?');
    for (const clause of ['g.origen_obligacion', "g.estado <> 'anulado'", "p.estado='activo'", 'p.es_principal_activo=true',
      "c.estado='activo'", 'pd.tipo_documental=p.tipo_principal', 'pd.cliente_abreviatura=c.empresa_codigo',
      'c.empresa_codigo=?', 'c.cliente_destino_id IS NOT DISTINCT FROM ?::bigint']) expect(query).toContain(clause);
    expect(values).toEqual([116, 'LAB', null]);
  });
  it('suma existente excluye observado/anulado sin depender de factura', async () => {
    await new GrupoFacturaDocumentoRepository().sumarMontoTransferenciasActivas(116, tx as any);
    const query = tx.mock.calls[0][0].join('?');
    expect(query).toContain("d.estado NOT IN ('observado', 'anulado')");
    expect(query).toContain("gfd.estado = 'activo'");
    expect(query).not.toContain('factura_documento_id');
  });
  it('observados lee solo CONSUMIDO/OBSERVAR; no paginación ni factura requerida', async () => {
    await new GrupoFacturaDocumentoRepository().listarDecisionesObservadas(116, 'LAB', tx as any);
    const query = tx.mock.calls[0][0].join('?');
    expect(query).toContain("='CONSUMIDO'");
    expect(query).toContain("='OBSERVAR'");
    expect(query).toContain('a.documento_id=d.id');
    expect(query).not.toMatch(/LIMIT|factura_documento_id|storage_key/);
  });
});
