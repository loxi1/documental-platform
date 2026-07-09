import { Module } from '@nestjs/common';

import { ContenedorOperativoRepository } from './contenedor-operativo.repository';
import { ContenedorOperativoService } from './contenedor-operativo.service';
import { DocumentoOperativoPrincipalRepository } from './documento-operativo-principal.repository';
import { DocumentoOperativoPrincipalService } from './documento-operativo-principal.service';
import { GrupoFacturaDocumentoRepository } from './grupo-factura-documento.repository';
import { GrupoFacturaDocumentoService } from './grupo-factura-documento.service';
import { GrupoFacturaRepository } from './grupo-factura.repository';
import { GrupoFacturaService } from './grupo-factura.service';

@Module({
  providers: [
    ContenedorOperativoRepository,
    DocumentoOperativoPrincipalRepository,
    GrupoFacturaRepository,
    GrupoFacturaDocumentoRepository,
    ContenedorOperativoService,
    DocumentoOperativoPrincipalService,
    GrupoFacturaService,
    GrupoFacturaDocumentoService,
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
  ],
})
export class DocumentalV2Module {}
