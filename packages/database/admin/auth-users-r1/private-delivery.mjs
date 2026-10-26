import { spawn } from 'node:child_process';
import { mkdir, lstat, readFile, open, realpath } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { TARGETS } from './provision.mjs';

const error = code => { throw new Error(code); };
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const fingerprint = s => /^(?:[A-F0-9]{40}|[A-F0-9]{64})$/.test(s ?? '');
const operation = s => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(s ?? '');
const within = (parent, child) => { const r=relative(parent,child);return !r || (!r.startsWith('..') && !r.startsWith('/')); };
export function runGpg(home, args, input) {
  return new Promise((accept,reject)=>{
    const child=spawn('/usr/bin/gpg',['--homedir',home,'--batch','--no-tty','--no-auto-key-retrieve',...args],{stdio:['pipe','pipe','pipe','pipe']});
    const output=[],status=[];let size=0;
    child.on('error',()=>reject(new Error('GPG_FAILED')));
    child.stdout.on('data',b=>{size+=b.length;if(size>1048576)child.kill();else output.push(b);});
    child.stdio[3].on('data',b=>status.push(b));
    child.stderr.resume(); // Never expose GPG diagnostics or plaintext to logs.
    child.on('close',code=>code===0?accept({output:Buffer.concat(output),status:Buffer.concat(status).toString('utf8')}):reject(new Error('GPG_FAILED')));
    child.stdin.on('error',()=>{});child.stdin.end(input);
  });
}
async function privateDirectory(path, roots) {
  if(!path || !path.startsWith('/'))error('PRIVATE_DIRECTORY_REQUIRED');
  const canonical=await realpath(path),stat=await lstat(path);
  if(stat.isSymbolicLink()||!stat.isDirectory()||canonical!==resolve(path)||(stat.mode&0o077)!==0)error('PRIVATE_DIRECTORY_UNSAFE');
  if(roots.some(root=>within(resolve(root),canonical)))error('CUSTODY_INSIDE_REPOSITORY');
  return canonical;
}
async function load(path) {
  const s=await lstat(path);
  if(!s.isFile()||s.isSymbolicLink()||(s.mode&0o077)!==0||s.size>1048576)error('PRIVATE_FILE_UNSAFE');
  return readFile(path);
}
async function syncDirectory(path) {const h=await open(path,'r');try{await h.sync();}finally{await h.close();}}
async function exclusive(path,bytes) {
  const handle=await open(path,'wx',0o600);
  try{await handle.writeFile(bytes);await handle.sync();}finally{await handle.close();}
}
export async function createPrivateDelivery({custodyRoot,gpgHome,custodianFingerprint,recipients,forbiddenRoots,verifiedKeysApproval,custodyMode='INDIVIDUAL',custodianDeliveryDirectory}) {
  if(!['INDIVIDUAL','PO_MANAGED'].includes(custodyMode))error('CUSTODY_MODE_INVALID');
  const poManaged=custodyMode==='PO_MANAGED';
  if(poManaged) {
    if(recipients?.some(r=>r.fingerprint&&r.fingerprint!==custodianFingerprint))error('PO_EXCLUSIVE_CUSTODY_REQUIRED');
    recipients=(recipients??TARGETS.map(t=>({email:t.email}))).map(r=>({...r,fingerprint:custodianFingerprint,deliveryDirectory:custodianDeliveryDirectory}));
  }
  if(!verifiedKeysApproval||!Array.isArray(forbiddenRoots)||!forbiddenRoots.length)error('VERIFIED_KEYS_APPROVAL_REQUIRED');
  const root=await privateDirectory(custodyRoot,forbiddenRoots),home=await privateDirectory(gpgHome,forbiddenRoots);
  if(!fingerprint(custodianFingerprint))error('INVALID_FINGERPRINT');
  if(!Array.isArray(recipients)||recipients.length!==4||new Set(recipients.map(r=>r.email)).size!==4)error('RECIPIENTS_SCOPE_INVALID');
  const routes=new Map();
  for(const target of TARGETS) {
    const r=recipients.find(r=>r.email===target.email);
    if(!r||!fingerprint(r.fingerprint))error('RECIPIENT_KEY_MISSING');
    const route=await privateDirectory(r.deliveryDirectory,forbiddenRoots);
    if(route===root||within(root,route)||within(route,root))error('DELIVERY_CUSTODY_OVERLAP');
    routes.set(r.email,{...r,deliveryDirectory:route});
  }
  if(!poManaged&&(new Set([custodianFingerprint,...recipients.map(r=>r.fingerprint)]).size!==5||new Set([...routes.values()].map(r=>r.deliveryDirectory)).size!==4))error('RECIPIENTS_NOT_INDEPENDENT');
  for(const fpr of new Set([custodianFingerprint,...recipients.map(r=>r.fingerprint)])) {
    const {output}=await runGpg(home,['--with-colons','--fixed-list-mode','--list-keys',fpr]);
    const lines=output.toString('utf8').split('\n').map(l=>l.split(':'));
    const pub=lines.find(l=>l[0]==='pub'),primary=lines.find(l=>l[0]==='fpr');
    if(poManaged&&pub&&!/[sS]/.test(pub[11]??''))error('PO_KEY_SIGNING_CAPABILITY_REQUIRED');
    if(!pub||primary?.[9]!==fpr||['r','e','d'].includes(pub[1])||!/[eE]/.test(pub[11]??'')||(pub[6]&&Number(pub[6])*1000<Date.now()))error('VERIFIED_KEY_UNUSABLE');
  }
  async function journal(id,integrity) {
    if(!operation(id)||!/^[a-f0-9]{64}$/.test(integrity??''))error('INVALID_OPERATION');
    const dir=await privateDirectory(join(root,id),forbiddenRoots);
    const data=JSON.parse((await load(join(dir,'operation.json'))).toString('utf8'));
    if(data.operationId!==id||data.integrity!==integrity||data.keysApproval!==verifiedKeysApproval||(data.custodyMode??'INDIVIDUAL')!==custodyMode)error('PREPARATION_IDENTITY_MISMATCH');
    return {dir,data};
  }
  return Object.freeze({
    prepare:async({operationId,integrity,credentials})=>{
      if(!operation(operationId)||!/^[a-f0-9]{64}$/.test(integrity??''))error('INVALID_OPERATION');
      if(!credentials.length||credentials.length>4||new Set(credentials.map(c=>c.email)).size!==credentials.length||credentials.some(c=>!routes.has(c.email)||typeof c.temporaryPassword!=='string'||!c.temporaryPassword))error('CREDENTIAL_SCOPE_INVALID');
      const dir=join(root,operationId);await mkdir(dir,{mode:0o700}); // Existing operation cannot regenerate envelopes.
      const items=[];
      for(const c of credentials) {
        const r=routes.get(c.email),filename=c.email.split('@')[0]+'.gpg';
        const bytes=Buffer.from(JSON.stringify({operationId,integrity,email:c.email,temporaryPassword:c.temporaryPassword}));
        let encrypted;
        try{const args=['--trust-model','always','--encrypt','--recipient',r.fingerprint];if(!poManaged)args.push('--recipient',custodianFingerprint);encrypted=(await runGpg(home,args,bytes)).output;}finally{bytes.fill(0);}
        if(!encrypted.length)error('EMPTY_ENVELOPE');
        await exclusive(join(dir,filename),encrypted);
        items.push({email:c.email,filename,sha256:digest(encrypted),fingerprint:r.fingerprint});
      }
      await exclusive(join(dir,'operation.json'),JSON.stringify({operationId,integrity,custodyMode,keysApproval:verifiedKeysApproval,items}));
      await syncDirectory(dir);await syncDirectory(root);
    },
    deliver:async({operationId,integrity})=>{
      const {dir,data}=await journal(operationId,integrity);let pending=false;
      for(const item of data.items) {
        const r=routes.get(item.email);
        if(!r||r.fingerprint!==item.fingerprint||item.filename!==item.email.split('@')[0]+'.gpg')error('RECIPIENT_IDENTITY_MISMATCH');
        const envelope=await load(join(dir,item.filename));if(digest(envelope)!==item.sha256)error('ENVELOPE_INTEGRITY_MISMATCH');
        const deliveryId=poManaged?operationId+'-'+item.email.split('@')[0]:operationId;
        const delivery=join(r.deliveryDirectory,deliveryId+'.gpg');
        try{await exclusive(delivery,envelope);}catch(e){if(e.code!=='EEXIST')throw e;if(digest(await load(delivery))!==item.sha256)error('DELIVERY_CONFLICT');}
        await syncDirectory(r.deliveryDirectory);
        const ack=join(r.deliveryDirectory,deliveryId+'.ack.json'),signature=ack+'.sig';
        try {
          const ackBytes=await load(ack);await load(signature);
          const content=JSON.parse(ackBytes.toString('utf8'));
          if(content.operationId!==operationId||content.integrity!==integrity||content.email!==item.email||content.envelopeSha256!==item.sha256)error('ACK_IDENTITY_MISMATCH');
          const {status}=await runGpg(home,['--status-fd','3','--verify',signature,'-'],ackBytes);
          const valid=status.split('\n').some(l=>{const parts=l.split(' ');return parts[1]==='VALIDSIG'&&(parts[2]===r.fingerprint||parts.at(-1)===r.fingerprint);});
          if(!valid||/\b(BADSIG|REVKEYSIG|EXPKEYSIG|EXPSIG)\b/.test(status))error('ACK_SIGNATURE_INVALID');
        } catch(e) {if(e.code==='ENOENT'){pending=true;continue;}throw new Error('PRIVATE_ACK_NOT_VERIFIED');}
      }
      if(pending)error('PRIVATE_ACK_PENDING');
    },
  });
}
