jest.mock('@documental/database', () => ({ sql: {} }));
jest.mock('@documental/shared', () => ({ NatsSubjects: { AuthValidateToken: 'auth.validate-token' } }));
import { of } from 'rxjs';
import { TmpService } from './tmp.service';
import { TmpRepository, COMPRAS_FACTURA_ACCESS, comprasFacturaContext } from './tmp.repository';

const actor = { actorId: 7, workspaceId: 12, empresaCodigo: 'BBTI', clienteDestinoId: 2, idempotencyKey: 'consulta', requestId: 'req', correlationId: 'corr' };
const context = comprasFacturaContext(118,10);
const payload = { sistema:'DOCUMENTAL', sub: 7, workspaceId: 12, empresa: 'BBTI', clienteDestinoId: 2, permisos: { menus:['compras'], actions: ['documentos.subir','documentos.vincular_expediente','ocr.confirmar'] } };
describe('Factura TEMP Compras: autorización y descubrimiento sin OCR', () => {
  let repo: any, nats: any, storage: any, service: TmpService;
  beforeEach(() => {
    repo = { locked: jest.fn(async (_, work) => work({})), listCompras: jest.fn(async () => [
      {id:50,actor_id:6,nombre_archivo_original:'a.pdf',metadata:{}},
      {id:51,actor_id:8,nombre_archivo_original:'b.pdf',metadata:{ocrCandidate:{status:'FAILED'}}}]) };
    nats = { send: jest.fn(() => of({valid:true,payload})) };
    storage = { putObject:jest.fn(), copyObject:jest.fn(), statObject:jest.fn() };
    service = new TmpService(repo,{} as any,storage,nats,{} as any);
  });
  it('B autorizado descubre individualmente pendientes de A y C sin OCR ni storage',async()=>{
    const a = await service.comprasActor(actor,'Bearer test',118,10);
    const list = await service.listCompras(a);
    expect(list.contexto).toEqual(context);expect(list.data.map(r=>r.tempId)).toEqual([50,51]);
    expect(list.data.map(r=>r.actorId)).toEqual([6,8]);expect(storage.statObject).not.toHaveBeenCalled();
    expect(nats.send).toHaveBeenCalledTimes(1);expect(nats.send.mock.calls[0][0]).toBe('auth.validate-token');
  });
  it.each([{sistema:'OTHER'},{permisos:{menus:['almacen'],actions:payload.permisos.actions}},{sub:8},{workspaceId:99},{empresa:'OTHER'},{clienteDestinoId:99},{permisos:{actions:['documentos.subir']}}, {permisos:{actions:[]}}])('rechaza JWT incompatible %j',async delta=>{
    nats.send.mockReturnValue(of({valid:true,payload:{...payload,...delta}}));
    await expect(service.comprasActor(actor,'Bearer test',118,10)).rejects.toThrow();expect(repo.locked).not.toHaveBeenCalled();
  });
  it('JWT inválido o ausente no permite descubrimiento',async()=>{
    await expect(service.comprasActor(actor,undefined,118,10)).rejects.toThrow('Token requerido');
    nats.send.mockReturnValue(of({valid:false}));await expect(service.comprasActor(actor,'Bearer test',118,10)).rejects.toThrow();
  });
  it('confirmación requiere además permiso de confirmar OCR',async()=>{
    nats.send.mockReturnValue(of({valid:true,payload:{...payload,permisos:{menus:['compras'],actions:['documentos.subir','documentos.vincular_expediente']}}}));
    await expect(service.comprasActor(actor,'Bearer test',118,10,true)).rejects.toThrow('PERMISSION');
  });
  it('la marca interna no puede sustituirse por un campo JSON',async()=>{
    await expect(service.listCompras({...actor,comprasFactura:context} as any)).rejects.toThrow('PERMISSION');
  });
});
describe('Acceso compartido acotado en repositorio',()=>{
  const repo = new TmpRepository();
  let c:any;
  beforeEach(()=>{ c=jest.fn(async(parts:TemplateStringsArray)=>parts.join('').includes('SELECT *')?[{id:50,metadata:{comprasFactura:context}}]:[{id:118}]);c.json=jest.fn(v=>v); });
  it('usa tenant y contexto completo; conserva creador y revalida principal',async()=>{
    const row=await repo.own(c,50,{...actor,[COMPRAS_FACTURA_ACCESS]:context});
    expect(row.id).toBe(50);expect(c.json).toHaveBeenCalledWith(JSON.stringify(context));
    const sql=c.mock.calls[0][0].join('?');
    expect(sql).toContain('acceso.id=?');expect(sql).toContain('acceso.usuario_id=?');expect(sql).toContain('origen.id=carga.workspace_id');expect(sql).toContain('empresa_codigo=?');expect(sql).toContain('cliente_destino_id=?');expect(sql).toContain("metadata->'comprasFactura'=");expect(sql).not.toMatch(/AND actor_id=\?/);
    expect(c.mock.calls.some(call=>call[0].join('').includes("d.tipo_documental IN ('OC','OS')"))).toBe(true);
    expect(c.mock.calls.every(call=>!call[0].join('').includes('UPDATE'))).toBe(true);
  });
  it.each(['own','listCompras'])('%s autoriza el workspace personal de B sin exigir igualdad con el de A',async method=>{
    const b={...actor,workspaceId:13,[COMPRAS_FACTURA_ACCESS]:context};
    if(method==='own') await repo.own(c,50,b); else await repo.listCompras(c,b,context);
    const call=method==='own'?c.mock.calls[0]:c.mock.calls.at(-1);
    const query=call[0].join('?');
    expect(query).not.toMatch(/AND workspace_id=\?/);
    expect(query).toContain('acceso.id=? AND acceso.usuario_id=?');
    expect(call.slice(-2)).toEqual([13,7]);
    expect(query).toContain('origen.id=carga.workspace_id');
    expect(query).toContain('origen.usuario_id=carga.actor_id');
    expect(query).toContain('acceso.sistema_id=origen.sistema_id');
    expect(query).toContain('acceso.empresa_codigo=origen.empresa_codigo');
    expect(query).toContain('acceso.cliente_destino_id=origen.cliente_destino_id');
    expect(query).toContain('origen.empresa_codigo=carga.empresa_codigo');
    expect(query).toContain('origen.cliente_destino_id=carga.cliente_destino_id');
    expect(query).toContain("sistema.codigo='DOCUMENTAL' AND sistema.estado='activo'");
    expect(query).toContain("acceso.estado='activo'");
    expect(query).toContain('acceso.vigencia_desde<=CURRENT_DATE');
    expect(query).toContain('acceso.vigencia_hasta>=CURRENT_DATE');
  });
  it('otros consumidores mantienen filtro del cargador',async()=>{
    await repo.own(c,50,actor);expect(c.mock.calls[0][0].join('?')).toContain('actor_id=?');
  });
  it.each([{}, {regularizacionOp:{}}, {integration:{consumer:'OTHER'}}])('no hereda acceso a consumidores ajenos %j',async metadata=>{
    c.mockResolvedValueOnce(Object.keys(metadata).length?[{id:50,metadata}]:[]);
    await expect(repo.own(c,50,{...actor,[COMPRAS_FACTURA_ACCESS]:context})).rejects.toThrow('TEMP no disponible');
  });
  it('lista solo almacenados vigentes no materializados y sin filtro por propietario',async()=>{
    await repo.listCompras(c,{...actor,[COMPRAS_FACTURA_ACCESS]:context},context);
    const query=c.mock.calls.at(-1)[0].join('?');
    for(const expected of ["estado='almacenada'",'promovida_en IS NULL','expira_en > now()',"NOT (metadata ? 'regularizacionOp')",'documento_id IS NULL',"metadata->'comprasFactura'="]) expect(query).toContain(expected);
    expect(query).not.toContain('actor_id=');
  });
  it('contexto con principal no acreditado bloquea antes de consulta de pendientes',async()=>{
    c.mockResolvedValueOnce([{id:118}]).mockResolvedValueOnce([]);
    await expect(repo.listCompras(c,actor,context)).rejects.toThrow('PRINCIPAL_SCOPE');expect(c).toHaveBeenCalledTimes(2);
  });
});

