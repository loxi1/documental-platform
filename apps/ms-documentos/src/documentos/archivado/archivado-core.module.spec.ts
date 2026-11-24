jest.mock('@documental/database',()=>({sql:jest.fn()}));
jest.mock('@documental/shared',()=>({NatsSubjects:{AuthValidateToken:'auth.validate-token'}}));
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ArchivadoCoreModule } from './archivado-core.module';
import { ArchivadoRuntimeService } from './archivado-runtime.service';
import { ArchivadoDocumentalService } from './archivado-documental.service';
import { R2CargaSeguraStorage } from '../carga-segura/carga-segura.storage';
import { NATS_CLIENT } from '../../nats/nats-client.provider';
import { CARGA_SEGURA_STORAGE } from '../carga-segura/carga-segura.constants';
describe('Archivado DI unico sin dependencias circulares',()=>{
 it('core comparte almacenamiento y runtime sin crear clientes reales',async()=>{
  const storage={},nats={send:jest.fn()};
  const module=await Test.createTestingModule({imports:[ConfigModule.forRoot({isGlobal:true,ignoreEnvFile:true,ignoreEnvVars:true}),ArchivadoCoreModule]})
    .overrideProvider(R2CargaSeguraStorage).useValue(storage)
    .overrideProvider(NATS_CLIENT).useValue(nats).compile();
  expect(module.get(CARGA_SEGURA_STORAGE)).toBe(storage);
  expect(module.get(ArchivadoRuntimeService)).toBe(module.get(ArchivadoRuntimeService));
  expect(module.get(ArchivadoDocumentalService)).toBeDefined();
  expect(nats.send).not.toHaveBeenCalled();await module.close();
 });
});
