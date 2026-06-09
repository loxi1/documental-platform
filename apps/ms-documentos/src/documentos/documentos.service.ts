
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { NatsSubjects } from '@documental/shared';
import { NATS_CLIENT } from '../nats/nats-client.provider';

import {
  DocumentosFilters,
  DocumentosRepository,
} from './documentos.repository';

@Injectable()
export class DocumentosService {
  constructor(
    private readonly repo: DocumentosRepository,
    @Inject(NATS_CLIENT)
    private readonly nats: ClientProxy,
  ) {}

  findAll(filters: DocumentosFilters) {
    return this.repo.findAll(filters);
  }

  async findById(id: number) {
    const doc = await this.repo.findById(id);

    if (!doc) {
      throw new NotFoundException(`Documento ${id} no encontrado`);
    }

    return doc;
  }

  getTipos() {
    return this.repo.getTipos();
  }

    getClientesDestino() {
    return this.repo.getClientesDestino();
  }

  getProveedores(search?: string, limit?: number, offset?: number) {
    return this.repo.getProveedores(search, limit, offset);
  }

  async procesarOcrArchivo(archivoId: number) {
    const archivo = await this.repo.findArchivoById(archivoId);

    if (!archivo) {
      throw new NotFoundException(`Archivo ${archivoId} no encontrado`);
    }

    const clienteAbreviatura = String(archivo.cliente_abreviatura ?? '').trim().toUpperCase();

    if (!clienteAbreviatura) {
      throw new BadRequestException(
        `El archivo ${archivoId} no tiene cliente_abreviatura. No se puede procesar OCR sin empresa destino.`,
      );
    }

    const payload = {
      documentoId: archivo.documento_id,
      archivoId: archivo.id,
      clienteAbreviatura,
      storageProvider: archivo.storage_provider ?? 'local',
      storageKey: archivo.storage_key ?? archivo.ruta_archivo,
      tipoSolicitud: 'clasificar_extraer',
    };

    const result = await firstValueFrom(
      this.nats.send(NatsSubjects.OcrProcesarArchivo, payload),
    );

    if (result?.ok) {
      const saved = await this.repo.saveOcrResultado({
        archivoId: archivo.id,
        documentoId: archivo.documento_id ?? null,
        tipoPropuesto: result.tipoDocumental ?? null,
        estado: 'pendiente_validacion',
        confidence: result.confidence ?? null,
        claveDocumental: result.claveDocumental ?? null,
        metadata: result,
      });

      return {
        ...result,
        ocrResultadoId: saved?.row?.id,
        ocrResultadoYaExistia: saved?.yaExistia ?? false,
        ocrResultadoMotivo: saved?.motivo ?? null,
        estado: 'pendiente_validacion',
        requiereValidacionUsuario: true,
      };
    }

    return result;
  }

  findOcrResultados(filters: {
    estado?: string;
    limit?: number;
    offset?: number;
    soloNoVinculados?: boolean;
  }) {
    return this.repo.findOcrResultados(filters);
  }

  async findOcrResultadoById(id: number) {
    const result = await this.repo.findOcrResultadoById(id);

    if (!result) {
      throw new NotFoundException(`Resultado OCR ${id} no encontrado`);
    }

    return result;
  }

  async confirmarOcrResultado(id: number, usuarioId?: number) {
    const result = await this.repo.findOcrResultadoById(id);

    if (!result) {
      throw new NotFoundException(`Resultado OCR ${id} no encontrado`);
    }

    const metadata = result.metadata;
    const extracted = metadata?.metadata ?? {};

    await this.repo.updateDocumentoOcrResult({
      documentoId: result.documento_id,
      tipoDocumental: result.tipo_propuesto,
      estado: 'confirmado',
      metadata,
    });

    const confirmado = await this.repo.confirmarOcrResultado(id, usuarioId);

    return {
      id: confirmado.id,
      estado: confirmado.estado,
      documentoId: result.documento_id,
      tipoDocumental: result.tipo_propuesto,
      claveDocumental: result.clave_documental,
      metadata: extracted,
    };
  }

