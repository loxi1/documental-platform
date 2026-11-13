const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');const{createRequire}=require('node:module');
const root=path.resolve(__dirname,'../..');const req=createRequire(process.env.G2B_DEPENDENCY_ROOT+'/apps/ms-auth/package.json');const ts=req('typescript');
function compile(source,context){vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);return context}
function handler(){const file=root+'/apps/web-admin/src/app/mi-perfil/page.tsx',tree=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let arrow;function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(tree)==='handlePasswordChange')arrow=n.initializer.getText(tree);ts.forEachChild(n,visit)}visit(tree);return arrow}
const modalSource=fs.readFileSync(root+'/apps/web-admin/src/app/mi-perfil/page.tsx','utf8');
function scenario(response,error){const events=[];const c={currentPassword:'old',newPassword:'NewPass123',confirmPassword:'NewPass123',changingPassword:false,TextEncoder,Array,setPasswordError:x=>c.error=x,setChangingPassword:x=>events.push('busy:'+x),getAuthSession:()=>({accessToken:'fake-test-only'}),changePassword:async()=>{if(error)throw error;return response},clearAuthSession:()=>events.push('session-clear'),refreshSession:()=>events.push('context-clear'),setPasswordUpdated:x=>events.push('modal:'+x),queryClient:{clear:()=>events.push('cache-clear')},setCurrentPassword:()=>events.push('field-clear'),setNewPassword:()=>{},setConfirmPassword:()=>{}};vm.runInNewContext(ts.transpileModule('this.run='+handler(),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,c);return {c,events}}
test('success clears local credentials/context before showing modal without button or navigation',async()=>{const {c,events}=scenario({success:true,sessionRevoked:true,requiresLogin:true});await c.run({preventDefault(){}});assert(events.indexOf('session-clear')<events.indexOf('modal:true'));assert(events.indexOf('context-clear')<events.indexOf('modal:true'));assert(events.includes('cache-clear'));assert(events.includes('field-clear'));assert.equal(c.error,null)});
for(const status of [400,401,403,500])test('HTTP '+status+' never displays success or clears session',async()=>{const {c,events}=scenario(null,{response:{status,data:{error:{code:status===401?'CURRENT_PASSWORD_INCORRECT':'OTHER'}}}});await c.run({preventDefault(){}});assert(!events.includes('modal:true'));assert(!events.includes('session-clear'));assert(c.error);if(status===401)assert.match(c.error,/actual es incorrecta/)});
test('incomplete backend success contract does not show success',async()=>{const {c,events}=scenario({success:true,sessionRevoked:false,requiresLogin:true});await c.run({preventDefault(){}});assert(!events.includes('modal:true'));assert(!events.includes('session-clear'))});
function renderUpdated(){const m={exports:{}};let stateIndex=0;const jsx=(type,props)=>({type,props});const router={replace:p=>router.last=p};const react={useState:()=>[stateIndex++===6,()=>{}],useMemo:()=>[]};const auth={useAuth:()=>({contexto:null,refreshSession(){},logout(){}})};const modal=function ExistingModal(){};const code=ts.transpileModule(modalSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}});assert.equal((code.diagnostics||[]).length,0);vm.runInNewContext(code.outputText,{module:m,exports:m.exports,require:n=>n==='react/jsx-runtime'?{jsx,jsxs:jsx}:n==='react'?react:n==='next/navigation'?{useRouter:()=>router}:n==='@tanstack/react-query'?{useQueryClient:()=>({})}:n==='@/hooks/useAuth'?auth:n==='@/components/ui/modal'?{Modal:modal}:n==='lucide-react'?{}:{}});return {view:m.exports.default(),router,modal}}
test('existing modal and exact approved copy render, button routes to login',()=>{const{view,router,modal}=renderUpdated();assert.equal(view.type,modal);assert.equal(view.props.showCloseButton,false);assert.equal(view.props.isOpen,true);const dialog=view.props.children;assert.equal(dialog.props.role,'alertdialog');const children=dialog.props.children;assert.equal(children[0].props.children,'Contraseña actualizada');assert.equal(children[1].props.children,'Tu contraseña se cambió correctamente. Por seguridad, inicia sesión nuevamente con tu nueva contraseña.');assert.equal(children[2].props.children,'Ir a iniciar sesión');children[2].props.onClick();assert.equal(router.last,'/login')});
test('Escape/backdrop callback navigates to login instead of dismissing into profile',()=>{const{view,router}=renderUpdated();view.props.onClose();assert.equal(router.last,'/login')});
test('native alert absent and JSX transpilation reports no syntax errors',()=>{assert(!modalSource.includes('window.alert'));const out=ts.transpileModule(modalSource,{reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});assert.equal(out.diagnostics.length,0)});

