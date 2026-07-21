import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

import {
  CARGA_SEGURA_HTTP_MAX_FILE_SIZE_BYTES,
  CARGA_SEGURA_HTTP_MAX_FILES,
  CARGA_SEGURA_HTTP_MAX_METADATA_BYTES,
} from './carga-segura-http.constants';

export const CARGA_SEGURA_MULTER_FIELDS = [
  {
    name: 'archivo',
    maxCount: 1,
  },
  {
    name: 'file',
    maxCount: 1,
  },
] as const;

export const CARGA_SEGURA_MULTER_OPTIONS: MulterOptions = {
  limits: {
    fileSize: CARGA_SEGURA_HTTP_MAX_FILE_SIZE_BYTES,
    files: CARGA_SEGURA_HTTP_MAX_FILES,
    fields: 6,
    parts: 8,
    fieldSize: CARGA_SEGURA_HTTP_MAX_METADATA_BYTES,
  },
  preservePath: false,
};
