jest.mock('@documental/shared',()=>({NatsSubjects:{AuthValidateToken:'auth.validate-token'},REQUEST_ID_HEADER:'x-request-id'}));
import {DocumentosGatewayController} from './documentos.controller';
const legacy='documental_v2.finanzas.correspondencia.autorizar_excepcion';
function fixture(menus:string[]=[], actions:string[]=['documentos.confirmar_ocr','documentos.vincular_expediente']) {
 const c=new DocumentosGatewayController({get:()=>''} as any,{} as any);
 const actor={sub:7,workspaceId:2,empresa:'BBTI',clienteDestinoId:1,permisos:{menus,actions}};
 const auth=jest.spyOn(c as any,'validateAuthorization').mockResolvedValue(actor);
 jest.spyOn(c as any,'assertOcrPermitido').mockResolvedValue(undefined);
 jest.spyOn(c as any,'assertExpedientePermitido').mockResolvedValue(undefined);
 const proxy=jest.spyOn(c as any,'proxy').mockResolvedValue({ok:true}); return {c,proxy,auth};
}
it.each([false,true])('deriva autorización de acceso Finanzas, no permiso adicional: %s',async allowed=>{
 const {c,proxy}=fixture(allowed?['finanzas']:['compras']);
 await c.confirmarOcrResultadoConExpediente('Bearer fixture','req-test','479',{expedienteId:118,decisionCorrespondencia:{accion:'AUTORIZAR_EXCEPCION',motivo:'Verificado'},'x-finanzas-correspondencia-autorizar-excepcion':'true'});
 expect((proxy.mock.calls[0][0] as any).headers['x-finanzas-correspondencia-autorizar-excepcion']).toBe(String(allowed));
});
it('permiso anterior sin acceso a Finanzas no habilita excepción',async()=>{
 const {c,proxy}=fixture(['compras'],['documentos.confirmar_ocr','documentos.vincular_expediente',legacy]);
 await c.confirmarOcrResultadoConExpediente('Bearer fixture','req-test','479',{expedienteId:118});
 expect((proxy.mock.calls[0][0] as any).headers['x-finanzas-correspondencia-autorizar-excepcion']).toBe('false');
});
it('scope documental ajeno impide reenvío',async()=>{const {c,proxy}=fixture(['finanzas']);jest.spyOn(c as any,'assertExpedientePermitido').mockRejectedValue(Error('different client'));await expect(c.confirmarOcrResultadoConExpediente('Bearer fixture','req-test','479',{expedienteId:31})).rejects.toThrow('different client');expect(proxy).not.toHaveBeenCalled();});
it('acceso Finanzas no sustituye acciones de confirmar/vincular',async()=>{const {c,proxy}=fixture(['finanzas'],[]);await expect(c.confirmarOcrResultadoConExpediente('Bearer fixture','req-test','479',{expedienteId:118})).rejects.toThrow();expect(proxy).not.toHaveBeenCalled();});
it('sin autenticación no reenvía',async()=>{const {c,proxy,auth}=fixture(['finanzas']);auth.mockRejectedValue(Error('unauthenticated'));await expect(c.confirmarOcrResultadoConExpediente(undefined,'req-test','479',{expedienteId:118})).rejects.toThrow();expect(proxy).not.toHaveBeenCalled();});