function interceptor(){let reject;let cleared=0;const window={location:{href:'/mi-perfil'}};const instance={interceptors:{request:{use(){}},response:{use:(ok,bad)=>reject=bad}}};const m={exports:{}};compile(fs.readFileSync(root+'/apps/web-admin/src/services/auth-api.ts','utf8'),{exports:m.exports,module:m,window,Promise,require:name=>name==='axios'?{default:{create:()=>instance}}:name.includes('auth-storage')?{clearAuthSession:()=>cleared++,getAccessToken:()=>null}:{getPublicAuthApiUrl:()=>'/api/v1'}});return{reject,window,cleared:()=>cleared}}
for(const [label,url,code,expected]of[['wrong current','/auth/change-password','CURRENT_PASSWORD_INCORRECT',false],['revoked token','/auth/change-password','UNAUTHORIZED',true],['other endpoint','/auth/validate-token','CURRENT_PASSWORD_INCORRECT',true]])test('interceptor '+label,async()=>{const c=interceptor();const e={config:{method:'post',url},response:{status:401,data:{error:{code}}}};await assert.rejects(c.reject(e));assert.equal(c.cleared(),expected?1:0);assert.equal(c.window.location.href,expected?'/login':'/mi-perfil')});
test('logout clears session and redirects even when cancelling queries fails',async()=>{const order=[];const m={exports:{}};compile(fs.readFileSync(root+'/apps/web-admin/src/hooks/useAuth.ts','utf8'),{exports:m.exports,module:m,require:name=>name==='react'?{useCallback:fn=>fn,useState:()=>[null,()=>{}],useMemo:fn=>fn(),useEffect:()=>{}}:name==='next/navigation'?{useRouter:()=>({replace:p=>order.push(p)})}:name==='@tanstack/react-query'?{useQueryClient:()=>({cancelQueries:async()=>{throw Error('synthetic')},clear:()=>order.push('cache')})}:name.includes('auth-storage')?{clearAuthSession:()=>order.push('session'),getContexto:()=>null}:{}});await m.exports.useAuth().logout();assert.deepEqual(order,['session','cache','/login'])});

