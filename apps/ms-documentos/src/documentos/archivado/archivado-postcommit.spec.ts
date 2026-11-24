import { ArchivadoPostcommit } from './archivado-postcommit';
describe('Archivado: frontera commit y aislamiento',()=>{
  it('procesa solo despues del commit y deduplica identidades',async()=>{
    const s=new ArchivadoPostcommit(),events:any[]=[];
    s.conectar(async (ids)=>{events.push(ids)});
    const result=await s.ejecutar(async()=>{s.registrar(10,110);s.registrar(10,110);s.registrar(20,120);expect(events).toEqual([]);return 'committed'});
    expect(result).toBe('committed');expect(events).toEqual([[10,20]]);
  });
  it('rollback nunca llama al motor',async()=>{
    const s=new ArchivadoPostcommit(),run=jest.fn();s.conectar(run);
    await expect(s.ejecutar(async()=>{s.registrar(1,101);throw new Error('rollback')})).rejects.toThrow('rollback');
    expect(run).not.toHaveBeenCalled();
  });
  it('fallo NAS no revierte el resultado documental',async()=>{
    const s=new ArchivadoPostcommit();s.conectar(async()=>{throw new Error('offline')});
    expect(await s.ejecutar(async()=>{s.registrar(1,101);return 7})).toBe(7);
  });
  it('operaciones simultaneas no adoptan reservas de otra confirmacion',async()=>{
    const s=new ArchivadoPostcommit(),calls:number[][]=[];s.conectar(async (ids)=>{calls.push(ids)});
    await Promise.all([s.ejecutar(async()=>{s.registrar(1,101);await Promise.resolve()}),s.ejecutar(async()=>{s.registrar(2,102)})]);
    expect(calls).toHaveLength(2);expect(calls).toEqual(expect.arrayContaining([[1],[2]]));
  });
  it('anidamiento espera al commit exterior',async()=>{
    const s=new ArchivadoPostcommit(),run=jest.fn();s.conectar(run);
    await s.ejecutar(async()=>{await s.ejecutar(async()=>{s.registrar(3,103)});expect(run).not.toHaveBeenCalled()});
    expect(run).toHaveBeenCalledWith([3],[103]);
  });
});
