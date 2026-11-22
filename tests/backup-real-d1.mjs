import assert from 'node:assert/strict';
import {emergenciaReal} from '../experiments/emergencia/backup-real.mjs';
import {abrirPacote} from '../experiments/emergencia/pacote-editorial.mjs';
import worker from '../experiments/emergencia/worker-backup-real-teste.mjs';
const projeto='https://pjglrlullnchqazxpvyn.supabase.co';
const config={habilitado:true,supabaseUrl:projeto,chavePublica:'sb_publishable_ficticia'};
const token='header.'+Buffer.from(JSON.stringify({sub:'ficticio',aal:'aal2'})).toString('base64url')+'.assinatura';
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const req=(n=1)=>new Request('https://teste.invalid/api/emergencia-real',{method:'POST',headers:{Origin:'https://teste.invalid',Authorization:'Bearer '+token,'X-Teste-Id':uuid(n)}});
let ativo=false,falha=false,contagem=0;const salvos=new Map(),ordem=[];
const db={prepare(sql){let v=[];return {bind(...valores){v=valores;return this;},async run(){
 if(sql.startsWith('UPDATE')){ativo=true;ordem.push('bloqueio');return {meta:{changes:1}};}
 if(sql.startsWith('INSERT')){assert(ativo);if(falha)throw Error('sem espaço');if(salvos.size<5&&!salvos.has(v[0]))salvos.set(v[0],{id:v[0],usuario_id:v[1],pacote:v[2],sha256:v[3]});return {meta:{changes:1}};}
 throw Error('SQL inesperado');
},async first(){if(sql.includes('count(*)'))return {total:salvos.size};if(sql.startsWith('SELECT id'))return salvos.get(v[0])||null;return {manutencao:ativo?1:0};}};}};
const dados=Object.fromEntries(['posts','albuns','trofeus','encontros','album_fotos','album_videos','trofeu_fotos'].map(t=>[t,[]]));
const captura={versaoCaptura:1,capturadoEm:'2026-11-09T12:00:00.000Z',contagens:Object.fromEntries(Object.keys(dados).map(t=>[t,0])),dados};
const fetcher=async(url)=>{
 if(url.endsWith('/user'))return Response.json({id:'ficticio'});
 if(url.endsWith('/estado_acesso_painel'))return Response.json({autorizado:true,mfa_necessario:false});
 assert(ativo);ordem.push('captura');contagem++;return Response.json(captura);
};
let r=await emergenciaReal(req(),config,db,fetcher);assert.equal(r.status,200);assert.deepEqual(ordem,['bloqueio','captura']);assert.equal(salvos.size,1);
const original=salvos.get(uuid(1));await abrirPacote(original.pacote);assert.equal(original.usuario_id,'ficticio');
r=await emergenciaReal(req(),config,db,fetcher);assert.equal(r.status,200);assert.equal(contagem,1);assert.equal(salvos.get(uuid(1)),original);
falha=true;r=await emergenciaReal(req(2),config,db,fetcher);assert.equal(r.status,503);assert(ativo);assert.equal(salvos.size,1);
falha=false;for(let n=2;n<=5;n++)assert.equal((await emergenciaReal(req(n),config,db,fetcher)).status,200);
const antes=contagem;assert.equal((await emergenciaReal(req(6),config,db,fetcher)).status,503);assert.equal(salvos.size,5);assert.equal(contagem,antes);
ativo=false;assert.equal((await emergenciaReal(new Request('https://teste.invalid/api/emergencia-real',{method:'POST',headers:{Origin:'https://teste.invalid','X-Teste-Id':uuid(9)}}),config,db,fetcher)).status,403);assert.equal(ativo,false);
assert.equal((await emergenciaReal(req(),{...config,habilitado:false},db,fetcher)).status,503);assert.equal(ativo,false);
const env={DB:db,SUPABASE_URL:projeto,SUPABASE_ANON_KEY:config.chavePublica};
const html=await (await worker.fetch(new Request('https://teste.invalid/login-teste'),env)).text();
assert.match(html,/id="backup-real"/);assert.doesNotMatch(html,/nem copia dados reais do Supabase/);new Function(html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1]);
assert.equal((await worker.fetch(new Request('https://teste.invalid/api/emergencia-real'),env)).status,405);
console.log('Backup D1 local: autorização, bloqueio antes da captura, cópia íntegra, repetição sem sobrescrita, falha mantém bloqueio, teto de 5 e script completo aprovados. Só mocks.');