const labRoot='/home/loxi1/bbti-isolated/compras-almacen-period-finalization-r1';
function source(relative,base=root){return fs.readFileSync(base+'/'+relative,'utf8')}
function stripG2B(s){
 s=s.replace('import { Modal } from "@/components/ui/modal";\n','').replace('import { clearAuthSession, getAuthSession,','import { getAuthSession,');
 const modalStart=s.indexOf('  if (passwordUpdated) {');const mainStart=s.indexOf('  return (\n    <main',modalStart);if(modalStart>=0)s=s.slice(0,modalStart)+s.slice(mainStart);

 s=s.replace('import { changePassword, selectWorkspace }','import { selectWorkspace }').replace('const { contexto, refreshSession, logout } = useAuth();','const { contexto, refreshSession } = useAuth();');
 const a=s.indexOf('  const [currentPassword,');const b=s.indexOf('  const workspaces =',a);s=s.slice(0,a)+s.slice(b);
 const c=s.indexOf('  const handlePasswordChange =');const d=s.indexOf('  const handleChangeWorkspace =',c);return s.slice(0,c)+s.slice(d);
}
test('LAB Mi Perfil preserved byte-for-byte outside Security section and G2B state',()=>{
 const file='apps/web-admin/src/app/mi-perfil/page.tsx';let actual=stripG2B(source(file));const previous=source(file,labRoot);
 const a=actual.indexOf('          <p className="mt-2 text-sm text-muted-foreground">',actual.indexOf('>Seguridad</h2>'));const b=actual.indexOf('        </article>',a);
 const c=previous.indexOf('          <p className="mt-2 text-sm text-muted-foreground">',previous.indexOf('>Seguridad</h2>'));const d=previous.indexOf('        </article>',c);
 actual=actual.slice(0,a)+previous.slice(c,d)+actual.slice(b);assert.equal(actual,previous);
});
function renderHeader(context){
 const file=root+'/apps/web-admin/src/layout/AppHeader.tsx';const m={exports:{}};
 const jsx=(type,props)=>({type:typeof type==='string'?type:'component',props});
 const nullComponent=()=>null;
 const runtime={jsx,jsxs:jsx};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{module:m,exports:m.exports,require:n=>n==='react/jsx-runtime'?runtime:n.includes('SidebarContext')?{useSidebar:()=>({toggleMobileSidebar(){},toggleSidebar(){},isCollapsed:false})}:n.includes('useAuth')?{useAuth:()=>({contexto:context})}:n==='lucide-react'?new Proxy({},{get:()=>nullComponent}):{__esModule:true,default:nullComponent}});
 return JSON.stringify(m.exports.default({}));
}
for(const [empresa,name]of [['BBTEC','BB TECNOLOGIA INDUSTRIAL S.A.C.'],['BBTI','BBTI S.A.C.']])test('unchanged LAB AppHeader renders context and Mi Perfil link '+empresa,()=>{
 const result=renderHeader({empresa,nombres:'Synthetic User',workspaceId:27,permissionVersion:3});assert.ok(result.includes(name));assert.ok(result.includes('Synthetic User'));assert.ok(result.includes('/mi-perfil'));
});
test('permission helpers and current context contract remain exported by integrated useAuth',()=>{
 const s=source('apps/web-admin/src/hooks/useAuth.ts');for(const name of ['hasPermission','hasMenu','hasAction','refreshSession','validateCurrentSession','contexto'])assert.ok(s.includes(name));
});

test('integrated useAuth preserves real storage context and permission decisions',()=>{
 const context={sub:14,workspaceId:27,empresa:'BBTEC',clienteDestinoId:1,sistema:'DOCUMENTAL',perfilId:4,perfil:'finanzas',permissionVersion:7,authVersion:2,sessionContextId:'synthetic',permisos:{menus:['finanzas'],actions:['finanzas.pagar']}};
 const window={localStorage:{getItem:()=>JSON.stringify({accessToken:'synthetic',contexto:context}),removeItem(){}}};
 const storage={exports:{}};compile(source('apps/web-admin/src/lib/auth-storage.ts'),{module:storage,exports:storage.exports,window});
 const hook={exports:{}};compile(source('apps/web-admin/src/hooks/useAuth.ts'),{module:hook,exports:hook.exports,require:n=>n==='react'?{useCallback:f=>f,useState:()=>[null,()=>{}],useMemo:f=>f(),useEffect(){}}:n==='next/navigation'?{useRouter:()=>({replace(){}})}:n==='@tanstack/react-query'?{useQueryClient:()=>({})}:n.includes('auth-storage')?storage.exports:{}});
 const auth=hook.exports.useAuth();assert.equal(JSON.stringify(auth.contexto),JSON.stringify(context));assert.equal(auth.hasMenu('finanzas'),true);assert.equal(auth.hasMenu('compras'),false);assert.equal(auth.hasAction('finanzas.pagar'),true);assert.equal(auth.hasPermission('compras.ver'),false);
});

test('composed AppHeader preserves exact current LAB presentation',()=>{assert.equal(source('apps/web-admin/src/layout/AppHeader.tsx'),source('apps/web-admin/src/layout/AppHeader.tsx',labRoot))});
