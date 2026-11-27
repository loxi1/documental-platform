jest.mock('@documental/database',()=>({sql:jest.fn()}));
import { sql } from '@documental/database';
import { DocumentosRepository } from './documentos.repository';
it('aplica ambos filtros exactos antes del límite conservando filtros previos',async()=>{
 (sql as any).mockResolvedValue([]);
 await new DocumentosRepository().findOcrResultados({documentoId:549,archivoId:554,cliente:'BBTEC',estado:'confirmado'});
 const [parts,...values]=(sql as any).mock.calls[0];const query=parts.join('?');
 expect(query).toContain('o.documento_id =');expect(query).toContain('o.archivo_id =');
 expect(query.indexOf('o.archivo_id =')).toBeLessThan(query.indexOf('LIMIT'));
 expect(values).toEqual(expect.arrayContaining([549,554,'BBTEC','confirmado',20,0]));
});
