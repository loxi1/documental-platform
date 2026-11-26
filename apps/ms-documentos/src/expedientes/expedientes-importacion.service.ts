import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { ArchivadoRuntimeService } from '../documentos/archivado/archivado-runtime.service';

import {
  R2CargaSeguraStorage,
} from '../documentos/carga-segura/carga-segura.storage';

import {
  ExpedientesImportacionRepository,
  type ImportacionContexto,
  type ImportacionReserva,
} from './expedientes-importacion.repository';

import {
  parseExpedientesCsv,
  ExpedientesCsvError,
  EXPEDIENTES_CSV_LIMITS,
} from './expedientes-csv.parser';

import {
  resolverNomenclaturaImportacion,
} from './expedientes-importacion-nomenclatura';

export interface ImportarExpedientesCsvInput {
  solicitudId: string;
  contexto: ImportacionContexto;
  nombreOriginal: string;
  contenido: Buffer;
}

@Injectable()
export class ExpedientesImportacionService {
  constructor(
    private readonly repository: ExpedientesImportacionRepository,
    private readonly storage: R2CargaSeguraStorage,
    private readonly config: ConfigService,
    private readonly archivado: ArchivadoRuntimeService,
  ) {}

  async importar(input: ImportarExpedientesCsvInput) {
    this.validarEntrada(input);

    const csv = this.parsear(input.contenido);

    const sha256 = createHash('sha256')
      .update(input.contenido)
      .digest('hex');

    const identidad = this.identidadR2();

    const nomenclatura = resolverNomenclaturaImportacion({
      empresaCodigo: input.contexto.empresaCodigo,
      solicitudId: input.solicitudId,
      fecha: new Date(),
    });

    const command: ImportacionReserva = {
      solicitudId: input.solicitudId.toLowerCase(),
      contexto: input.contexto,
      nombreOriginal: input.nombreOriginal,
      periodoFecha: nomenclatura.periodoFecha,
      storageKey: nomenclatura.storageKey,
      r2Cuenta: identidad.cuenta,
      r2Bucket: identidad.bucket,
      tamanoBytes: input.contenido.length,
      sha256,
      csv,
    };

    // Reserva durable antes de cualquier escritura R2.
    const reserva = await this.repository.reservar(command);

    if (
      reserva.r2_cuenta !== identidad.cuenta ||
      reserva.r2_bucket !== identidad.bucket
    ) {
      throw new ConflictException(
        'IMPORTACION_ENTORNO_R2_NO_COINCIDE',
      );
    }

    // Recover only pending NAS; never insert, confirm or PUT again.
    if (reserva.estado_importacion === 'confirmada') {
      return this.resultado(await this.archivarConfirmada(reserva,command));
    }

    // En un reintento se conserva la ruta persistida.
    const storageKey = String(reserva.storage_key);

    if (reserva.r2_estado === 'pendiente') {
      await this.storage.putObject({
        provider: 'r2',
        bucket: identidad.bucket,
        key: storageKey,
        body: input.contenido,
        contentType: 'text/csv',
        hashSha256: sha256,
      });
    } else if (reserva.r2_estado !== 'verificado') {
      throw new ConflictException(
        'IMPORTACION_R2_ESTADO_INVALIDO',
      );
    }

    // Verificacion de integridad, no deduplicacion.
    const evidencia = await this.verificarR2({
      cuenta: identidad.cuenta,
      bucket: identidad.bucket,
      storageKey,
      sha256,
      tamanoBytes: input.contenido.length,
    });

    await this.repository.registrarR2Verificado(
      command,
      evidencia,
    );

    // Insercion incremental y auditoria en una transaccion.
    const confirmada = await this.repository.confirmar(
      command,
    );

    // confirmar() resolves only after its business transaction has committed.
    return this.resultado(await this.archivarConfirmada(confirmada,command));
  }

  private async archivarConfirmada(row:Record<string,any>,command:ImportacionReserva){
    if(row.nas_estado==='verificado'&&row.r2_estado==='eliminado')return row;
    let actual=row;
    try{
      if(row.estado_importacion!=='confirmada'||!row.confirmado_en||!['verificado','eliminacion_pendiente','eliminacion_incierta'].includes(row.r2_estado))
        throw new Error('IMPORTACION_NAS_NO_CONFIRMADA');
      await this.archivado.archivarImportacionCsv({
        origen:'EXPEDIENTES_IMPORTACION',importacionId:String(row.id),solicitudId:String(row.solicitud_id),
        empresaCodigo:String(row.empresa_codigo),cuenta:String(row.r2_cuenta),bucket:String(row.r2_bucket),
        storageKey:String(row.storage_key),sha256:String(row.sha256),tamanoBytes:Number(row.tamano_bytes),
        workspaceId:command.contexto.workspaceId,clienteDestinoId:command.contexto.clienteDestinoId,usuarioId:command.contexto.usuarioId,
      },async(evento,datos,db)=>{actual=await this.repository.registrarEventoArchivado(command,evento,datos,db);});
      return actual;
    }catch(error){
      const message=error instanceof Error?error.message:'';
      const codigo=/^(ARCHIVADO|IMPORTACION_NAS)_[A-Z0-9_]{1,70}$/.test(message)?message:'IMPORTACION_NAS_FALLIDA';
      if(['eliminacion_incierta','eliminado'].includes(actual.r2_estado))return actual;
      try{return await this.repository.registrarErrorNas(command,codigo);}catch{return actual;}
    }
  }

