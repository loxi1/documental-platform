import { Injectable } from '@nestjs/common';

import type { ContenedorOperativoCompatibilidadView } from '../adapters/v1-v2-compatibility.types';
import type { JsonObject } from '../documental-v2.types';
import type { WorkspaceDocumentalV2View } from '../use-cases/workspace-documental-v2.types';
import { tipoContextoLabel } from './documental-v2-labels';
import { DocumentoVisualMapper } from './documento-visual.mapper';

@Injectable()
export class WorkspaceDocumentalV2ViewMapper {
  constructor(private readonly documentoVisualMapper: DocumentoVisualMapper) {}

  enriquecer(workspace: WorkspaceDocumentalV2View): WorkspaceDocumentalV2View {
    return {
      ...workspace,
      compatibilidad: {
        ...workspace.compatibilidad,
        contenedorOperativo: this.enriquecerContenedor(
          workspace.compatibilidad.contenedorOperativo,
        ),
        documentosOperativosPrincipales:
          workspace.compatibilidad.documentosOperativosPrincipales.map((documento) =>
            this.documentoVisualMapper.enriquecerDocumentoOperativoPrincipal(documento),
          ),
        gruposFactura: workspace.compatibilidad.gruposFactura.map((grupo) =>
          this.documentoVisualMapper.enriquecerGrupoFactura(grupo),
        ),
        adjuntosNoClasificados: workspace.compatibilidad.adjuntosNoClasificados.map((adjunto) =>
          this.documentoVisualMapper.enriquecerAdjuntoNoClasificado(adjunto),
        ),
      },
      contenedorOperativo: {
        ...workspace.contenedorOperativo,
        vista: this.enriquecerContenedor(workspace.contenedorOperativo.vista),
      },
      documentosOperativosPrincipales: workspace.documentosOperativosPrincipales.map(
        (documento) => ({
          ...documento,
          vista: this.documentoVisualMapper.enriquecerDocumentoOperativoPrincipal(documento.vista),
        }),
      ),
      gruposFactura: workspace.gruposFactura.map((grupo) => {
        const vista = this.documentoVisualMapper.enriquecerGrupoFactura(grupo.vista);

        return {
          ...grupo,
          vista,
          documentos: grupo.documentos.map((documento) => ({
            ...documento,
            vista: this.documentoVisualMapper.enriquecerGrupoFacturaDocumento(documento.vista),
          })),
        };
      }),
      adjuntosNoClasificados: workspace.adjuntosNoClasificados.map((adjunto) => ({
        ...adjunto,
        vista: this.documentoVisualMapper.enriquecerAdjuntoNoClasificado(adjunto.vista),
      })),
    };
  }

  private enriquecerContenedor(
    contenedor: ContenedorOperativoCompatibilidadView,
  ): ContenedorOperativoCompatibilidadView {
    return {
      ...contenedor,
      clienteDestinoNombre: this.pickString(contenedor.metadata, 'clienteDestinoNombre'),
      tipoContextoLabel: tipoContextoLabel(contenedor.tipoContexto),
      periodoRevision: this.pickString(contenedor.metadata, 'periodoRevision'),
      fechaCreacion: this.normalizeDate(contenedor.metadata?.fechaCreacion),
    };
  }

  private pickString(source: JsonObject | null | undefined, key: string): string | null {
    const value = source?.[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return null;
  }

  private normalizeDate(value: unknown): string | null {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }

    if (typeof value !== 'string') return null;

    const clean = value.trim();
    if (!clean) return null;

    const parsed = new Date(clean);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

    return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : null;
  }
}
