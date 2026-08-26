jest.mock('@documental/database', () => ({ sql: jest.fn() }));
jest.mock('@documental/shared', () => ({ NatsSubjects: {} }));

import { ConflictException } from '@nestjs/common';
import { sql } from '@documental/database';
import { DocumentosRepository } from './documentos.repository';
import { DocumentosService } from './documentos.service';

describe('33H - draft validacionPendientePago', () => {
  const repo = {
    findOcrResultadoById: jest.fn(),
    guardarValidacionPendientePago: jest.fn(),
  } as any;
  const orquestador = { execute: jest.fn() } as any;
  const eventos = { registrarEvento: jest.fn() } as any;
  let service: DocumentosService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DocumentosService(repo, orquestador, eventos, {} as any);
    repo.findOcrResultadoById.mockResolvedValue({
      id: 76,
      archivo_id: 73,
      documento_id: 89,
      expediente_id: 53,
      metadata: {
        metadata: { montoTotal: '240', moneda: 'SOLES' },
        metadataSource: { montoTotal: 'ocr' },
        contextoCarga: { origen: 'FINANZAS' },
        archivo: { filename: 'pago.pdf' },
        texto: { length: 100 },
      },
    });
    repo.guardarValidacionPendientePago.mockResolvedValue({ id: 76 });
  });

  it('A: mismo 409 y draft con metadata corregida 400/SOLES', async () => {
    const conflicto = new ConflictException({
      code: 'DECISION_CORRESPONDENCIA_REQUERIDA',
      message: 'La transferencia requiere una decisión de correspondencia',
      details: { facturaDocumentoId: 20, pagoDocumentoId: 89 },
    });
    orquestador.execute.mockRejectedValue(conflicto);
    const input = {
      expedienteId: 53,
      documentoBaseId: 21,
      grupoFacturaId: 3,
      tipoRelacion: 'adjunto_transferencia',
      esPrincipal: false,
      orden: 20,
      metadata: { montoTotal: '400', moneda: 'SOLES', numeroOperacion: 'OP-33H' },
      observacion: 'Guardar y confirmar pago desde Finanzas',
    };

    await expect(
      service.confirmarOcrResultadoConExpediente(76, input, {
        usuarioId: 1,
        requestId: 'req-33h',
        correlationId: 'req-33h',
      }),
    ).rejects.toBe(conflicto);

    expect(repo.guardarValidacionPendientePago).toHaveBeenCalledTimes(1);
    const [id, draft] = repo.guardarValidacionPendientePago.mock.calls[0];
    expect(id).toBe(76);
    expect(draft).toMatchObject({
      version: 1,
      estado: 'PENDIENTE_DECISION',
      identidad: {
        ocrResultadoId: 76,
        archivoId: 73,
        documentoId: 89,
        expedienteId: 53,
        documentoBaseId: 21,
        grupoFacturaId: 3,
        facturaDocumentoId: 20,
      },
      request: {
        metadata: { montoTotal: '400', moneda: 'SOLES', numeroOperacion: 'OP-33H' },
        tipoRelacion: 'adjunto_transferencia',
        esPrincipal: false,
        orden: 20,
        observacion: 'Guardar y confirmar pago desde Finanzas',
      },
    });
    expect(draft.request).not.toHaveProperty('decisionCorrespondencia');
  });

  it('B: otro 409 no crea draft', async () => {
    const otro = new ConflictException({ code: 'GRUPO_FACTURA_AMBIGUO', message: 'otro' });
    orquestador.execute.mockRejectedValue(otro);
    await expect(service.confirmarOcrResultadoConExpediente(76, {
      expedienteId: 53,
      metadata: { montoTotal: '400', moneda: 'SOLES' },
    }, {})).rejects.toBe(otro);
    expect(repo.guardarValidacionPendientePago).not.toHaveBeenCalled();
  });

  it('B: error técnico no crea draft', async () => {
    const tecnico = new Error('fallo técnico');
    orquestador.execute.mockRejectedValue(tecnico);
    await expect(service.confirmarOcrResultadoConExpediente(76, {
      expedienteId: 53,
      metadata: { montoTotal: '400', moneda: 'SOLES' },
    }, {})).rejects.toBe(tecnico);
    expect(repo.guardarValidacionPendientePago).not.toHaveBeenCalled();
  });

  it('F: write usa jsonb_set dirigido y preserva el JSON superior', async () => {
    const sqlMock = sql as unknown as jest.Mock;
    let rendered = '';
    let values: unknown[] = [];
    sqlMock.mockImplementationOnce((strings: TemplateStringsArray, ...params: unknown[]) => {
      rendered = Array.from(strings).join('?'); values = params;
      return Promise.resolve([{ id: 76 }]);
    });
    const repository = new DocumentosRepository();
    const draft = {
      version: 1,
      estado: 'PENDIENTE_DECISION',
      identidad: { ocrResultadoId: 76 },
      request: { metadata: { montoTotal: '400', moneda: 'SOLES' } },
      actualizadoEn: '2026-08-20T00:00:00.000Z',
    };
    await repository.guardarValidacionPendientePago(76, draft);
    expect(rendered).toContain('metadata = jsonb_set(');
    expect(rendered).toContain("COALESCE(metadata, '{}'::jsonb)");
    expect(rendered).toContain("'{validacionPendientePago}'");
    expect(rendered).not.toMatch(/SET\s+metadata\s*=\s*\?/i);
    const serialized = values.find(v => typeof v === 'string' && v.includes('PENDIENTE_DECISION'));
    expect(serialized).toBe(JSON.stringify(draft));
  });

  it('F: consumo usa executor TX y solo namespace validacionPendientePago', async () => {
    const sqlMock = sql as unknown as jest.Mock;
    sqlMock.mockClear();
    let rendered = '';
    const tx = jest.fn((strings: TemplateStringsArray, ..._params: unknown[]) => {
      rendered = Array.from(strings).join('?');
      return Promise.resolve([{ id: 76 }]);
    }) as any;
    const repository = new DocumentosRepository();
    await repository.consumirValidacionPendientePagoConExecutor(tx, 76, 'ACEPTAR', 'Motivo focal');
    expect(sqlMock).not.toHaveBeenCalled();
    expect(rendered).toContain('metadata = jsonb_set(');
    expect(rendered).toContain("'{validacionPendientePago}'");
    expect(rendered).toContain("metadata->'validacionPendientePago'");
    expect(rendered).toContain("'PENDIENTE_DECISION'");
    expect(rendered).toContain("'CONSUMIDO'");
    expect(rendered).toContain("'consumidoEn'");
    expect(rendered).toContain("'motivo'");
  });
});
