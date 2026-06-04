
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
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

    const payload = {
      documentoId: archivo.documento_id,
      archivoId: archivo.id,
      clienteAbreviatura: archivo.cliente_abreviatura,
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
        ocrResultadoId: saved?.id,
        estado: 'pendiente_validacion',
        requiereValidacionUsuario: true,
      };
    }

    return result;
  }
}