  private validarEntrada(input: ImportarExpedientesCsvInput) {
    const contexto = input.contexto;

    if (
      !contexto ||
      !Number.isSafeInteger(contexto.workspaceId) ||
      contexto.workspaceId <= 0 ||
      !Number.isSafeInteger(contexto.clienteDestinoId) ||
      contexto.clienteDestinoId <= 0 ||
      !Number.isSafeInteger(contexto.usuarioId) ||
      contexto.usuarioId <= 0 ||
      !/^[A-Z0-9_-]{1,20}$/.test(
        contexto.empresaCodigo,
      )
    ) {
      throw new BadRequestException(
        'IMPORTACION_CONTEXTO_INVALIDO',
      );
    }

    if (
      typeof input.solicitudId !== 'string' ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
        .test(input.solicitudId)
    ) {
      throw new BadRequestException(
        'IMPORTACION_SOLICITUD_ID_INVALIDA',
      );
    }

    if (
      typeof input.nombreOriginal !== 'string' ||
      !input.nombreOriginal.trim() ||
      input.nombreOriginal.length > 255 ||
      /[\x00-\x1f\x7f/\\]/.test(input.nombreOriginal) ||
      !/\.csv$/i.test(input.nombreOriginal)
    ) {
      throw new BadRequestException(
        'IMPORTACION_NOMBRE_CSV_INVALIDO',
      );
    }

    if (
      !Buffer.isBuffer(input.contenido) ||
      input.contenido.length === 0 ||
      input.contenido.length >
        EXPEDIENTES_CSV_LIMITS.maxBytes
    ) {
      throw new BadRequestException(
        'IMPORTACION_ARCHIVO_INVALIDO',
      );
    }
  }

  private parsear(contenido: Buffer) {
    try {
      return parseExpedientesCsv(contenido);
    } catch (error) {
      if (error instanceof ExpedientesCsvError) {
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          row: error.row ?? null,
        });
      }

      throw error;
    }
  }

  private identidadR2() {
    const cuenta = this.config.get<string>('R2_ACCOUNT_ID')
      || this.config.get<string>('CLOUDFLARE_ACCOUNT_ID');

    const bucket = this.config.get<string>('R2_BUCKET')
      || this.config.get<string>('R2_BUCKET_NAME')
      || this.config.get<string>('STORAGE_R2_BUCKET');

    if (!cuenta?.trim() || !bucket?.trim()) {
      throw new ServiceUnavailableException(
        'IMPORTACION_R2_NO_CONFIGURADO',
      );
    }

    return {
      cuenta: cuenta.trim(),
      bucket: bucket.trim(),
    };
  }

  private async verificarR2(input: {
    cuenta: string;
    bucket: string;
    storageKey: string;
    sha256: string;
    tamanoBytes: number;
  }) {
    const client = this.storage.getArchivadoClient();

    const object = await client.send(
      new GetObjectCommand({
        Bucket: input.bucket,
        Key: input.storageKey,
      }),
      {
        abortSignal: AbortSignal.timeout(30000),
      },
    );

    const body = object.Body as
      | (AsyncIterable<Uint8Array> & {
          destroy?: () => void;
        })
      | undefined;

    try {
      if (
        !body ||
        object.ContentLength !== input.tamanoBytes ||
        object.Metadata?.sha256 !== input.sha256
      ) {
        throw new ConflictException(
          'IMPORTACION_R2_IDENTIDAD_INVALIDA',
        );
      }

      const hash = createHash('sha256');
      let bytes = 0;

      for await (const chunk of body) {
        bytes += chunk.byteLength;

        if (bytes > input.tamanoBytes) {
          throw new ConflictException(
            'IMPORTACION_R2_TAMANO_INVALIDO',
          );
        }

        hash.update(chunk);
      }

      if (
        bytes !== input.tamanoBytes ||
        hash.digest('hex') !== input.sha256
      ) {
        throw new ConflictException(
          'IMPORTACION_R2_INTEGRIDAD_INVALIDA',
        );
      }

      return {
        ...input,
        etag: object.ETag ?? null,
      };
    } finally {
      body?.destroy?.();
    }
  }

  private resultado(row: Record<string, any>) {
    return {
      importacionId: String(row.id),
      solicitudId: String(row.solicitud_id),
      empresaCodigo: String(row.empresa_codigo),
      clienteDestinoId: Number(row.cliente_destino_id),

      totalRegistros: Number(row.total_registros),
      registrosInsertados: Number(row.registros_insertados),
      registrosExistentes: Number(row.registros_existentes),
      registrosDuplicadosCsv: Number(
        row.registros_duplicados_csv,
      ),
      registrosModificados: Number(row.registros_modificados),

      estado: row.estado_importacion,
      storageProvider: row.storage_provider,
      nasEstado: row.nas_estado,
    };
  }
}
