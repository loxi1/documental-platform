const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');const{createRequire}=require('node:module');
const root=require('node:path').resolve(__dirname,'../..'); const dependencyRoot=process.env.G2B_DEPENDENCY_ROOT; if (!dependencyRoot) throw new Error('G2B_DEPENDENCY_ROOT required');const ra=createRequire(dependencyRoot+'/apps/ms-auth/package.json'),rg=createRequire(dependencyRoot+'/apps/api-gateway/package.json');const ts=ra('typescript');const common=ra('@nestjs/common');const{RpcException}=ra('@nestjs/microservices');const{of,throwError}=rg('rxjs');
let testNamespace='dev.source.auth';
function load(file,req){const m={exports:{}};let s=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText;vm.runInNewContext(s,{exports:m.exports,module:m,require:n=>{if(n==='@documental/shared')return{NatsSubjects:{AuthChangePassword:'auth.change-password',AuthLogin:'auth.login',AuthSelectContext:'auth.select-context',AuthValidateToken:'auth.validate-token'}};if(n==='./auth.service')return{AuthService:class{}};if(n.includes('nats-client.provider'))return{NATS_CLIENT:'NATS'};if(n.startsWith('.'))return load(path.resolve(path.dirname(file),n+'.ts'),req);return req(n)},Reflect,process:{env:{AUTH_NATS_NAMESPACE:testNamespace}}},{filename:file});return m.exports;}
const A=load(root+'/apps/ms-auth/src/auth/auth.nats.controller.ts',ra).AuthNatsController;const G=load(root+'/apps/api-gateway/src/auth/auth.controller.ts',rg).AuthController;
const body={accessToken:'synthetic-token',currentPassword:'OldPass12',newPassword:'NewPass12',confirmPassword:'NewPass12'};
for(const [name,error,status]of[['wrong current',new common.UnauthorizedException('unsafe-secret'),401],['same password',new common.ForbiddenException('unsafe-secret'),403],['invalid request',new common.BadRequestException('unsafe-secret'),400],['unexpected',new Error('unsafe-secret'),500],['unexpected HTTP',new common.HttpException('unsafe-secret',503),500]])test('RPC '+name,async()=>{const a=new A({changePassword:async()=>{throw error}});await assert.rejects(a.changePassword(body),e=>{assert.ok(e instanceof RpcException);assert.equal(e.getError().statusCode,status);assert.ok(!JSON.stringify(e.getError()).includes('unsafe-secret'));return true});});
for(const payload of [{...body,confirmPassword:'different'},{...body,newPassword:''},null])test('invalid schema rejected without service',async()=>{let called=false;const a=new A({changePassword:()=>{called=true}});await assert.rejects(a.changePassword(payload),e=>e.getError().statusCode===400);assert.equal(called,false);});
test('successful RPC preserved',async()=>{const result={success:true,sessionRevoked:true,requiresLogin:true};assert.equal(await new A({changePassword:async()=>result}).changePassword(body),result)});
for(const status of [400,401,403,500,503])test('Gateway safe status '+status,async()=>{const g=new G({send:()=>throwError(()=>({statusCode:status,message:'unsafe-secret'}))});await assert.rejects(g.changePassword('Bearer synthetic-token',body),e=>{assert.equal(e.getStatus(),[400,401,403].includes(status)?status:500);assert.ok(!JSON.stringify(e.getResponse()).includes('unsafe-secret'));return true});});
test('Gateway no bearer',async()=>assert.rejects(new G({}).changePassword(undefined,{}),e=>e.getStatus()===401));
test('end to end controller error propagation',async()=>{const a=new A({changePassword:async()=>{throw new common.UnauthorizedException('unsafe-secret')}});const g=new G({send:()=>require(dependencyRoot+'/apps/api-gateway/node_modules/rxjs').from(a.changePassword(body).catch(e=>Promise.reject(e.getError())))});await assert.rejects(g.changePassword('Bearer synthetic-token',body),e=>e.getStatus()===401)});
test('gateway success contract preserved',async()=>{const r={success:true,sessionRevoked:true,requiresLogin:true};assert.equal(await new G({send:()=>of(r)}).changePassword('Bearer synthetic-token',body),r)});
test('login invalid password RPC controlled 401',async()=>{await assert.rejects(new A({login:async()=>{throw new common.UnauthorizedException('unsafe-secret')}}).login({email:'test@example.invalid',password:'synthetic'}),e=>e.getError().statusCode===401&&!JSON.stringify(e.getError()).includes('unsafe-secret'))});
test('login unexpected RPC safe 500',async()=>{await assert.rejects(new A({login:async()=>{throw new Error('unsafe-secret')}}).login({email:'test@example.invalid',password:'synthetic'}),e=>e.getError().statusCode===500&&!JSON.stringify(e.getError()).includes('unsafe-secret'))});
test('login Gateway controlled 401',async()=>assert.rejects(new G({send:()=>throwError(()=>({statusCode:401,message:'unsafe-secret'}))}).login({}),e=>e.getStatus()===401&&!JSON.stringify(e.getResponse()).includes('unsafe-secret')));
test('login Gateway success unchanged',async()=>{const result={identityToken:'synthetic'};assert.equal(await new G({send:()=>of(result)}).login({}),result)});

