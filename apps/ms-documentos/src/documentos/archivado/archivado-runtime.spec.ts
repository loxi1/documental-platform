jest.mock('@documental/database',()=>({sql:jest.fn()}));
jest.mock('@documental/shared',()=>({NatsSubjects:{AuthValidateToken:'auth.validate-token'}}));
import { of } from 'rxjs';
import { sql } from '@documental/database';
import { ArchivadoRuntimeService, RECUPERACION_DEV_554_555 } from './archivado-runtime.service';
const db=sql as unknown as jest.Mock;
describe('Archivado runtime contextual',()=>{
  const actor={sistema:'DOCUMENTAL',empresa:'BBTI',clienteDestinoId:2,workspaceId:99,permisos:{actions:['documentos.confirmar_ocr']}};
  let send:jest.Mock,config:any,service:ArchivadoRuntimeService;
  beforeEach(()=>{db.mockReset();send=jest.fn(()=>of({valid:true,payload:actor}));config={get:(key:string)=>['R2_NAS_ARCHIVE_ENABLED','R2_NAS_VIEWER_ENABLED'].includes(key)?'true':undefined};service=new ArchivadoRuntimeService(config,{} as any,{send} as any)});
  it('feature deshabilitada no conecta NATS ni consulta tabla',async()=>{config.get=()=>undefined;await expect(service.resumen(121,'Bearer synthetic')).rejects.toThrow('ARCHIVADO_VISOR_NO_HABILITADO');expect(send).not.toHaveBeenCalled();expect(db).not.toHaveBeenCalled()});
  it('JWT inválido no consulta datos',async()=>{send.mockReturnValue(of({valid:false}));await expect(service.resumen(121,'Bearer synthetic')).rejects.toThrow('Token inválido');expect(db).not.toHaveBeenCalled()});
  it('sin permiso de confirmación no procesa almacenamiento',async()=>{send.mockReturnValue(of({valid:true,payload:{...actor,permisos:{actions:[]}}}));await expect(service.regularizar(121,'Bearer synthetic')).rejects.toThrow('ARCHIVADO_PERMISO_REQUERIDO');expect(db).not.toHaveBeenCalled()});
  it('otro expediente/contexto se rechaza antes de consultar archivado',async()=>{db.mockResolvedValue([]);await expect(service.resumen(121,'Bearer synthetic')).rejects.toThrow('ARCHIVADO_CONTEXTO_NO_AUTORIZADO');expect(db).toHaveBeenCalledTimes(1);expect(db.mock.calls[0].slice(1)).toEqual([121,'BBTI',2])});
  it('resumen aplica empresa, cliente y expediente sin owner personal',async()=>{db.mockResolvedValueOnce([{id:121}]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);expect(await service.resumen(121,'Bearer synthetic')).toEqual({expedienteId:121,estados:[],bloqueosNomenclatura:[]});expect(db.mock.calls[1].slice(1)).toEqual(['BBTI',2,121])});
  it('sin autorización no conecta NATS',async()=>{await expect(service.resumen(121)).rejects.toThrow('Token requerido');expect(send).not.toHaveBeenCalled()});
  it('preview NAS no emite ticket para otro cliente',async()=>{
    db.mockResolvedValue([{archivo_id:1,empresa_codigo:'BBTI',cliente_destino_id:999,nas_estado:'VERIFICADO'}]);
    await expect(service.previewUrl(1,'Bearer synthetic')).rejects.toThrow('ARCHIVADO_PREVIEW_CONTEXTO');
  });
  it('preview NAS exige autorización aunque se conozca archivoId',async()=>{
    db.mockResolvedValue([{archivo_id:1,empresa_codigo:'BBTI',cliente_destino_id:2,nas_estado:'VERIFICADO'}]);
    await expect(service.previewUrl(1)).rejects.toThrow('Token requerido');
  });


  it('visor disponible con procesamiento deshabilitado',async()=>{
    config.get=(key:string)=>key==='R2_NAS_VIEWER_ENABLED'?'true':undefined;
    db.mockResolvedValueOnce([{id:121}])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    expect(service.habilitado()).toBe(false);
    expect(service.visorHabilitado()).toBe(true);
    expect(await service.resumen(121,'Bearer synthetic')).toEqual({
      expedienteId:121,estados:[],bloqueosNomenclatura:[]
    });
  });

  it('regularizacion bloqueada aunque el visor este habilitado',async()=>{
    config.get=(key:string)=>key==='R2_NAS_VIEWER_ENABLED'?'true':undefined;
    await expect(service.regularizar(121,'Bearer synthetic'))
      .rejects.toThrow('ARCHIVADO_NO_HABILITADO');
    expect(send).not.toHaveBeenCalled();
    expect(db).not.toHaveBeenCalled();
  });

  it('visor deshabilitado consulta ubicacion para no emitir URL R2 eliminada',async()=>{
    config.get=(key:string)=>key==='R2_NAS_ARCHIVE_ENABLED'?'true':undefined;
    db.mockResolvedValueOnce([{r2_estado:'ELIMINADO_ACREDITADO'}]);
    await expect(service.previewUrl(546,'Bearer synthetic')).rejects.toThrow('ARCHIVADO_VISOR_NO_HABILITADO');
    expect(send).not.toHaveBeenCalled();
  });
  it('lector autorizado no necesita permiso de confirmar OCR',async()=>{
    send.mockReturnValue(of({valid:true,payload:{...actor,permisos:{actions:['documentos.ver']}}}));
    config.get=(key:string)=>({R2_NAS_VIEWER_ENABLED:'true',R2_NAS_PUBLIC_GATEWAY_URL:'http://localhost:3000',R2_NAS_PREVIEW_SECRET:'x'.repeat(32)} as any)[key];
    db.mockResolvedValue([{archivo_id:7,reserva_id:'10000000-0000-8000-a000-000000000001',empresa_codigo:'BBTI',cliente_destino_id:2,nas_estado:'VERIFICADO',r2_estado:'ELIMINADO_ACREDITADO',sha256:'a'.repeat(64)}]);
    (service as any).nas=()=>({verificar:jest.fn().mockResolvedValue({})});
    expect(await service.previewUrl(7,'Bearer synthetic')).toMatchObject({expiresIn:120,url:expect.stringContaining('/preview/7')});
  });
  it('NAS inaccesible conserva fallback solo si R2 esta presente',async()=>{
    config.get=(key:string)=>({R2_NAS_VIEWER_ENABLED:'true',R2_NAS_PUBLIC_GATEWAY_URL:'http://localhost:3000'} as any)[key];
    (service as any).nas=()=>({verificar:async()=>{throw new Error('offline')}});
    const row={empresa_codigo:'BBTI',cliente_destino_id:2,nas_estado:'VERIFICADO'};
    db.mockResolvedValueOnce([{...row,r2_estado:'PRESENTE'}]);
    expect(await service.previewUrl(7,'Bearer synthetic')).toBeNull();
    db.mockResolvedValueOnce([{...row,r2_estado:'ELIMINADO_ACREDITADO'}]);
    await expect(service.previewUrl(7,'Bearer synthetic')).rejects.toThrow('ARCHIVADO_NAS_NO_DISPONIBLE');
  });
  it('procesamiento automatico no hace consultas si no se habilita expresamente',async()=>{
    await service.procesarDocumentosConfirmados([1]);expect(db).not.toHaveBeenCalled();expect(send).not.toHaveBeenCalled();
  });
  it('procesamiento exacto excluye historicos y archivos protegidos',async()=>{
    config.get=(key:string)=>({R2_NAS_ARCHIVE_ENABLED:'true',R2_NAS_AUTO_ENABLED:'true',R2_NAS_DEV_NEW_DOCUMENTS_ENABLED:'true',NODE_ENV:'development',R2_NAS_DESTINATION:'SYNOLOGY_DEV',R2_NAS_ACTIVATION_FROM:'2026-11-24T02:24:30Z',R2_NAS_DEV_CONTEXTS:'[{"empresa":"BBTI","clienteId":2}]'} as any)[key];
    db.mockResolvedValueOnce([{id:1000}]).mockResolvedValueOnce([]);
    const unsafe=jest.fn().mockResolvedValue([
      {id:9,archivo_id:1000,documento_id:60,version:1,empresa_codigo:'BBTI',cliente_destino_id:2,expediente_id:900},
      {id:10,archivo_id:1001,documento_id:61,version:1,empresa_codigo:'BBTI',cliente_destino_id:2,expediente_id:901},
      {id:2,archivo_id:546,documento_id:541,version:1,empresa_codigo:'BBTI',cliente_destino_id:2,expediente_id:900},
    ]);(sql as any).unsafe=unsafe;
    const process=jest.spyOn(service as any,'procesarContexto').mockResolvedValue({resultados:[]});
    await service.procesarDocumentosConfirmados([60,61,60],[1000,1001,546]);
    expect(unsafe.mock.calls[0][1]).toEqual([[60,61],[1000,1001,546]]);
    expect(unsafe.mock.calls[0][0]).toContain("f.metadata->>'archivadoNuevo'='true'");
    expect(process).toHaveBeenCalledTimes(1);
    expect(process.mock.calls[0][1]).toMatchObject({id:9,archivoId:1000,documentoId:60,version:1});
  });
  it('entrada focal 546 cerrada no ejecuta SQL',async()=>{
    await expect(service.procesarReservaExactaDev()).rejects.toThrow('ARCHIVADO_FOCAL_546_CERRADO');
    expect(db).not.toHaveBeenCalled();
  });
  it('OP sin expediente exige identidad persistida, no confia en metadata',async()=>{
    config.get=(key:string)=>({R2_NAS_ARCHIVE_ENABLED:'true',R2_NAS_AUTO_ENABLED:'true',R2_NAS_DEV_NEW_DOCUMENTS_ENABLED:'true',NODE_ENV:'development',R2_NAS_DESTINATION:'SYNOLOGY_DEV',R2_NAS_ACTIVATION_FROM:'2026-11-24T02:24:30Z',R2_NAS_DEV_CONTEXTS:'[{"empresa":"BBTI","clienteId":2}]'} as any)[key];
    (sql as any).unsafe=jest.fn().mockResolvedValue([{id:9,archivo_id:1000,documento_id:60,version:1,
      empresa_codigo:'BBTI',cliente_destino_id:2,expediente_id:null,contexto:{ordenPagoId:31}}]);
    db.mockResolvedValue([{id:99}]);
    const process=jest.spyOn(service as any,'procesarContexto').mockResolvedValue({resultados:[]});
    await service.procesarDocumentosConfirmados([60],[1000]);expect(process).not.toHaveBeenCalled();
    db.mockResolvedValue([{id:1000}]);await service.procesarDocumentosConfirmados([60],[1000]);
    expect(process).toHaveBeenCalledTimes(1);
    expect(process.mock.calls[0][0]).toMatchObject({expedienteId:null,empresa:'BBTI',clienteId:2});
  });

  it('DEV admite documentos nuevos en expediente existente sin reconfiguracion por documento',async()=>{
    const values={R2_NAS_ARCHIVE_ENABLED:'true',R2_NAS_AUTO_ENABLED:'true',NODE_ENV:'development',R2_NAS_DESTINATION:'SYNOLOGY_DEV',
      R2_NAS_DEV_NEW_DOCUMENTS_ENABLED:'true',R2_NAS_ACTIVATION_FROM:'2026-11-23T00:00:00Z',R2_NAS_DEV_EMPRESAS:'BBTI',R2_NAS_DEV_CLIENTE_IDS:'2'};
    config.get=(k:string)=>(values as any)[k];
    const row={id:9,archivo_id:1000,documento_id:60,version:1,empresa_codigo:'BBTI',cliente_destino_id:2,expediente_id:900};
    (sql as any).unsafe=jest.fn().mockResolvedValue([row]);db.mockResolvedValue([{id:1000}]);
    const process=jest.spyOn(service as any,'procesarContexto').mockResolvedValue({resultados:[]});
    await service.procesarDocumentosConfirmados([60],[1000]);
    (sql as any).unsafe.mockResolvedValue([{...row,id:10,archivo_id:1001,documento_id:61}]);
    db.mockResolvedValue([{id:1001}]);await service.procesarDocumentosConfirmados([61],[1001]);expect(process).toHaveBeenCalledTimes(2);
    expect(db.mock.calls[0][0].join('')).not.toContain('e.creado_en');
    expect(db.mock.calls[0][0].join('')).toContain('e.cliente_destino_id=f.cliente_destino_id');
    expect(db.mock.calls[0][0].join('')).toContain('f.creado_en>=');
    db.mockResolvedValue([]);await service.procesarDocumentosConfirmados([61],[1001]);expect(process).toHaveBeenCalledTimes(2);
  });
  it('produccion ordinaria no exige listas DEV, pero solo procesa archivos nuevos acreditados',async()=>{
    config.get=(k:string)=>({R2_NAS_ARCHIVE_ENABLED:'true',R2_NAS_AUTO_ENABLED:'true',NODE_ENV:'production',
      R2_NAS_NEW_DOCUMENTS_ENABLED:'true',R2_NAS_ACTIVATION_FROM:'2026-11-23T00:00:00Z'} as any)[k];
    (sql as any).unsafe=jest.fn().mockResolvedValue([{id:9,archivo_id:1000,documento_id:60,version:1,empresa_codigo:'BBTI',cliente_destino_id:2,expediente_id:900}]);
    db.mockResolvedValue([{id:1000}]);const process=jest.spyOn(service as any,'procesarContexto').mockResolvedValue({resultados:[]});
    await service.procesarDocumentosConfirmados([60],[1000]);expect(process).toHaveBeenCalledTimes(1);
  });

  describe('continuidad automatica multiempresa y recuperacion exacta',()=>{
    const pairs=JSON.stringify([{empresa:'BBTI',clienteId:2},{empresa:'BBTEC',clienteId:1}]);
    const oc={id:'3',archivo_id:554,documento_id:549,version:1,empresa_codigo:'BBTEC',cliente_destino_id:1,expediente_id:6,
      r2_key:'documentos/2026/04/BBTEC/OC_031437.pdf',ruta_relativa:'documentos/2026/04/BBTEC/OC_031437.pdf',
      contexto:{},r2_estado:'NO_COMPROBADO',nas_estado:'PENDIENTE',trabajo_estado:'PENDIENTE'};
    const factura={...oc,id:'4',archivo_id:555,documento_id:550,r2_key:'documentos/2026/04/BBTEC/factura.pdf',ruta_relativa:'documentos/2026/04/BBTEC/factura.pdf'};
    let settings:Record<string,string>;
    beforeEach(()=>{
      settings={NODE_ENV:'development',R2_NAS_DESTINATION:'SYNOLOGY_DEV',R2_NAS_ARCHIVE_ENABLED:'true',R2_NAS_AUTO_ENABLED:'true',
        R2_NAS_DEV_NEW_DOCUMENTS_ENABLED:'true',R2_NAS_ACTIVATION_FROM:'2026-11-24T02:24:30Z',R2_NAS_DEV_CONTEXTS:pairs,
        R2_NAS_DEV_DELETE_ENABLED:'true',R2_NAS_DEV_DELETE_FILE_IDS:'554,555',R2_NAS_VIEWER_ACCEPTED:'true'};
      config.get=(k:string)=>settings[k];
      db.mockImplementation(async(_q:any,...v:any[])=>[{id:v[0]}]);
    });
    it('BBTI/2 y BBTEC/1 se procesan juntos sin edad del expediente ni cruces de pares',async()=>{
      const rows=[oc,{...oc,id:5,archivo_id:556,documento_id:551,empresa_codigo:'BBTI',cliente_destino_id:2},
        {...oc,id:6,archivo_id:557,documento_id:552,empresa_codigo:'BBTI',cliente_destino_id:1},
        {...oc,id:7,archivo_id:558,documento_id:553,empresa_codigo:'BBTEC',cliente_destino_id:2}];
      (sql as any).unsafe=jest.fn().mockResolvedValue(rows);
      const process=jest.spyOn(service as any,'procesarContexto').mockResolvedValue({resultados:[]});
      await service.alGuardar([549,551,552,553],[554,556,557,558]);
      expect(process).toHaveBeenCalledTimes(2);expect(db).toHaveBeenCalledTimes(2);
      const text=db.mock.calls[0][0].join('');
      expect(text).toContain('f.creado_en>=');expect(text).toContain("archivadoNuevo'='true'");
      expect(text).not.toContain('e.creado_en');expect(text).not.toContain('pd.creado_en');
      expect(db.mock.calls[0]).toContain('2026-11-24T02:24:30Z');
    });
    it('historicos quedan excluidos aunque figure un ID en listas antiguas',async()=>{
      settings.R2_NAS_DEV_ALLOWED_FILE_IDS='554';db.mockResolvedValue([]);
      (sql as any).unsafe=jest.fn().mockResolvedValue([oc]);
      const process=jest.spyOn(service as any,'procesarContexto').mockResolvedValue({resultados:[]});
      await service.alGuardar([549],[554]);expect(process).not.toHaveBeenCalled();
    });
    it('listas legacy multiples no generan autorizacion cartesiana',async()=>{
      delete settings.R2_NAS_DEV_CONTEXTS;settings.R2_NAS_DEV_EMPRESAS='BBTI,BBTEC';settings.R2_NAS_DEV_CLIENTE_IDS='1,2';
      expect(await (service as any).permitido(oc)).toBe(false);expect(db).not.toHaveBeenCalled();
    });
    it('JSON de contextos malformado falla cerrado sin recurrir al legacy',async()=>{
      settings.R2_NAS_DEV_CONTEXTS='invalid';settings.R2_NAS_DEV_EMPRESAS='BBTEC';settings.R2_NAS_DEV_CLIENTE_IDS='1';
      expect(await (service as any).permitido(oc)).toBe(false);expect(db).not.toHaveBeenCalled();
    });
    it('recuperacion valida ambos antes de procesar y solo reclama reservas 3 y 4',async()=>{
      (sql as any).unsafe=jest.fn().mockResolvedValueOnce([oc]).mockResolvedValueOnce([factura]);
      const process=jest.spyOn(service as any,'procesarContexto').mockResolvedValue({resultados:['COMPLETADO']});
      const result=await service.recuperarPendientesExactosDev([...RECUPERACION_DEV_554_555]);
      expect(result.map(r=>r.archivoId)).toEqual([554,555]);
      expect((sql as any).unsafe.mock.calls.map((c:any)=>c[1])).toEqual([[3,554,549,'BBTEC',1,6],[4,555,550,'BBTEC',1,6]]);
      expect(process.mock.calls.map(c=>(c[1] as any).id)).toEqual([3,4]);
    });
    it('discrepancia en segunda reserva impide iniciar la primera',async()=>{
      (sql as any).unsafe=jest.fn().mockResolvedValueOnce([oc]).mockResolvedValueOnce([{...factura,cliente_destino_id:2}]);
      const process=jest.spyOn(service as any,'procesarContexto').mockResolvedValue({});
      await expect(service.recuperarPendientesExactosDev([...RECUPERACION_DEV_554_555])).rejects.toThrow('RECUPERACION_NO_ACREDITADA');
      expect(process).not.toHaveBeenCalled();
    });
    it('recuperacion no rematerializa un origen tardio ni procesa protegidos',async()=>{
      (sql as any).unsafe=jest.fn().mockResolvedValue([{...oc,contexto:{modo:'NUEVO_TARDIO'}}]);
      const process=jest.spyOn(service as any,'procesarContexto').mockResolvedValue({});
      await expect(service.recuperarPendientesExactosDev([RECUPERACION_DEV_554_555[0]])).rejects.toThrow('RECUPERACION_NO_ACREDITADA');
      (sql as any).unsafe.mockResolvedValue([{...oc,contexto:{modo:'NUEVO',origenMaterializacion:{bucket:'dev',key:'other'}}}]);
      await expect(service.recuperarPendientesExactosDev([RECUPERACION_DEV_554_555[0]])).rejects.toThrow('RECUPERACION_NO_ACREDITADA');
      await expect(service.recuperarPendientesExactosDev([{...RECUPERACION_DEV_554_555[0],archivoId:546}])).rejects.toThrow('IDENTIDAD_INVALIDA');
      expect(process).not.toHaveBeenCalled();
    });
    it('fallo de procesamiento detiene el lote sin reintento y conserva resultados parciales',async()=>{
      (sql as any).unsafe=jest.fn().mockResolvedValueOnce([oc]).mockResolvedValueOnce([factura]);
      const process=jest.spyOn(service as any,'procesarContexto').mockResolvedValueOnce({resultados:['COMPLETADO']}).mockRejectedValueOnce(new Error('ARCHIVADO_IO_ERROR'));
      await expect(service.recuperarPendientesExactosDev([...RECUPERACION_DEV_554_555])).rejects.toMatchObject({
        resultadosParciales:[{reservaId:3,archivoId:554,resultados:['COMPLETADO']}]
      });expect(process).toHaveBeenCalledTimes(2);
    });
    it('repetir recuperacion completada es no-op y no repite DELETE',async()=>{
      (sql as any).unsafe=jest.fn().mockResolvedValue([{...oc,r2_estado:'ELIMINADO_ACREDITADO',nas_estado:'VERIFICADO',trabajo_estado:'COMPLETADO'}]);
      const process=jest.spyOn(service as any,'procesarContexto').mockResolvedValue({});
      const results=await service.recuperarPendientesExactosDev([RECUPERACION_DEV_554_555[0]]);
      expect(results[0].resultados).toEqual(['SIN_TRABAJO']);expect(process).not.toHaveBeenCalled();
    });
    it('DELETE permanece limitado al cohort PO incluso ante configuracion mas amplia',()=>{
      const scope={empresa:'BBTEC',clienteId:1,expedienteId:6};
      const exact={id:3,archivoId:554,documentoId:549,version:1,autorizado:true};
      const allowed=(s:any=scope,e:any=exact)=>(service as any).eliminacionDevAutorizada(s,e);
      expect(allowed()).toBe(true);expect(allowed(scope,{...exact,id:4,archivoId:555,documentoId:550})).toBe(true);
      settings.R2_NAS_DEV_DELETE_FILE_IDS='554,555,556,546';
      expect(allowed(scope,{...exact,id:5,archivoId:556,documentoId:551})).toBe(false);
      expect(allowed({...scope,clienteId:2})).toBe(false);expect(allowed(scope,{...exact,autorizado:false})).toBe(false);
      settings.NODE_ENV='production';expect(allowed()).toBe(false);settings.NODE_ENV='development';
      settings.R2_NAS_DEV_DELETE_ENABLED='false';expect(allowed()).toBe(false);settings.R2_NAS_DEV_DELETE_ENABLED='true';
      settings.R2_NAS_VIEWER_ACCEPTED='false';expect(allowed()).toBe(false);
    });
  });

  it('DEV dinámico acepta contexto institucional nuevo sin listas; relación cruzada o histórico se deniegan',async()=>{
    const values:any={NODE_ENV:'development',R2_NAS_DESTINATION:'SYNOLOGY_DEV',R2_NAS_ARCHIVE_ENABLED:'true',R2_NAS_AUTO_ENABLED:'true',
      R2_NAS_DEV_NEW_DOCUMENTS_ENABLED:'true',R2_NAS_DEV_DYNAMIC_CONTEXTS:'true',R2_NAS_ACTIVATION_FROM:'2026-11-24T02:24:30Z'};
    config.get=(k:string)=>values[k];
    const row={id:20,archivo_id:580,documento_id:570,version:1,empresa_codigo:'NUEVA',cliente_destino_id:30,expediente_id:4};
    (sql as any).unsafe=jest.fn().mockResolvedValue([row]);db.mockResolvedValue([{id:580}]);
    const process=jest.spyOn(service as any,'procesarContexto').mockResolvedValue({resultados:[]});
    await service.alGuardar([570],[580]);expect(process).toHaveBeenCalledTimes(1);
    db.mockResolvedValue([]);await service.alGuardar([570],[580]);expect(process).toHaveBeenCalledTimes(1);
    expect(db.mock.calls[0][0].join('')).toContain('e.empresa_codigo=f.empresa_codigo');
    expect(db.mock.calls[0][0].join('')).toContain('f.creado_en>=');
  });
  it('DELETE del recorrido DEV nuevo exige opt-in, exactitud y visor; no se extiende a PROD ni protegidos',()=>{
    const values:any={NODE_ENV:'development',R2_NAS_DESTINATION:'SYNOLOGY_DEV',R2_NAS_DEV_DELETE_ENABLED:'true',
      R2_NAS_DEV_DELETE_NEW_CONFIRMED:'true',R2_NAS_DEV_ACCEPTANCE_MIN_FILE_ID:'556',R2_NAS_VIEWER_ACCEPTED:'true'};
    config.get=(k:string)=>values[k];const scope={empresa:'BBTEC',clienteId:1,expedienteId:4};
    const exact={id:5,archivoId:556,documentoId:551,version:1,autorizado:true};
    expect((service as any).eliminacionDevAutorizada(scope,exact)).toBe(true);
    for(const id of [546,552,553])expect((service as any).eliminacionDevAutorizada(scope,{...exact,archivoId:id})).toBe(false);
    expect((service as any).eliminacionDevAutorizada(scope,{...exact,autorizado:false})).toBe(false);
    values.NODE_ENV='production';expect((service as any).eliminacionDevAutorizada(scope,exact)).toBe(false);
    values.NODE_ENV='development';values.R2_NAS_VIEWER_ACCEPTED='false';expect((service as any).eliminacionDevAutorizada(scope,exact)).toBe(false);
    values.R2_NAS_VIEWER_ACCEPTED='true';values.R2_NAS_DEV_ACCEPTANCE_MIN_FILE_ID=undefined;expect((service as any).eliminacionDevAutorizada(scope,exact)).toBe(false);
    values.R2_NAS_DEV_DELETE_NEW_CONFIRMED='false';expect((service as any).eliminacionDevAutorizada(scope,exact)).toBe(false);
  });

  it('frontera DEV568 excluye smokes previos aun con timestamp futuro; conserva corte y contexto dinámico',async()=>{
    const values:any={NODE_ENV:'development',R2_NAS_DESTINATION:'SYNOLOGY_DEV',R2_NAS_ARCHIVE_ENABLED:'true',R2_NAS_AUTO_ENABLED:'true',
      R2_NAS_DEV_NEW_DOCUMENTS_ENABLED:'true',R2_NAS_DEV_DYNAMIC_CONTEXTS:'true',R2_NAS_ACTIVATION_FROM:'2026-11-24T02:24:30Z',R2_NAS_DEV_ACCEPTANCE_MIN_FILE_ID:'568'};
    config.get=(k:string)=>values[k];
    const old={id:12,archivo_id:566,documento_id:561,version:1,empresa_codigo:'BBTEC',cliente_destino_id:1,expediente_id:6};
    (sql as any).unsafe=jest.fn().mockResolvedValue([old]);db.mockResolvedValue([{id:566}]);
    const process=jest.spyOn(service as any,'procesarContexto').mockResolvedValue({resultados:[]});
    await service.alGuardar([561],[566]);expect(process).not.toHaveBeenCalled();expect(db).not.toHaveBeenCalled();
    (sql as any).unsafe.mockResolvedValue([{...old,archivo_id:568,documento_id:564}]);db.mockResolvedValue([{id:568}]);
    await service.alGuardar([564],[568]);expect(process).toHaveBeenCalledTimes(1);
    expect(db.mock.calls[0]).toContain('2026-11-24T02:24:30Z');expect(db.mock.calls[0]).toContain(568);
    expect(db.mock.calls[0][0].join('')).toContain('f.id>=');
    values.R2_NAS_DEV_ACCEPTANCE_MIN_FILE_ID='invalid';await service.alGuardar([564],[568]);expect(process).toHaveBeenCalledTimes(1);
  });

 it.each([['pdf',Buffer.from('%PDF-1.7')],['png',Buffer.from([137,80,78,71,13,10,26,10])],['jpg',Buffer.from([255,216,255])]])('visor NAS %s conserva formato real e identidad',async(ext,data)=>{
  (service as any).tokens=()=>({validar:()=>({reservaId:'r',empresa:'BBTEC',clienteId:1,sha256:'a'.repeat(64)})});
  (service as any).nas=()=>({leerParaVisor:async()=>data});db.mockResolvedValue([{ruta_relativa:'documentos/2026/10/BBTEC/OP_180.'+ext}]);
  expect(await service.leerPreview(800,'synthetic')).toBe(data);
  db.mockResolvedValue([{ruta_relativa:'documentos/2026/10/BBTEC/OP_180.exe'}]);
  await expect(service.leerPreview(800,'synthetic')).rejects.toThrow('ARCHIVADO_FORMATO_NO_COINCIDE');
 });

});
