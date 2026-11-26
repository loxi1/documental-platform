jest.mock('@documental/database', () => ({
  sql: {
    begin: jest.fn(),
  },
}));

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { sql } from '@documental/database';

import {
  ExpedientesImportacionRepository,
  type ImportacionReserva,
} from './expedientes-importacion.repository';

describe('ExpedientesImportacionRepository', () => {
  const repository = new ExpedientesImportacionRepository();

  const begin = sql.begin as unknown as jest.Mock;
  const tx = jest.fn();

  const input: ImportacionReserva = {
    solicitudId: 'a1000000-0000-4000-8000-000000000001',

    contexto: {
      workspaceId: 1,
      empresaCodigo: 'BBTI',
      clienteDestinoId: 2,
      usuarioId: 10,
      usuarioEmail: 'test@example.invalid',
      perfil: 'compras',
      requestId: null,
      sessionContextId: null,
    },

    nombreOriginal: 'centros-costo.csv',
    periodoFecha: '2026-11-26',

    storageKey:
      'documentos/2026/11/BBTI/CENTROS_COSTO/CENTROS_COSTO_TEST.csv',

    r2Cuenta: 'test-account',
    r2Bucket: 'test-bucket',

    tamanoBytes: 120,
    sha256: 'a'.repeat(64),

    csv: {
      rows: [
        {
          codigo_expediente: '000001',
          descripcion: 'ADMINISTRACIÓN',
        },
        {
          codigo_expediente: '000002',
          descripcion: 'OPERACIONES',
        },
      ],

      totalRegistros: 3,
      registrosDuplicadosCsv: 1,
    },
  };

  const empresa = {
    id: 2,
    abreviatura: 'BBTI',
    nombre_oficial: 'BB TECNOLOGIA INDUSTRIAL S.A.C.',
  };

  function reserva(overrides: Record<string, unknown> = {}) {
    return {
      id: '100',
      solicitud_id: input.solicitudId,

      workspace_id: 1,
      empresa_codigo: 'BBTI',
      cliente_destino_id: 2,
      usuario_id: 10,

      nombre_original: input.nombreOriginal,
      periodo_fecha: input.periodoFecha,

      storage_key: input.storageKey,
      r2_cuenta: input.r2Cuenta,
      r2_bucket: input.r2Bucket,

      tamano_bytes: input.tamanoBytes,
      sha256: input.sha256,

      total_registros: 3,
      registros_insertados: 0,
      registros_existentes: 0,
      registros_modificados: 0,
      registros_duplicados_csv: 1,

      estado_importacion: 'pendiente',
      r2_estado: 'pendiente',
      nas_estado: 'pendiente',
      storage_provider: null,

      ...overrides,
    };
  }

  function verificada(
    overrides: Record<string, unknown> = {},
  ) {
    return reserva({
      r2_estado: 'verificado',
      r2_etag: '"test-etag"',
      r2_verificado_en: new Date(),
      storage_provider: 'R2',
      ...overrides,
    });
  }

  const evidenciaR2 = {
    cuenta: input.r2Cuenta,
    bucket: input.r2Bucket,
    storageKey: input.storageKey,
    sha256: input.sha256,
    tamanoBytes: input.tamanoBytes,
    etag: '"test-etag"',
  };

  function query(index: number): string {
    return (tx.mock.calls[index][0] as string[]).join('?');
  }

  beforeEach(() => {
    jest.resetAllMocks();

    begin.mockImplementation(
      async (callback: (executor: typeof tx) => unknown) =>
        callback(tx),
    );
  });

  describe('reservar', () => {
    it('crea una reserva durable', async () => {
      const row = reserva();

      tx
        .mockResolvedValueOnce([empresa])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([row]);

      await expect(
        repository.reservar(input),
      ).resolves.toEqual(row);

      expect(begin).toHaveBeenCalledTimes(1);
      expect(tx).toHaveBeenCalledTimes(3);

      expect(query(0)).toContain('core.clientes_destino');

      expect(query(1)).toContain(
        'INSERT INTO documentos.expedientes_importaciones',
      );

      expect(query(1)).toContain(
        'ON CONFLICT (solicitud_id)',
      );

      expect(query(2)).toContain('FOR UPDATE');
    });

    it('rechaza empresa inconsistente antes de reservar', async () => {
      tx.mockResolvedValueOnce([]);

      await expect(
        repository.reservar(input),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(tx).toHaveBeenCalledTimes(1);
    });

    it.each([
      { workspace_id: 99 },
      { empresa_codigo: 'BBTEC' },
      { cliente_destino_id: 1 },
      { usuario_id: 99 },
    ])('rechaza otro contexto: %j', async (override) => {
      tx
        .mockResolvedValueOnce([empresa])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([reserva(override)]);

      await expect(
        repository.reservar(input),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it.each([
      { sha256: 'b'.repeat(64) },
      { tamano_bytes: 121 },
      { nombre_original: 'otro.csv' },
      { total_registros: 4 },
      { registros_duplicados_csv: 0 },
    ])('rechaza contenido diferente: %j', async (override) => {
      tx
        .mockResolvedValueOnce([empresa])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([reserva(override)]);

      await expect(
        repository.reservar(input),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('preserva ruta y periodo originales en reintento', async () => {
      const row = reserva();

      tx
        .mockResolvedValueOnce([empresa])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([row]);

      const result = await repository.reservar({
        ...input,
        periodoFecha: '2026-12-01',
        storageKey:
          'documentos/2026/12/BBTI/CENTROS_COSTO/OTRO.csv',
      });

      expect(result.storage_key).toBe(input.storageKey);
      expect(result.periodo_fecha).toBe(input.periodoFecha);
    });
  });

  describe('registrarR2Verificado', () => {
    it('registra evidencia R2 coincidente', async () => {
      const row = verificada();

      tx
        .mockResolvedValueOnce([reserva()])
        .mockResolvedValueOnce([row]);

      await expect(
        repository.registrarR2Verificado(
          input,
          evidenciaR2,
        ),
      ).resolves.toEqual(row);

      expect(query(1)).toContain(
        "r2_estado = 'verificado'",
      );

      expect(query(1)).toContain(
        "storage_provider = 'R2'",
      );
    });

    it.each([
      { cuenta: 'otra-cuenta' },
      { bucket: 'otro-bucket' },
      { storageKey: 'otra-ruta.csv' },
      { sha256: 'b'.repeat(64) },
      { tamanoBytes: 121 },
    ])('rechaza evidencia R2 diferente: %j', async (override) => {
      tx.mockResolvedValueOnce([reserva()]);

      await expect(
        repository.registrarR2Verificado(
          input,
          { ...evidenciaR2, ...override },
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(tx).toHaveBeenCalledTimes(1);
    });

    it('rechaza cambio de ETag tras verificacion', async () => {
      tx.mockResolvedValueOnce([verificada()]);

      await expect(
        repository.registrarR2Verificado(
          input,
          {
            ...evidenciaR2,
            etag: '"otro-etag"',
          },
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('reutiliza evidencia previamente verificada', async () => {
      const row = verificada();

      tx.mockResolvedValueOnce([row]);

      await expect(
        repository.registrarR2Verificado(
          input,
          evidenciaR2,
        ),
      ).resolves.toEqual(row);

      expect(tx).toHaveBeenCalledTimes(1);
    });
  });

  describe('confirmar', () => {
    it('rechaza una reserva inexistente', async () => {
      tx
        .mockResolvedValueOnce([empresa])
        .mockResolvedValueOnce([]);

      await expect(
        repository.confirmar(input),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza confirmacion sin R2 verificado', async () => {
      tx
        .mockResolvedValueOnce([empresa])
        .mockResolvedValueOnce([reserva()]);

      await expect(
        repository.confirmar(input),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(tx).toHaveBeenCalledTimes(2);
    });

    it('devuelve resultado confirmado sin repetir inserciones ni modificaciones', async () => {
      const row = verificada({
        estado_importacion: 'confirmada',
        registros_insertados: 1,
        registros_modificados: 1,
      });

      tx
        .mockResolvedValueOnce([empresa])
        .mockResolvedValueOnce([row]);

      await expect(
        repository.confirmar(input),
      ).resolves.toEqual(row);

      expect(tx).toHaveBeenCalledTimes(2);
    });

    it.each([
      [2, 0, 0],
      [1, 1, 0],
      [0, 2, 0],
      [1, 0, 1],
      [0, 1, 1],
      [0, 0, 2],
    ])(
      'confirma %i nuevos, %i sin cambios y %i modificados',
      async (insertados, existentes, modificados) => {
        const row = verificada({
          estado_importacion: 'confirmada',
          registros_insertados: insertados,
          registros_existentes: existentes,
          registros_modificados: modificados,
        });

        tx
          .mockResolvedValueOnce([empresa])
          .mockResolvedValueOnce([verificada()])
          .mockResolvedValueOnce([
            { insertados, auditados: insertados },
          ])
          .mockResolvedValueOnce([
            { modificados, auditados: modificados },
          ])
          .mockResolvedValueOnce([row]);

        await expect(
          repository.confirmar(input),
        ).resolves.toEqual(row);

        expect(begin).toHaveBeenCalledTimes(1);
        expect(tx).toHaveBeenCalledTimes(5);

        expect(query(2)).toContain('jsonb_to_recordset');
        expect(query(2)).toContain('DO NOTHING');

        expect(query(2)).toContain(
          'INSERT INTO documentos.expediente_auditoria',
        );

        expect(query(2)).toContain('expediente.creado');
        expect(query(2)).toContain('FROM nuevos n');

        expect(query(2)).not.toContain(
          'UPDATE documentos.expedientes',
        );

        expect(tx.mock.calls[2]).toContain(
          JSON.stringify(input.csv.rows),
        );

        expect(query(3)).toContain('jsonb_to_recordset');
        expect(query(3)).toContain('FOR UPDATE OF e');
        expect(query(3)).toContain('UPDATE documentos.expedientes');
        expect(query(3)).toContain('expediente.actualizado');
        expect(query(3)).toContain('descripcion_anterior');
        expect(query(3)).toContain('descripcion_nueva');
        expect(query(3)).toContain('IS DISTINCT FROM');
        expect(query(3)).toContain("e.estado <> 'anulado'");
        expect(query(3)).toContain('e.anulado_en IS NULL');
        expect(query(3)).toContain('e.empresa_codigo =');
        expect(query(3)).toContain('e.cliente_destino_id =');

        expect(tx.mock.calls[3]).toContain(
          JSON.stringify(input.csv.rows),
        );

        expect(query(4)).toContain(
          "estado_importacion = 'confirmada'",
        );

        expect(query(4)).toContain('registros_modificados');

        expect(tx.mock.calls[4].slice(1)).toEqual([
          insertados,
          existentes,
          modificados,
          '100',
        ]);
      },
    );

    it('no confirma si los totales de auditoria difieren', async () => {
      tx
        .mockResolvedValueOnce([empresa])
        .mockResolvedValueOnce([verificada()])
        .mockResolvedValueOnce([
          { insertados: 2, auditados: 1 },
        ]);

      await expect(
        repository.confirmar(input),
      ).rejects.toThrow(
        'IMPORTACION_RESULTADO_TRANSACCIONAL_INVALIDO',
      );

      expect(tx).toHaveBeenCalledTimes(3);
    });

    it('propaga error SQL sin confirmar la importacion', async () => {
      tx
        .mockResolvedValueOnce([empresa])
        .mockResolvedValueOnce([verificada()])
        .mockRejectedValueOnce(
          new Error('FALLO_SQL_SIMULADO'),
        );

      await expect(
        repository.confirmar(input),
      ).rejects.toThrow('FALLO_SQL_SIMULADO');

      expect(tx).toHaveBeenCalledTimes(3);
    });

    it.each([
      { modificados: 1, auditados: 0 },
      { modificados: 3, auditados: 3 },
      { modificados: -1, auditados: -1 },
      { modificados: 0.5, auditados: 0.5 },
    ])('rechaza resultados de modificaciones invalidos: %j', async resultado => {
      tx
        .mockResolvedValueOnce([empresa])
        .mockResolvedValueOnce([verificada()])
        .mockResolvedValueOnce([
          { insertados: 0, auditados: 0 },
        ])
        .mockResolvedValueOnce([resultado]);

      await expect(
        repository.confirmar(input),
      ).rejects.toThrow(
        'IMPORTACION_MODIFICACIONES_TRANSACCIONALES_INVALIDAS',
      );

      expect(begin).toHaveBeenCalledTimes(1);
      expect(tx).toHaveBeenCalledTimes(4);
    });

    it('propaga fallo SQL de actualizacion sin confirmar', async () => {
      tx
        .mockResolvedValueOnce([empresa])
        .mockResolvedValueOnce([verificada()])
        .mockResolvedValueOnce([
          { insertados: 1, auditados: 1 },
        ])
        .mockRejectedValueOnce(
          new Error('UPDATE_SQL_FALLIDO'),
        );

      await expect(
        repository.confirmar(input),
      ).rejects.toThrow('UPDATE_SQL_FALLIDO');

      expect(begin).toHaveBeenCalledTimes(1);
      expect(tx).toHaveBeenCalledTimes(4);
    });

    it('rechaza confirmacion durable no persistida', async () => {
      tx
        .mockResolvedValueOnce([empresa])
        .mockResolvedValueOnce([verificada()])
        .mockResolvedValueOnce([
          { insertados: 2, auditados: 2 },
        ])
        .mockResolvedValueOnce([
          { modificados: 0, auditados: 0 },
        ])
        .mockResolvedValueOnce([]);

      await expect(
        repository.confirmar(input),
      ).rejects.toThrow(
        'IMPORTACION_CONFIRMACION_NO_PERSISTIDA',
      );
    });
  });

  describe('persistencia focal NAS despues de confirmacion',()=>{
    const proof={origen:'EXPEDIENTES_IMPORTACION' as const,importacionId:'100',solicitudId:input.solicitudId,
      empresaCodigo:'BBTI',cuenta:input.r2Cuenta,bucket:input.r2Bucket,storageKey:input.storageKey,
      sha256:input.sha256,tamanoBytes:input.tamanoBytes,nasDestino:'SYNOLOGY_DEV'};
    function committed(){return verificada({estado_importacion:'confirmada',confirmado_en:new Date(),nas_estado:'pendiente'});}
    it('registra destino, integridad vinculada y disponibilidad sin tocar R2 ni negocio',async()=>{
      const ready={...committed(),nas_estado:'verificado',storage_provider:'NAS'};
      tx.mockResolvedValueOnce([committed()]).mockResolvedValueOnce([ready]);
      expect(await repository.registrarNasVerificado(input,proof)).toEqual(ready);
      const q=query(1);for(const field of ['nas_destino','nas_estado','nas_verificado_en','storage_provider','ultimo_error_codigo','actualizado_en'])expect(q).toContain(field);
      expect(q).not.toContain('r2_estado =');expect(q).not.toContain('INSERT');expect(q).not.toContain('DELETE');
    });
    it.each([{sha256:'b'.repeat(64)},{storageKey:'otra.csv'},{importacionId:'101'},{tamanoBytes:121},{solicitudId:'a2000000-0000-4000-8000-000000000001'}])('rechaza evidencia no vinculada %p',async delta=>{
      tx.mockResolvedValueOnce([committed()]);await expect(repository.registrarNasVerificado(input,{...proof,...delta})).rejects.toBeInstanceOf(ConflictException);expect(tx).toHaveBeenCalledTimes(1);
    });
    it('no marca NAS antes de confirmar',async()=>{
      tx.mockResolvedValueOnce([verificada()]);await expect(repository.registrarNasVerificado(input,proof)).rejects.toBeInstanceOf(ConflictException);expect(tx).toHaveBeenCalledTimes(1);
    });
    it('conserva R2 y confirmacion al registrar un fallo NAS',async()=>{
      const row=committed();tx.mockResolvedValueOnce([row]).mockResolvedValueOnce([{...row,ultimo_error_codigo:'ARCHIVADO_SMB_IO_FAILED'}]);
      await repository.registrarErrorNas(input,'ARCHIVADO_SMB_IO_FAILED');
      const q=query(1);expect(q).toContain('ultimo_error_codigo');expect(q).not.toContain('storage_provider=');expect(q).not.toContain('r2_estado=');expect(q).not.toContain('estado_importacion=');
    });
    it('un fallo concurrente no degrada una verificacion NAS persistida',async()=>{
      const ready={...committed(),nas_estado:'verificado',storage_provider:'NAS'};tx.mockResolvedValueOnce([ready]).mockResolvedValueOnce([ready]);
      expect(await repository.registrarErrorNas(input,'ARCHIVADO_OBJETO_OCUPADO')).toBe(ready);expect(tx).toHaveBeenCalledTimes(2);
    });
  });
});
