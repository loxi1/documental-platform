
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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


  async findArchivosByDocumentoId(documentoId: number) {
    const doc = await this.repo.findById(documentoId);

    if (!doc) {
      throw new NotFoundException(`Documento ${documentoId} no encontrado`);
    }

    const archivos = await this.repo.findArchivosByDocumentoId(documentoId);

    return {
      documentoId,
      documento: {
        id: Number(doc.id),
        clienteAbreviatura: doc.cliente_abreviatura ?? null,
        tipoDocumental: doc.tipo_documental ?? null,
        serie: doc.serie ?? null,
        numero: doc.numero ?? null,
        claveDocumental: doc.clave_documental ?? null,
        estado: doc.estado ?? null,
        fechaEmision: doc.fecha_emision ?? null,
        rucEmisor: doc.ruc_emisor ?? null,
        razonSocialEmisor: doc.razon_social_emisor ?? null,
      },
      total: archivos.length,
      archivos,
      data: archivos,
    };
  }

  async getArchivoScope(archivoId: number) {
    const archivo = await this.repo.findArchivoById(archivoId);

    if (!archivo) {
      throw new NotFoundException(`Archivo ${archivoId} no encontrado`);
    }

    return {
      archivoId: Number(archivo.id),
      documentoId: archivo.documento_id ? Number(archivo.documento_id) : null,
      clienteAbreviatura: archivo.cliente_abreviatura ?? null,
      nombreArchivo: archivo.nombre_archivo ?? null,
      storageProvider: archivo.storage_provider ?? null,
    };
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

  async procesarOcrArchivo(
    archivoId: number,
    contexto: {
      tipoEsperado?: string;
      areaOrigen?: string;
      expedienteId?: number;
      documentoBaseId?: number;
      tipoRelacionSugerida?: string;
      canalIngreso?: string;
      reprocesar?: boolean;
    } = {},
  ) {
    const archivo = await this.repo.findArchivoById(archivoId);

    if (!archivo) {
      throw new NotFoundException(`Archivo ${archivoId} no encontrado`);
    }

    const clienteAbreviatura = String(
      archivo.cliente_abreviatura ?? '',
    ).trim().toUpperCase();

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

      tipoEsperado: contexto.tipoEsperado ?? null,
      areaOrigen: contexto.areaOrigen ?? null,
      expedienteId: contexto.expedienteId ?? null,
      documentoBaseId: contexto.documentoBaseId ?? null,
      tipoRelacionSugerida: contexto.tipoRelacionSugerida ?? null,
      canalIngreso: contexto.canalIngreso ?? null,
    };

    const result = this.limpiarCamposLegacyOcr(
      await firstValueFrom(
        this.nats.send(NatsSubjects.OcrProcesarArchivo, payload),
      ),
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
        forceReprocess: contexto.reprocesar === true,
      });

      return {
        ...result,
        expedienteId: saved?.row?.expediente_id ?? saved?.expediente?.id ?? null,
        expedienteVinculado: saved?.expediente ?? null,
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
    cliente?: string;
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

  async confirmarOcrResultadoConExpediente(
    id: number,
    input: {
      expedienteId: number;
      tipoRelacion?: string;
      esPrincipal?: boolean;
      orden?: number;
      metadata?: Record<string, any>;
      observacion?: string;
    },
    usuarioId?: number,
  ) {
    if (!input?.expedienteId) {
      throw new BadRequestException('El expediente es obligatorio para confirmar el OCR');
    }

    try {
      const confirmado = await this.repo.confirmarOcrResultadoConExpediente(
        id,
        input,
        usuarioId,
      );

      if (!confirmado) {
        throw new NotFoundException(`Resultado OCR ${id} no encontrado`);
      }

      return confirmado;
    } catch (error: any) {
      if (error?.code === 'DOCUMENTO_DUPLICADO_EN_EXPEDIENTE') {
        throw new ConflictException({
          code: error.code,
          message: error.message,
          details: error.details ?? null,
        });
      }

      if (error?.code === 'OCR_VALIDACION_INVALIDA') {
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details ?? null,
        });
      }

      if (error?.code === 'EXPEDIENTE_NO_ENCONTRADO') {
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details ?? null,
        });
      }

      throw error;
    }
  }


  async agregarArchivoComoVersion(
    documentoId: number,
    archivoId: number,
    input: {
      tipoVersion?: string;
      observacion?: string;
      marcarComoActual?: boolean;
    } = {},
    usuarioId?: number,
  ) {
    try {
      return await this.repo.agregarArchivoComoVersion({
        documentoId,
        archivoId,
        tipoVersion: input.tipoVersion ?? 'evidencia',
        observacion: input.observacion ?? null,
        marcarComoActual: input.marcarComoActual !== false,
        usuarioId: usuarioId ?? null,
      });
    } catch (error: any) {
      if (error?.code === 'DOCUMENTO_NO_ENCONTRADO') {
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details ?? null,
        });
      }

      if (error?.code === 'ARCHIVO_NO_ENCONTRADO') {
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details ?? null,
        });
      }

      throw error;
    }
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
      clienteDestinoId: number;
      empresaCodigo: string;
      codigoExpediente: string;
      descripcion?: string | null;
      metadata?: Record<string, any> | null;
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

    const expediente = await this.repo.createExpedienteDesdeOcr({
      ocrResultadoId: id,
      clienteDestinoId: body.clienteDestinoId,
      empresaCodigo: body.empresaCodigo,
      codigoExpediente: body.codigoExpediente,
      descripcion: body.descripcion,
      metadata: body.metadata,
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

  async rechazarOcrResultado(
    id: number,
    motivo?: string,
    usuarioId?: number,
  ) {
    const motivoFinal = motivo?.trim() || 'Rechazado por usuario';

    return this.repo.rechazarOcrResultado(
      id,
      motivoFinal,
      usuarioId,
    );
  }


  async actualizarDocumentoManual(
    id: number,
    input: {
      tipoDocumental?: string;
      metadata?: Record<string, any>;
      observacion?: string;
    },
    usuarioId?: number,
  ) {
    const actualizado = await this.repo.actualizarDocumentoManual(id, input, usuarioId);

    if (!actualizado) {
      throw new NotFoundException(`Documento ${id} no encontrado`);
    }

    return {
      id: actualizado.id,
      estado: actualizado.estado,
      tipoDocumental: actualizado.tipo_documental,
      claveDocumental: actualizado.clave_documental,
      numero: actualizado.numero,
      fechaEmision: actualizado.fecha_emision,
      moneda: actualizado.moneda,
      montoTotal: actualizado.monto_total,
      metadata: actualizado.metadata?.ocr?.metadata ?? actualizado.metadata ?? {},
    };
  }

  async editarOcrResultado(
    id: number,
    input: {
      tipoPropuesto?: string;
      metadata?: Record<string, any>;
      observacion?: string;
    },
    usuarioId?: number,
  ) {
    const editado = await this.repo.editarOcrResultado(id, input, usuarioId);

    if (!editado) {
      throw new NotFoundException(`Resultado OCR ${id} no encontrado`);
    }

    return {
      id: editado.id,
      estado: editado.estado,
      documentoId: editado.documento_id,
      tipoDocumental: editado.tipo_propuesto,
      claveDocumental: editado.clave_documental,
      metadata: editado.metadata?.metadata ?? {},
      metadataSource: editado.metadata?.metadataSource ?? {},
      audit: editado.metadata?.audit ?? [],
    };
  }
  private limpiarCamposLegacyOcr<T>(value: T): T {
    const legacyKeys = new Set([
      'tipoCodigoExpediente',
      'codigoOp',
      'codigoCentroCosto',
      'proveedorRuc',
      'compradorRuc',
    ]);

    if (Array.isArray(value)) {
      return value.map((item) => this.limpiarCamposLegacyOcr(item)) as T;
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .filter(([key]) => !legacyKeys.has(key))
          .map(([key, item]) => [key, this.limpiarCamposLegacyOcr(item)]),
      ) as T;
    }

    return value;
  }

}