describe('Reserva contextual desde multipart',()=>{
  it('persiste solo contexto autorizado y conserva actor de carga',async()=>{
    const {TmpController}=require('./tmp.controller');
    const service:any={comprasActor:jest.fn(async()=>({...actor,[COMPRAS_FACTURA_ACCESS]:context})),reserve:jest.fn(async()=>({tempId:50}))};
    const h:any={'authorization':'Bearer fixture','x-actor-id':'7','x-workspace-id':'12','x-empresa-codigo':'BBTI','x-cliente-destino-id':'2','idempotency-key':'original-key'};
    const file={originalname:'a.pdf',mimetype:'application/pdf',buffer:Buffer.from('%PDF-1.4')};
    await new TmpController(service).reserve(h,{comprasFactura:JSON.stringify({expedienteId:118,documentoBaseId:10})},{archivo:[file]});
    expect(service.comprasActor).toHaveBeenCalledTimes(1);
    expect(service.reserve).toHaveBeenCalledWith(expect.objectContaining({actorId:7,idempotencyKey:'original-key'}),file,context);
  });
  it('no acepta actor ni contexto extra suministrado por cliente',async()=>{
    const {TmpController}=require('./tmp.controller');const service:any={reserve:jest.fn(),comprasActor:jest.fn()};
    await expect(new TmpController(service).reserve({} as any,{comprasFactura:JSON.stringify({...context,actorId:99})},{archivo:[{} as any]})).rejects.toThrow('Contexto');
    expect(service.comprasActor).not.toHaveBeenCalled();expect(service.reserve).not.toHaveBeenCalled();
  });
  it('asociación se inserta junto con la reserva y rollback de auditoría sigue atómico',async()=>{
    const repo=new TmpRepository();const statements:any[]=[];
    const c:any=jest.fn(async(parts:TemplateStringsArray,...args:any[])=>{const query=parts.join('?');statements.push({query,args});return query.includes('INSERT INTO documentos.carga_operaciones')?[{id:50}]:[];});
    c.unsafe=jest.fn(async()=>[]);c.json=jest.fn(v=>v);
    await repo.reserve(c,actor,{name:'a.pdf',mime:'application/pdf',size:9,hash:'a'.repeat(64)},'fingerprint','test',context);
    expect(c.json).toHaveBeenCalledWith(JSON.stringify({comprasFactura:context}));
    expect(statements.find(s=>s.query.includes('INSERT INTO documentos.carga_operaciones')).query).toContain('expira_en,metadata');
    expect(c.unsafe.mock.calls.map(call=>call[0])).toEqual(['BEGIN','COMMIT']);
    c.unsafe.mockClear();c.mockImplementation(async(parts:TemplateStringsArray)=>{
      const query=parts.join('');if(query.includes('INSERT INTO core.auditoria_eventos'))throw Error('audit');
      return query.includes('INSERT INTO documentos.carga_operaciones')?[{id:51}]:[];
    });
    await expect(repo.reserve(c,actor,{name:'a.pdf',mime:'application/pdf',size:9,hash:'a'.repeat(64)},'fingerprint','test',context)).rejects.toThrow('audit');
    expect(c.unsafe.mock.calls.map(call=>call[0])).toEqual(['BEGIN','ROLLBACK']);
  });
});
