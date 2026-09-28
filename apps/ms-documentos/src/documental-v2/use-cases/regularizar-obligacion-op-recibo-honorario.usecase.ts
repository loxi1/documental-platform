import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sql } from '@documental/database';

import { AuditoriaOperativaV2Repository } from '../auditoria-operativa-v2.repository';
import { ObligacionesSnapshotRepository } from '../obligaciones-snapshot.repository';
import { RegularizadoresObligacionRepository } from '../regularizadores-obligacion.repository';
import { GrupoFacturaDocumentoRepository } from '../grupo-factura-documento.repository';
import { AsociarDocumentoGrupoFacturaV2UseCase } from './asociar-documento-grupo-factura-v2.usecase';

export type RegularizarObligacionOpReciboHonorarioInput = {
  grupoFacturaId: number;
  documentoId: number;
  usuario?: any;
};

export type RegularizarObligacionOpReciboHonorarioResult = {
  grupoFacturaId: number;
  documentoId: number;
  tipoRelacion: 'regularizador_recibo_honorario';
  estadoRegularizacion: 'REGULARIZADO';
  idempotente: boolean;
};

@Injectable()
export class RegularizarObligacionOpReciboHonorarioUseCase {
  constructor(
    private readonly snapshots: ObligacionesSnapshotRepository,
    private readonly regularizadores: RegularizadoresObligacionRepository,
    private readonly relaciones: GrupoFacturaDocumentoRepository,
    private readonly asociarDocumentoGrupo: AsociarDocumentoGrupoFacturaV2UseCase,
    private readonly auditoria: AuditoriaOperativaV2Repository,
  ) {}

  execute(input: RegularizarObligacionOpReciboHonorarioInput) {
    return sql.begin(async (tx) => {
      const grupoFacturaId = Number(input.grupoFacturaId);
      const documentoId = Number(input.documentoId);

      if (!Number.isInteger(grupoFacturaId) || grupoFacturaId <= 0) {
        throw new ConflictException({
          code: 'GRUPO_FACTURA_INVALIDO',
          message: 'grupoFacturaId inválido',
        });
      }

      if (!Number.isInteger(documentoId) || documentoId <= 0) {
        throw new ConflictException({
          code: 'DOCUMENTO_INVALIDO',
          message: 'documentoId inválido',
        });
      }

      const snapshot =
        await this.snapshots.obtenerRegularizacionPorGrupoFacturaId(
          grupoFacturaId,
          tx,
        );

      if (!snapshot) {
        throw new NotFoundException({
          code: 'OBLIGACION_SNAPSHOT_NO_ENCONTRADO',
          message: 'No existe snapshot de obligación para el Grupo de Factura',
        });
      }

      if (!snapshot.requiereRegularizacionAplicada) {
        throw new ConflictException({
          code: 'OBLIGACION_NO_REQUIERE_REGULARIZACION',
          message: 'La obligación no requiere regularización',
        });
      }

      if (snapshot.estadoRegularizacion === 'REGULARIZADO') {
        const relacionExistente =
          await this.relaciones.buscarActivoPorGrupoDocumentoRelacion(
            {
              grupoFacturaId,
              documentoId,
              tipoRelacion: 'regularizador_recibo_honorario',
            },
            tx,
          );

        if (relacionExistente) {
          return {
            grupoFacturaId,
            documentoId,
            tipoRelacion: 'regularizador_recibo_honorario' as const,
            estadoRegularizacion: 'REGULARIZADO' as const,
            idempotente: true,
          };
        }

        throw new ConflictException({
          code: 'OBLIGACION_YA_REGULARIZADA_CON_OTRO_DOCUMENTO',
          message:
            'La obligación ya fue regularizada y el Recibo por Honorarios indicado no es su documento regularizador activo',
        });
      }

      if (snapshot.estadoRegularizacion !== 'PENDIENTE') {
        throw new ConflictException({
          code: 'OBLIGACION_NO_PENDIENTE_REGULARIZACION',
          message: 'La obligación no está pendiente de regularización',
          estadoRegularizacion: snapshot.estadoRegularizacion,
        });
      }

      const reciboHonorarioPermitido =
        await this.regularizadores.permiteTipoDocumental(
          grupoFacturaId,
          'RECIBO_HONORARIO',
          tx,
        );

      if (!reciboHonorarioPermitido) {
        throw new ConflictException({
          code: 'TIPO_DOCUMENTAL_REGULARIZADOR_NO_PERMITIDO',
          message:
            'RECIBO_HONORARIO no está permitido por el snapshot documental de esta obligación',
          tipoDocumental: 'RECIBO_HONORARIO',
        });
      }

      const asociacion = await this.asociarDocumentoGrupo.execute(
        {
          grupoFacturaId,
          documentoId,
          tipoRelacion: 'regularizador_recibo_honorario',
          operacionInterna: 'REGULARIZAR_OBLIGACION_OP',
          usuario: input.usuario,
        },
        tx,
      );

      if (!asociacion.documentoGrupoFactura) {
        throw new ConflictException({
          code: 'REGULARIZACION_OP_ASOCIACION_NO_PERSISTIDA',
          message:
            'El Recibo por Honorarios regularizador no quedó asociado a la obligación',
        });
      }

      const actualizado =
        await this.snapshots.marcarRegularizadoDesdePendiente(
          grupoFacturaId,
          tx,
        );

      if (!actualizado) {
        throw new ConflictException({
          code: 'REGULARIZACION_OP_TRANSICION_CONCURRENTE',
          message:
            'La obligación dejó de estar pendiente durante la regularización',
        });
      }

      await this.auditoria.registrarRegularizacion(
        {
          accion: 'REGULARIZAR_OP',
          entidad: 'obligacion_snapshot',
          entidadId: grupoFacturaId,
          descripcion:
            'Obligación de Orden de Pago regularizada mediante Recibo por Honorarios.',
          empresaCodigo: input.usuario?.empresaCodigo ?? null,
          usuario: input.usuario,
          antes: {
            grupoFacturaId,
            estadoRegularizacion: 'PENDIENTE',
          },
          despues: {
            grupoFacturaId,
            documentoRegularizadorId: documentoId,
            grupoFacturaDocumentoId:
              asociacion.documentoGrupoFactura.id,
            tipoDocumentoRegularizador: 'RECIBO_HONORARIO',
            tipoRelacion: 'regularizador_recibo_honorario',
            estadoRegularizacion: 'REGULARIZADO',
          },
        },
        tx,
      );

      return {
        grupoFacturaId,
        documentoId,
        tipoRelacion: 'regularizador_recibo_honorario' as const,
        estadoRegularizacion: 'REGULARIZADO' as const,
        idempotente: asociacion.idempotente,
      };
    });
  }
}
