import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {assinarOrigem} from '../experiments/emergencia/assinatura-origem.mjs';
import {responderOrigemCandidata} from '../experiments/origem-protegida/edge-candidata.mjs';
const db=new PGlite();
try{
 await db.exec(readFileSync('experiments/emergencia/esquema-colunas-observado.sql','utf8').replace('create schema restauracao;','').replaceAll('restauracao.','public.'));
 await db.exec('create role anon nologin; create role authenticated nologin; create role service_role nologin;');
 await db.exec(readFileSync('experiments/origem-protegida/candidato.sql','utf8'));
 await db.exec(readFileSync('experiments/origem-protegida/rpc-candidatas.sql','utf8'));
 const base='https://pjglrlullnchqazxpvyn.supabase.co',caminho='/midia-worker/midia/foto.jpg',segredo='fixture-hmac-so-no-servidor-0000000000000000',chaveServidor='fixture-credencial-interna-edge-000000000000';
 await db.query('insert into posts(slug,titulo,resumo,data,capa_url) values($1,$2,$3,current_date-1,$4)',['teste','Fixture','',base+'/storage/v1/object/public/midia/foto.jpg']);
 let leituras=0,publicacoes=0,retirarDurante=false,tipo='image/jpeg';const bytes=new Uint8Array([255,216,255,0]);
 const buscar=async(url,o)=>{
  assert.equal(new URL(url).origin,base);assert.equal(o.redirect,'manual');assert.equal(o.headers.Authorization,'Bearer '+chaveServidor);assert.equal(o.headers.apikey,chaveServidor);assert.equal(o.headers.Cookie,undefined);
  if(url.includes('/rest/v1/rpc/')){
   const b=JSON.parse(o.body);let sql,args;
   if(url.endsWith('origem_worker_consumir_nonce')){sql='select public.origem_worker_consumir_nonce($1::uuid,$2::bigint) ok';args=[b.valor,b.expira];}
   else {assert(url.endsWith('origem_worker_foto_publicada'));sql='select public.origem_worker_foto_publicada($1,$2) ok';args=[b.bucket,b.caminho];publicacoes++;}
   await db.exec('set role service_role');let ok;try{ok=(await db.query(sql,args)).rows[0].ok;}finally{await db.exec('reset role');}
   return Response.json(ok);
  }
  assert.equal(url,base+'/storage/v1/object/authenticated/midia/foto.jpg');leituras++;
  if(retirarDurante)await db.exec('update posts set publicado=false');
  return new Response(bytes,{headers:{'Content-Type':tipo,'Set-Cookie':'nao-repassar','Location':'https://externo.invalid'}});
 };
 const op={segredo,urlSupabase:base,chaveServidor,buscar};
 const criar=async()=>new Request(base+'/functions/v1'+caminho,{headers:{...await assinarOrigem({segredo,caminho}),Authorization:'Bearer token-visitante',Cookie:'privado=sim'}});
 let req=await criar(),r=await responderOrigemCandidata(req,op);assert.equal(r.status,200);assert.deepEqual(new Uint8Array(await r.arrayBuffer()),bytes);assert.equal(r.headers.get('Set-Cookie'),null);assert.equal(r.headers.get('Location'),null);assert.equal(publicacoes,2);
 assert.equal((await responderOrigemCandidata(req,op)).status,403);assert.equal(leituras,1);
 req=new Request(base+'/functions/v1'+caminho);assert.equal((await responderOrigemCandidata(req,op)).status,403);assert.equal(leituras,1);
 await db.exec('update posts set publicado=false');assert.equal((await responderOrigemCandidata(await criar(),op)).status,404);assert.equal(leituras,1);
 await db.exec('update posts set publicado=true');retirarDurante=true;assert.equal((await responderOrigemCandidata(await criar(),op)).status,404);retirarDurante=false;
 await db.exec('update posts set publicado=true');tipo='text/html';assert.equal((await responderOrigemCandidata(await criar(),op)).status,404);
 assert.equal((await responderOrigemCandidata(await criar(),{...op,buscar:async()=>{throw Error('conteudo-secreto-do-erro');}})).status,403);
 for(const papel of ['anon','authenticated']){
  await db.exec('set role '+papel);
  await assert.rejects(db.query('select public.origem_worker_foto_publicada($1,$2)',['midia','foto.jpg']));
  await assert.rejects(db.query('select public.origem_worker_consumir_nonce($1::uuid,$2::bigint)',['00000000-0000-4000-8000-000000000001',Math.floor(Date.now()/1000)+30]));
  await db.exec('reset role');
 }
 console.log('Edge candidata LOCAL: HMAC -> RPC com papel servidor -> publicação -> Storage simulado -> segunda publicação. Replay/rascunho/despublicação/HTML/falha negados; RPC inacessível a anon/authenticated. Sem deploy ou segredo real.');
}finally{await db.close();}
