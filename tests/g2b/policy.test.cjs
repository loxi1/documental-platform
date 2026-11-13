const{test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),vm=require('node:vm');const{createRequire}=require('node:module');
const root=require('node:path').resolve(__dirname,'../..'); const dependencyRoot=process.env.G2B_DEPENDENCY_ROOT; if (!dependencyRoot) throw new Error('G2B_DEPENDENCY_ROOT required');const req=createRequire(dependencyRoot+'/apps/ms-auth/package.json');const ts=req('typescript');const{ForbiddenException}=req('@nestjs/common');
function parse(rel){return ts.createSourceFile(rel,fs.readFileSync(root+'/'+rel,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)}
function compile(s,c){vm.runInNewContext(ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,c);return c}
const schemaFile='apps/ms-auth/src/auth/schemas/change-password.schema.ts';const m={exports:{}};compile(fs.readFileSync(root+'/'+schemaFile,'utf8'),{exports:m.exports,module:m,require:n=>req(n)});const schema=m.exports.changePasswordSchema;
const serviceTree=parse('apps/ms-auth/src/auth/auth.service.ts');let method;function walk(n){if(ts.isMethodDeclaration(n)&&n.name?.getText(serviceTree)==='changePassword')method=n.getText(serviceTree);ts.forEachChild(n,walk)}walk(serviceTree);assert.ok(method);const service=compile('this.run=({'+method+'}).changePassword',{Buffer,ForbiddenException}).run;
const frontTree=parse('apps/web-admin/src/app/mi-perfil/page.tsx');let arrow;function find(n){if(ts.isVariableDeclaration(n)&&n.name.getText(frontTree)==='handlePasswordChange')arrow=n.initializer.getText(frontTree);ts.forEachChild(n,find)}find(frontTree);assert.ok(arrow);
function front(p){const c={newPassword:p,currentPassword:'OldPassword1!',confirmPassword:p,changingPassword:false,error:null,calls:0,events:[],window:{alert:()=>{c.successShown=true}},TextEncoder,setPasswordError:v=>c.error=v,setChangingPassword:()=>{},setCurrentPassword:()=>{},setNewPassword:()=>{},setConfirmPassword:()=>{},getAuthSession:()=>({accessToken:'synthetic'}),changePassword:async()=>{c.calls++;return{success:true,sessionRevoked:true,requiresLogin:true}},clearAuthSession:()=>c.events.push('session-clear'),refreshSession:()=>c.events.push('context-clear'),setPasswordUpdated:v=>c.events.push('modal:'+v),queryClient:{clear:()=>c.events.push('cache-clear')}};compile('this.run='+arrow,c);return c;}
const data=p=>({accessToken:'synthetic',currentPassword:'OldPassword1!',newPassword:p,confirmPassword:p});
for(const p of ['','1','1234567','😀😀😀😀','ááááááá']){
 test('schema rejects fewer than8 codepoints '+Array.from(p).length,()=>assert.equal(schema.safeParse(data(p)).success,false));
 test('service rejects fewer than8 before authentication '+Array.from(p).length,async()=>{let verify=false;await assert.rejects(service.call({verifyTokenWithAuthVersion:async()=>{verify=true}},data(p)),e=>e.getStatus()===403);assert.equal(verify,false)});
 test('frontend prevents request under8 '+Array.from(p).length,async()=>{const c=front(p);await c.run({preventDefault(){}});assert.equal(c.calls,0);assert.ok(c.error)});
}
for(const p of ['12345678','😀😀😀😀😀😀😀😀','x'.repeat(72)]){
 test('schema accepts minimum8 '+p.length,()=>assert.equal(schema.safeParse(data(p)).success,true));
 test('service accepts valid boundary '+p.length,async()=>{let calls=0;const result=await service.call({verifyTokenWithAuthVersion:async()=>({sub:14,workspaceId:27,authVersion:4}),repo:{changePasswordAndRevokeSessions:async()=>{calls++;return{changed:true}}}},data(p));assert.equal(calls,1);assert.equal(result.requiresLogin,true)});
 test('frontend submits valid boundary and clears session '+p.length,async()=>{const c=front(p);await c.run({preventDefault(){}});assert.equal(c.calls,1);assert.deepEqual(c.events.slice(0,4),['session-clear','context-clear','modal:true','cache-clear'])});
}
for(const p of ['x'.repeat(73),'é'.repeat(37)]){
 test('service rejects over72 UTF8bytes before authentication '+p.length,async()=>{await assert.rejects(service.call({},data(p)),e=>e.getStatus()===403)});
 test('frontend rejects over72 UTF8bytes '+p.length,async()=>{const c=front(p);await c.run({preventDefault(){}});assert.equal(c.calls,0);assert.ok(c.error)});
}
test('frontend TSX syntax valid',()=>assert.equal(frontTree.parseDiagnostics.length,0));
test('old password minimum not raised',()=>assert.equal(schema.safeParse({...data('NewPass12'),currentPassword:'a'}).success,true));
