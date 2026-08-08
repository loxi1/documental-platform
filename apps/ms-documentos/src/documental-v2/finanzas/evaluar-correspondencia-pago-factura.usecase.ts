import { Injectable, NotFoundException } from '@nestjs/common';

import {
  adaptarFacturaCorrespondencia,
  adaptarPagoCorrespondencia,
  DocumentoCorrespondenciaSnapshot,
} from './correspondencia-pago-factura.adapter';
import { evaluarCorrespondenciaPagoFactura } from './correspondencia-pago-factura.evaluator';
import { EvaluacionCorrespondenciaPagoFactura } from './correspondencia-pago-factura.types';
import type { SqlExecutor } from '../sql-executor';

export abstract class CorrespondenciaDocumentoReadonlyPort {
  abstract buscarSnapshot(
    documentoId: number,
    executor?: SqlExecutor,
  ): Promise<DocumentoCorrespondenciaSnapshot | null>;
}

@Injectable()
export class EvaluarCorrespondenciaPagoFacturaUseCase {
  constructor(
    private readonly documentos: CorrespondenciaDocumentoReadonlyPort,
  ) {}

  async execute(input: {
    facturaDocumentoId: number;
    pagoDocumentoId?: number | null;
  }, executor?: SqlExecutor): Promise<EvaluacionCorrespondenciaPagoFactura> {
    const factura = await this.documentos.buscarSnapshot(
      input.facturaDocumentoId,
      executor,
    );

    if (!factura) {
      throw new NotFoundException({
        code: 'FACTURA_NO_ENCONTRADA',
        message: `Factura ${input.facturaDocumentoId} no encontrada.`,
      });
    }

    if (factura.tipoDocumental.toUpperCase() !== 'FACTURA') {
      throw new NotFoundException({
        code: 'DOCUMENTO_NO_ES_FACTURA',
        message: `El documento ${input.facturaDocumentoId} no es una factura.`,
      });
    }

    if (!input.pagoDocumentoId) {
      return evaluarCorrespondenciaPagoFactura(
        adaptarFacturaCorrespondencia(factura),
        null,
      );
    }

    const pago = await this.documentos.buscarSnapshot(input.pagoDocumentoId, executor);

    if (!pago) {
      throw new NotFoundException({
        code: 'SUSTENTO_PAGO_NO_ENCONTRADO',
        message: `Sustento de pago ${input.pagoDocumentoId} no encontrado.`,
      });
    }

    const tipoPago = pago.tipoDocumental.toUpperCase();
    if (!['TRANSFERENCIA', 'PAGO_TRANSFERENCIA'].includes(tipoPago)) {
      throw new NotFoundException({
        code: 'DOCUMENTO_NO_ES_SUSTENTO_PAGO',
        message: `El documento ${input.pagoDocumentoId} no es una transferencia.`,
      });
    }

    return evaluarCorrespondenciaPagoFactura(
      adaptarFacturaCorrespondencia(factura),
      adaptarPagoCorrespondencia(pago),
    );
  }
}
