import { BuscarContextosOpService } from './finanzas/buscar-contextos-op.service';
import { OrdenPagoController } from './finanzas/orden-pago.controller';
import { OrdenPagoService } from './finanzas/orden-pago.service';
import { ExpedientesRepository } from '../expedientes/expedientes.repository';
import { Module } from '@nestjs/common';

import { DocumentalV2Controller } from './documental-v2.controller';

import { ContenedorOperativoRepository } from './contenedor-operativo.repository';
import { ContenedorOperativoService } from './contenedor-operativo.service';
import { DocumentoOperativoPrincipalRepository } from './documento-operativo-principal.repository';
import { DocumentoOperativoPrincipalService } from './documento-operativo-principal.service';
import { GrupoFacturaDocumentoRepository } from './grupo-factura-documento.repository';
import { GrupoFacturaDocumentoService } from './grupo-factura-documento.service';
import { GrupoFacturaRepository } from './grupo-factura.repository';
import { CatalogoConceptosObligacionRepository } from './catalogo-conceptos-obligacion.repository';
import { ObligacionesSnapshotRepository } from './obligaciones-snapshot.repository';
import { RegularizadoresObligacionRepository } from './regularizadores-obligacion.repository';
import { ConfigProveedoresConceptoOpRepository } from './config-proveedores-concepto-op.repository';
import { ConfigBeneficiariosRendicionOpRepository } from './config-beneficiarios-rendicion-op.repository';
import { GrupoFacturaService } from './grupo-factura.service';
import { V1DocumentalReadOnlyRepository } from './adapters/v1-documental-readonly.repository';
import { V1V2CompatibilityAdapter } from './adapters/v1-v2-compatibility.adapter';
import { DocumentoVisualMapper } from './mappers/documento-visual.mapper';
import { WorkspaceDocumentalV2ViewMapper } from './mappers/workspace-documental-v2-view.mapper';
import { WorkspaceDocumentalV2UseCase } from './use-cases/workspace-documental-v2.usecase';
import { DocumentoExistenteReadonlyRepository } from './documento-existente-readonly.repository';
import { AsociarDocumentoPrincipalV2UseCase } from './use-cases/asociar-documento-principal-v2.usecase';
import { AsociarGrupoFacturaV2UseCase } from './use-cases/asociar-grupo-factura-v2.usecase';
import { AsociarDocumentoGrupoFacturaV2UseCase } from './use-cases/asociar-documento-grupo-factura-v2.usecase';
import { RegularizarObligacionOpFacturaUseCase } from './use-cases/regularizar-obligacion-op-factura.usecase';
import { AuditoriaOperativaV2Repository } from './auditoria-operativa-v2.repository';
import { TrazabilidadV2Repository } from './trazabilidad-v2.repository';
import { TrazabilidadV2ProjectionMapper } from './trazabilidad-v2.projection.mapper';
import { ConsultarTrazabilidadV2UseCase } from './use-cases/consultar-trazabilidad-v2.usecase';
import { MaterializarContextoOperativoV2UseCase } from './use-cases/materializar-contexto-operativo-v2.usecase';
import { AnularContenedorOperativoV2UseCase } from './use-cases/anular-contenedor-operativo-v2.usecase';
import {
  CorrespondenciaDocumentoReadonlyPort,
  EvaluarCorrespondenciaPagoFacturaUseCase,
} from './finanzas/evaluar-correspondencia-pago-factura.usecase';

@Module({
  controllers: [DocumentalV2Controller, OrdenPagoController],
  providers: [
    OrdenPagoService, BuscarContextosOpService, ExpedientesRepository,
    ContenedorOperativoRepository,
    DocumentoOperativoPrincipalRepository,
    GrupoFacturaRepository,
    CatalogoConceptosObligacionRepository,
    ObligacionesSnapshotRepository,
    RegularizadoresObligacionRepository,
    ConfigProveedoresConceptoOpRepository,
    ConfigBeneficiariosRendicionOpRepository,
    GrupoFacturaDocumentoRepository,
    ContenedorOperativoService,
    DocumentoOperativoPrincipalService,
    GrupoFacturaService,
    GrupoFacturaDocumentoService,
    V1DocumentalReadOnlyRepository,
    V1V2CompatibilityAdapter,
    DocumentoVisualMapper,
    WorkspaceDocumentalV2ViewMapper,
    WorkspaceDocumentalV2UseCase,
    DocumentoExistenteReadonlyRepository,
    {
      provide: CorrespondenciaDocumentoReadonlyPort,
      useExisting: DocumentoExistenteReadonlyRepository,
    },
    AsociarDocumentoPrincipalV2UseCase,
    AsociarGrupoFacturaV2UseCase,
    AsociarDocumentoGrupoFacturaV2UseCase,
    RegularizarObligacionOpFacturaUseCase,
    AuditoriaOperativaV2Repository,
    TrazabilidadV2Repository,
    TrazabilidadV2ProjectionMapper,
    ConsultarTrazabilidadV2UseCase,
    MaterializarContextoOperativoV2UseCase,
    AnularContenedorOperativoV2UseCase,
    EvaluarCorrespondenciaPagoFacturaUseCase,
  ],
  exports: [
    OrdenPagoService,
    ContenedorOperativoRepository,
    DocumentoOperativoPrincipalRepository,
    GrupoFacturaRepository,
    GrupoFacturaDocumentoRepository,
    ContenedorOperativoService,
    DocumentoOperativoPrincipalService,
    GrupoFacturaService,
    GrupoFacturaDocumentoService,
    V1DocumentalReadOnlyRepository,
    V1V2CompatibilityAdapter,
    DocumentoVisualMapper,
    WorkspaceDocumentalV2ViewMapper,
    WorkspaceDocumentalV2UseCase,
    AuditoriaOperativaV2Repository,
    TrazabilidadV2Repository,
    TrazabilidadV2ProjectionMapper,
    ConsultarTrazabilidadV2UseCase,
    DocumentoExistenteReadonlyRepository,
    MaterializarContextoOperativoV2UseCase,
    AsociarDocumentoPrincipalV2UseCase,
    AsociarGrupoFacturaV2UseCase,
    AsociarDocumentoGrupoFacturaV2UseCase,
  ],
})
export class DocumentalV2Module {}
