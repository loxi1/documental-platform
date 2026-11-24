import { createHmac, timingSafeEqual } from 'node:crypto';
export type ArchivoTicket = { archivoId: number; reservaId: string; empresa: string; clienteId: number; sha256: string; exp: number };
export class ArchivadoPreviewToken {
  constructor(private readonly secret: string) { if(Buffer.byteLength(secret)<32)throw new Error('ARCHIVADO_PREVIEW_SECRET_REQUIRED'); }
  emitir(claims: Omit<ArchivoTicket,'exp'>, now: number): string {
    const payload=Buffer.from(JSON.stringify({...claims,exp:Math.floor(now/1000)+120})).toString('base64url');
    return payload+'.'+createHmac('sha256',this.secret).update('R2_NAS_PREVIEW_R1:'+payload).digest('base64url');
  }
  validar(ticket: string, archivoId: number, now: number): ArchivoTicket {
    if(typeof ticket!=='string'||ticket.length>2048)throw new Error('ARCHIVADO_PREVIEW_INVALID');
    const [payload,signature,extra]=ticket.split('.');
    if(!payload||!signature||extra||!/^[A-Za-z0-9_-]+$/.test(payload)||!/^[A-Za-z0-9_-]+$/.test(signature))throw new Error('ARCHIVADO_PREVIEW_INVALID');
    const expected=createHmac('sha256',this.secret).update('R2_NAS_PREVIEW_R1:'+payload).digest();
    const supplied=Buffer.from(signature,'base64url');
    if(supplied.length!==expected.length||!timingSafeEqual(expected,supplied))throw new Error('ARCHIVADO_PREVIEW_INVALID');
    const c=JSON.parse(Buffer.from(payload,'base64url').toString()) as ArchivoTicket;
    if(c.archivoId!==archivoId||!Number.isSafeInteger(c.clienteId)||c.clienteId<=0||!Number.isSafeInteger(c.exp)
      ||c.exp<=Math.floor(now/1000)||c.exp>Math.floor(now/1000)+120||!/^[A-Z0-9_-]+$/.test(c.empresa)
      ||!/^[0-9a-f-]{36}$/.test(c.reservaId)||!/^[0-9a-f]{64}$/.test(c.sha256))throw new Error('ARCHIVADO_PREVIEW_INVALID');
    return c;
  }
}
