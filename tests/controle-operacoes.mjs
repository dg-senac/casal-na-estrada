import assert from 'node:assert/strict';
import {controlarOperacao} from '../experiments/emergencia/controle-operacoes.mjs';
import worker from '../experiments/emergencia/worker-controle-teste.mjs';
let trava=null,logs=[],falhaInicio=false,falhaFim=false;
const db={prepare(sql){let v;return {sql,bind(...args){v=args;return this;},async run(){
 if(sql.startsWith('UPDATE controle_operacoes SET operacao_id = ?')){if(trava)return {meta:{changes:0}};trava=v[0];return {meta:{changes:1}};}
 if(sql.includes("'iniciada'")){if(falhaInicio)throw Error('offline');logs.push({op:v[1],acao:v[3],resultado:'iniciada'});return {meta:{changes:1}};}
 throw Error('SQL inesperado');},valores:()=>v};},async batch(stmts){if(falhaFim)throw Error('offline');const v=stmts[0].valores();assert.equal(stmts[1].valores()[0],trava);logs.push({op:v[1],acao:v[3],resultado:v[4]});trava=null;return [{success:true,meta:{changes:1}},{success:true,meta:{changes:1}}];}};
const token='h.'+Buffer.from(JSON.stringify({sub:'admin',aal:'aal2'})).toString('base64url')+'.s';
const env={DB:db,SUPABASE_URL:'https://pjglrlullnchqazxpvyn.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_ficticia'};
const req=(path='/api/emergencia-real')=>new Request('https://teste.invalid'+path,{method:'POST',headers:{Origin:'https://teste.invalid',Authorization:'Bearer '+token,'X-Teste-Id':crypto.randomUUID()}});
const fetcher=async u=>Response.json(u.endsWith('/user')?{id:'admin'}:{autorizado:true,mfa_necessario:false});
let iniciou,soltar;const inicio=new Promise(r=>iniciou=r),gate=new Promise(r=>soltar=r);
const primeiro=controlarOperacao(req(),env,async()=>{iniciou();await gate;return new Response('ok');},fetcher);
await inicio;assert(trava);assert.equal(logs.length,1);
let executou=false;
const concorrente=await controlarOperacao(req('/api/reabrir-teste'),env,()=>{executou=true;return new Response('não');},fetcher);
assert.equal(concorrente.status,409);assert.equal(executou,false);
soltar();assert.equal((await primeiro).status,200);assert.equal(trava,null);assert.deepEqual(logs.map(l=>l.resultado),['iniciada','concluida']);
assert.equal((await controlarOperacao(req('/api/reabrir-teste'),env,async()=>new Response('aberto'),fetcher)).status,200);
assert.equal((await controlarOperacao(req('/api/emergencia-teste'),env,async()=>new Response('falhou',{status:503}),fetcher)).status,503);assert.equal(logs.at(-1).resultado,'falhou');assert.equal(trava,null);
falhaInicio=true;executou=false;assert.equal((await controlarOperacao(req(),env,()=>{executou=true;return new Response('não');},fetcher)).status,503);assert.equal(executou,false);assert(trava);
// Reset somente na simulação isolada, não é liberação remota implementada.
trava=null;falhaInicio=false;falhaFim=true;
assert.equal((await controlarOperacao(req(),env,async()=>new Response('ocorreu'),fetcher)).status,503);assert(trava);
trava=null;falhaFim=false;
const semToken=req();semToken.headers.delete('Authorization');assert.equal((await controlarOperacao(semToken,env,()=>{throw Error('não');},fetcher)).status,403);assert.equal(trava,null);
const html=await (await worker.fetch(new Request('https://teste.invalid/login-teste'),env)).text();assert.match(html,/Controle de operações ativo/);new Function(html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1]);
assert.equal((await worker.fetch(new Request('https://teste.invalid/api/reabrir-teste'),env)).status,405);
console.log('Controle: concorrência bloqueada, retomada sequencial, histórico de início/fim/falha, falhas de auditoria fechadas, autenticação e bundle/browser aprovados. Mocks locais.');
