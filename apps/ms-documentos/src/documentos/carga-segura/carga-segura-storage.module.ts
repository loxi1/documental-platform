import { Module } from '@nestjs/common';
import { R2CargaSeguraStorage } from './carga-segura.storage';
import { CARGA_SEGURA_STORAGE } from './carga-segura.constants';
@Module({
  providers: [R2CargaSeguraStorage, { provide: CARGA_SEGURA_STORAGE, useExisting: R2CargaSeguraStorage }],
  exports: [R2CargaSeguraStorage, CARGA_SEGURA_STORAGE],
})
export class CargaSeguraStorageModule {}
