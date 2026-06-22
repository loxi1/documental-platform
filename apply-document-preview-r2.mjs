#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function write(rel, content) {
  fs.writeFileSync(path.join(root, rel), content);
}

function ensureIncludes(rel, marker, patchFn) {
  const file = path.join(root, rel);
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes(marker)) {
    console.log(`skip ${rel}: already patched`);
    return;
  }
  content = patchFn(content);
  fs.writeFileSync(file, content);
  console.log(`patched ${rel}`);
}

// 1) ms-documentos DocumentosModule provider
ensureIncludes(
  'apps/ms-documentos/src/documentos/documentos.module.ts',
  'DocumentosPreviewService',
  (content) => {
    content = content.replace(
      "import { DocumentosRepository } from './documentos.repository';",
      "import { DocumentosRepository } from './documentos.repository'; import { DocumentosPreviewService } from './documentos-preview.service';",
    );
    content = content.replace(
      'providers: [DocumentosService, DocumentosRepository]',
      'providers: [DocumentosService, DocumentosRepository, DocumentosPreviewService]',
    );
    return content;
  },
);

// 2) ms-documentos DocumentosController endpoint
ensureIncludes(
  'apps/ms-documentos/src/documentos/documentos.controller.ts',
  'getArchivoPreviewUrl',
  (content) => {
    content = content.replace(
      "import { DocumentosService } from './documentos.service';",
      "import { DocumentosService } from './documentos.service'; import { DocumentosPreviewService } from './documentos-preview.service';",
    );
    content = content.replace(
      'constructor(private readonly service: DocumentosService) {}',
      'constructor(private readonly service: DocumentosService, private readonly preview: DocumentosPreviewService) {}',
    );
    const endpoint = "@ApiOperation({ summary: 'Generar URL temporal de preview para archivo privado R2' }) @Get('archivos/:archivoId/preview-url') getArchivoPreviewUrl( @Param('archivoId', ParseIntPipe) archivoId: number, ) { return this.preview.getArchivoPreviewUrl(archivoId); } ";
    content = content.replace(
      "@Post('archivos/:archivoId/procesar-ocr')",
      `${endpoint}@Post('archivos/:archivoId/procesar-ocr')`,
    );
    return content;
  },
);

// 3) api-gateway DocumentosGatewayController endpoint
ensureIncludes(
  'apps/api-gateway/src/documentos/documentos.controller.ts',
  'preview-url',
  (content) => {
    const endpoint = "@ApiOperation({ summary: 'Generar URL temporal de preview de archivo vía API Gateway' }) @Get('archivos/:archivoId/preview-url') getArchivoPreviewUrl( @Headers('authorization') authorization: string | undefined, @Headers(REQUEST_ID_HEADER) requestId: string | undefined, @Param('archivoId') archivoId: string, ) { return this.proxy({ method: 'GET', path: `/documentos/archivos/${archivoId}/preview-url`, authorization, requestId, }); } ";
    content = content.replace(
      "@ApiOperation({ summary: 'Procesar OCR de archivo vía API Gateway' }) @Post('archivos/:archivoId/procesar-ocr')",
      `${endpoint}@ApiOperation({ summary: 'Procesar OCR de archivo vía API Gateway' }) @Post('archivos/:archivoId/procesar-ocr')`,
    );
    return content;
  },
);

console.log('\nDocument Preview R2 patch applied.');
console.log('Now ensure AWS SDK packages are installed for @documental/ms-documentos.');
