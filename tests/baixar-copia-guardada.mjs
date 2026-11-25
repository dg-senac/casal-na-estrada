import assert from 'node:assert/strict';
import {conferirBackup} from '../experiments/emergencia/conferir-backup.mjs';
import {criarPacote,TABELAS} from '../experiments/emergencia/pacote-editorial.mjs';
import worker from '../experiments/emergencia/worker-copia-guardada-teste.mjs';
const id='2988653f-e376-40cd-a687-5c52a7f370f6';
const dados=Object.fromEntries(TABELAS.map(t=>[t,[]]));dados.posts=[{id:'ficticio',publicado:false,texto:'Privado fictício'}];
const pacote=await criarPacote(dados);let linha={pacote,sha256:JSON.parse(pacote).sha256},leituras=0;
const db={prepare(sql){assert.equal(sql,'SELECT pacote, sha256 FROM backups_editoriais_reais WHERE id = ?');return {bind(v){assert.equal(v,id);return this;},async first(){leituras++;return linha;}};}};
const config={habilitado:true,supabaseUrl:'https://pjglrlullnchqazxpvyn.supabase.co',chavePublica:'sb_publishable_ficticia'};
const token='h.'+Buffer.from(JSON.stringify({sub:'ficticio',aal:'aal2'})).toString('base64url')+'.s';
const url='https://teste.invalid/api/baixar-backup';
const req=()=>new Request(url,{method:'POST',headers:{Origin:'https://teste.invalid',Authorization:'Bearer '+token,'X-Teste-Id':id}});
let chamadas=0;
const fetcher=async u=>{chamadas++;assert(!u.includes('capturar_editorial'));return Response.json(u.endsWith('/user')?{id:'ficticio'}:{autorizado:true,mfa_necessario:false});};
let r=await conferirBackup(req(),config,db,fetcher);assert.equal(r.status,200);assert.equal(await r.text(),pacote);assert.equal(chamadas,2);
assert.equal(r.headers.get('Content-Disposition'),'attachment; filename="snapshot-editorial-d1-'+id+'.json"');assert.equal(r.headers.get('Cache-Control'),'no-store');assert.equal(r.headers.get('Access-Control-Allow-Origin'),null);
for(const ruim of [{pacote:pacote.slice(0,-2),sha256:linha.sha256},{pacote:pacote.replace('Privado','Alterado'),sha256:linha.sha256},{pacote,sha256:'0'.repeat(64)},null]){
 linha=ruim;r=await conferirBackup(req(),config,db,fetcher);assert.notEqual(r.status,200);assert.equal(r.headers.get('Content-Disposition'),null);assert.doesNotMatch(await r.text(),/Privado/);
}
const antes=leituras;
assert.equal((await conferirBackup(new Request(url),config,db,fetcher)).status,405);
const semToken=req();semToken.headers.delete('Authorization');assert.equal((await conferirBackup(semToken,config,db,fetcher)).status,403);
const cruzada=req();cruzada.headers.set('Origin','https://outro.invalid');assert.equal((await conferirBackup(cruzada,config,db,fetcher)).status,403);assert.equal(leituras,antes);
const env={DB:db,SUPABASE_URL:config.supabaseUrl,SUPABASE_ANON_KEY:config.chavePublica};
const html=await (await worker.fetch(new Request('https://teste.invalid/login-teste'),env)).text();new Function(html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1]);assert.match(html,/id="baixar-guardada"/);
assert.equal((await worker.fetch(new Request(url),env)).status,405);
const orig=globalThis.fetch;globalThis.fetch=fetcher;linha={pacote,sha256:JSON.parse(pacote).sha256};
try{r=await worker.fetch(req(),env);assert.equal(r.status,200);assert.equal(await r.text(),pacote);}finally{globalThis.fetch=orig;}
console.log('Cópia guardada: bytes originais, validação antes do anexo, negativa de acesso/corrupção, só SELECT no D1, sem captura nova e bundle/browser aprovados. Somente mocks.');
