import assert from 'node:assert/strict';
import worker,{emergenciaTeste} from '../experiments/emergencia/worker-emergencia-teste.mjs';
const eventos=[],copias=new Map();let manutencao=0,falha=false;
const db={prepare(sql){let id;return {bind(v){id=v;return this;},async run(){
 if(sql.startsWith('UPDATE')){manutencao=sql.includes('manutencao = 1')?1:0;eventos.push('estado');return {meta:{changes:1}};}
 assert.equal(manutencao,1);eventos.push('copia');if(falha)throw Error('sem espaço');if(!copias.has(id))copias.set(id,'ficticio');return {meta:{changes:1}};
},async first(){return sql.startsWith('SELECT id')?(copias.has(id)?{id}:null):{manutencao};}};}};
const id='11111111-1111-4111-8111-111111111111';
assert.equal((await emergenciaTeste(db,id)).backup,'concluido');assert.deepEqual(eventos,['estado','copia']);
await emergenciaTeste(db,id);assert.equal(copias.size,1);
falha=true;assert.equal((await emergenciaTeste(db,'outro')).backup,'falhou');assert.equal(manutencao,1);falha=false;
await assert.rejects(emergenciaTeste({prepare(){return {run:async()=>({meta:{changes:0}})};}},id));
const env={DB:db,SUPABASE_URL:'https://pjglrlullnchqazxpvyn.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_ficticia'};
const req=(path,opts={})=>new Request('https://teste.invalid'+path,opts);
const html=await (await worker.fetch(req('/login-teste'),env)).text();
new Function(html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1]);
for(const rota of ['/api/emergencia-teste','/api/reabrir-teste']){
 assert.equal((await worker.fetch(req(rota),env)).status,405);
 assert.equal((await worker.fetch(req(rota,{method:'POST'}),env)).status,403);
 assert.equal((await worker.fetch(req(rota,{method:'POST',headers:{Origin:'https://teste.invalid'}}),env)).status,403);
}
const original=globalThis.fetch;
const token='cabecalho.'+Buffer.from(JSON.stringify({aal:'aal2',sub:'admin-teste'})).toString('base64url')+'.assinatura';
globalThis.fetch=async url=>Response.json(url.endsWith('/user')?{id:'admin-teste'}:{autorizado:true,mfa_necessario:false});
try {
 const opts={method:'POST',headers:{Origin:'https://teste.invalid',Authorization:'Bearer '+token,'X-Teste-Id':id}};
 assert.equal((await worker.fetch(req('/api/emergencia-teste',opts),env)).status,200);
 assert.equal(manutencao,1);
 assert.equal((await worker.fetch(req('/'),env)).status,503);
 falha=true;
 assert.equal((await worker.fetch(req('/api/emergencia-teste',opts),env)).status,503);assert.equal(manutencao,1);
 assert.equal((await worker.fetch(req('/api/reabrir-teste',opts),env)).status,200);assert.equal(manutencao,0);assert.equal(copias.size,1);
 assert.equal((await worker.fetch(req('/'),env)).status,200);
 globalThis.fetch=async()=>Response.json({autorizado:false});
 assert.equal((await worker.fetch(req('/api/emergencia-teste',opts),env)).status,403);assert.equal(manutencao,0);
}finally{globalThis.fetch=original;}
console.log('Botão isolado: autenticação simulada, origem/método, manutenção antes da cópia, falha preserva bloqueio, repetição não sobrescreve, reabertura e sintaxe do navegador aprovados.');
