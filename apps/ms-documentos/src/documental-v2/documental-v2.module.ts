import { Module } from '@nestjs/common';

import { DocumentalV2Controller } from './documental-v2.controller';

import { ContenedorOperativoRepository } from './contenedor-operativo.repository';
import { ContenedorOperativoService } from './contenedor-operativo.service';
import { DocumentoOperativoPrincipalRepository } from './documento-operativo-principal.repository';
import { DocumentoOperativoPrincipalService } from './documento-operativo-principal.service';
import { GrupoFacturaDocumentoRepository } from './grupo-factura-documento.repository';
import { GrupoFacturaDocumentoService } from './grupo-factura-documento.service';
import { GrupoFacturaRepository } from './grupo-factura.repository';
import { GrupoFacturaService } from './grupo-factura.service';
import { V1DocumentalReadOnlyRepository } from './adapters/v1-documental-readonly.repository';
import { V1V2CompatibilityAdapter } from './adapters/v1-v2-compatibility.adapter';
import { WorkspaceDocumentalV2UseCase } from './use-cases/workspace-documental-v2.usecase';

@Module({
  controllers: [DocumentalV2Controller],
  providers: [
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
    WorkspaceDocumentalV2UseCase,
  ],
  exports: [
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
    WorkspaceDocumentalV2UseCase,
  ],
})
export class DocumentalV2Module {}