test('incorrect-current marker crosses RPC Gateway and HTTP envelope',async()=>{
 const a=new A({changePassword:async()=>{throw new common.UnauthorizedException({message:'Contraseña actual incorrecta',code:'CURRENT_PASSWORD_INCORRECT'})}});
 const g=new G({send:()=>rg('rxjs').from(a.changePassword(body).catch(e=>Promise.reject(e.getError())))});
 let failure;try{await g.changePassword('Bearer synthetic-token',body)}catch(e){failure=e}
 assert.equal(failure.getStatus(),401);assert.equal(failure.getResponse().code,'CURRENT_PASSWORD_INCORRECT');
 const Filter=load(root+'/apps/api-gateway/src/common/filters/http-exception.filter.ts',rg).HttpExceptionFilter;
 let status,envelope;new Filter().catch(failure,{switchToHttp:()=>({getRequest:()=>({headers:{},url:'/api/v1/auth/change-password'}),getResponse:()=>({status:s=>{status=s;return{json:b=>envelope=b}}})})});
 assert.equal(status,401);assert.equal(envelope.error.code,'CURRENT_PASSWORD_INCORRECT');
});
test('revoked token does not receive incorrect-current marker',async()=>{
 await assert.rejects(new A({changePassword:async()=>{throw new common.UnauthorizedException('Token revocado')}}).changePassword(body),e=>e.getError().statusCode===401&&e.getError().code===undefined);
});
test('DEV namespace retained for change-password',()=>{
 const key=ra('@nestjs/microservices/constants').PATTERN_METADATA;
 assert.deepEqual(Reflect.getMetadata(key,A.prototype.changePassword),['dev.source.auth.change-password']);
});

for (const namespace of ['auth','dev.source.auth']) test('G2 semantic NATS maps exactly once '+namespace,()=>{
 testNamespace=namespace;
 try {
  const Controller=load(root+'/apps/ms-auth/src/auth/auth.nats.controller.ts',ra).AuthNatsController;
  const sent=[];const client={send:(pattern,data)=>{sent.push(pattern);return of(data)}};
  const provider=load(root+'/apps/api-gateway/src/nats/nats-client.provider.ts',name=>name==='@nestjs/microservices'?{ClientProxyFactory:{create:()=>client},Transport:{NATS:1}}:rg(name)).NatsClientProvider;
  const transport=provider.useFactory({get:key=>key==='AUTH_NATS_NAMESPACE'?namespace:undefined});
  const key=ra('@nestjs/microservices/constants').PATTERN_METADATA;
  const expected=Reflect.getMetadata(key,Controller.prototype.changePassword)[0];
  transport.send('auth.change-password',{});transport.send(expected,{});transport.send('documento.subido',{});
  assert.deepEqual(sent,[expected,expected,'documento.subido']);assert.equal(expected,namespace+'.change-password');
 } finally {testNamespace='dev.source.auth'}
});