  createDocumentoRelacion(data: {
    documentoOrigenId: number;
    documentoDestinoId: number;
    tipoRelacion: string;
    metadata?: unknown;
  }) {
    return this.repo.createDocumentoRelacion(data);
  }

  findDocumentoRelaciones(documentoId: number) {
    return this.repo.findDocumentoRelaciones(documentoId);
  }

  async crearExpedienteDesdeOcr(
    id: number,
    body: {
      correlativo: string;
      empresaCodigo: string;
      tipoExpediente: string;
      descripcion?: string | null;
      codigoCentroCosto?: string | null;
      codigoOp?: string | null;
      tipoRelacionPrincipal?: string;
    },
  ) {
    const result = await this.repo.findOcrResultadoById(id);

    if (!result) {
      throw new NotFoundException(`Resultado OCR ${id} no encontrado`);
    }

    if (!result.documento_id) {
      throw new NotFoundException(
        `Resultado OCR ${id} no tiene documento asociado`,
      );
    }

    const tipoRelacionPrincipal =
      body.tipoRelacionPrincipal ??
      `principal_${String(result.tipo_propuesto ?? 'documento').toLowerCase()}`;

    const expediente =
      await this.repo.createExpedienteDesdeOcr({
        ocrResultadoId: id,
        correlativo: body.correlativo,
        empresaCodigo: body.empresaCodigo,
        tipoExpediente: body.tipoExpediente,
        descripcion: body.descripcion,
        codigoCentroCosto: body.codigoCentroCosto,
        codigoOp: body.codigoOp,
        clavePrincipal: result.clave_documental,
        tipoRelacionPrincipal,
      });

    if (!expediente) {
      throw new NotFoundException(`No se pudo crear expediente desde OCR ${id}`);
    }

    return {
      expediente,
      documentoId: result.documento_id,
      ocrResultadoId: id,
      tipoRelacionPrincipal,
    };
  }

  async sugerirExpedienteParaOcr(id: number) {
    const result = await this.repo.sugerirExpedienteParaOcr(id);

    if (!result) {
      throw new NotFoundException(`Resultado OCR ${id} no encontrado`);
    }

    return result.sugerencia;
  }

  async vincularOcrAExpediente(
    id: number,
    body: {
      expedienteId: number;
      tipoRelacion: string;
      esPrincipal?: boolean;
      orden?: number;
    },
  ) {
    const result = await this.repo.vincularOcrAExpediente({
      ocrResultadoId: id,
      expedienteId: body.expedienteId,
      tipoRelacion: body.tipoRelacion,
      esPrincipal: body.esPrincipal ?? false,
      orden: body.orden ?? 0,
    });

    if (!result) {
      throw new NotFoundException(`Resultado OCR ${id} no encontrado`);
    }

    if (result?.yaVinculado) {
      return {
        ok: false,
        mensaje: 'Documento OCR ya vinculado a otro expediente',
        expedienteId: result.expedienteId,
      };
    }

    return {
      ocrResultadoId: id,
      expedienteId: body.expedienteId,
      documentoId: result.ocr.documento_id,
      tipoRelacion: body.tipoRelacion,
      esPrincipal: body.esPrincipal ?? false,
      orden: body.orden ?? 0,
      vinculo: result.vinculo,
    };
  }

  createDocumentoAlerta(
    documentoId: number,
    data: {
      tipoAlerta: string;
      mensaje?: string | null;
    },
  ) {
    return this.repo.createDocumentoAlerta({
      documentoId,
      tipoAlerta: data.tipoAlerta,
      mensaje: data.mensaje,
    });
  }

  findDocumentoAlertas(documentoId: number) {
    return this.repo.findDocumentoAlertas(documentoId);
  }

  async resolverDocumentoAlerta(
    documentoId: number,
    alertaId: number,
  ) {
    const alerta = await this.repo.resolverDocumentoAlerta({
      documentoId,
      alertaId,
    });

    if (!alerta) {
      throw new NotFoundException(
        `Alerta ${alertaId} no encontrada para documento ${documentoId}`,
      );
    }

    return alerta;
  }
}
