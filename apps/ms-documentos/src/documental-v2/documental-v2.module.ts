import { Module } from '@nestjs/common';

import { ContenedorOperativoRepository } from './contenedor-operativo.repository';
import { DocumentoOperativoPrincipalRepository } from './documento-operativo-principal.repository';
import { GrupoFacturaDocumentoRepository } from './grupo-factura-documento.repository';
import { GrupoFacturaRepository } from './grupo-factura.repository';

@Module({
  providers: [
    ContenedorOperativoRepository,
    DocumentoOperativoPrincipalRepository,
    GrupoFacturaRepository,
    GrupoFacturaDocumentoRepository,
  ],
  exports: [
    ContenedorOperativoRepository,
    DocumentoOperativoPrincipalRepository,
    GrupoFacturaRepository,
    GrupoFacturaDocumentoRepository,
  ],
})
export class DocumentalV2Module {}
