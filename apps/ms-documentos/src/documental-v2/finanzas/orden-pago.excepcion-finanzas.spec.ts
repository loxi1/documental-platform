jest.mock('@documental/database',()=>({sql:{}}));
import {OrdenPagoController} from './orden-pago.controller';
import {OrdenPagoService} from './orden-pago.service';
it.each([false,true])('OP propaga autorización solo desde header Gateway validado: %s',async allowed=>{
 const op={confirmarPago:jest.fn()};const c=new OrdenPagoController(op as any,{} as any,{} as any);
 c.confirmarPago({'x-user-id':'5','x-workspace-id':'6','x-empresa-codigo':'BBTI','x-cliente-destino-id':'2','x-finanzas-correspondencia-autorizar-excepcion':String(allowed)},'7',{tienePermisoAutorizarExcepcion:!allowed});
 expect(op.confirmarPago.mock.calls[0][2].tienePermisoAutorizarExcepcion).toBe(allowed);
});
it.each([false,true])('OP conserva decisión/motivo/usuario y pasa autorización al orquestador: %s',async allowed=>{
 const svc:any=Object.create(OrdenPagoService.prototype);svc.obtenerDetalle=jest.fn(async()=>({expedienteId:118,documentoId:100,grupoFacturaId:138}));svc.confirmacionDocumental={confirmarOcrResultadoConExpediente:jest.fn()};
 const decision={accion:'AUTORIZAR_EXCEPCION',motivo:'Verificado'};
 await svc.confirmarPago(7,{ocrResultadoId:479,metadata:{},decisionCorrespondencia:decision},{id:5,workspaceId:6,empresaCodigo:'BBTI',clienteDestinoId:2,tienePermisoAutorizarExcepcion:allowed});
 const call=svc.confirmacionDocumental.confirmarOcrResultadoConExpediente.mock.calls[0];expect(call[1].decisionCorrespondencia).toEqual(decision);expect(call[2].usuarioId).toBe(5);expect(call[2].tienePermisoAutorizarExcepcion===true).toBe(allowed);
});
