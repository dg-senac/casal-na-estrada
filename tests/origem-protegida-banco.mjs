import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {assinarOrigem,autorizarLeituraOrigem} from '../experiments/emergencia/assinatura-origem.mjs';
const db=new PGlite();
try{
 const esquema=readFileSync('experiments/emergencia/esquema-colunas-observado.sql','utf8').replace('create schema restauracao;','').replaceAll('restauracao.','public.');
 await db.exec(esquema);await db.exec(readFileSync('experiments/origem-protegida/candidato.sql','utf8'));
 const base='https://pjglrlullnchqazxpvyn.supabase.co';
 await db.query(`insert into public.posts(slug,titulo,resumo,data,publicado,capa_url) values
 ('publicado','Fixture','',current_date-1,true,$1),('futuro','Fixture','',current_date+2,true,$2),('rascunho','Fixture','',current_date-1,false,$3)`,['visivel.jpg','futuro.jpg','rascunho.jpg'].map(p=>base+'/storage/v1/object/public/midia/'+p));
 const privado='v1/00000000-0000-4000-8000-000000000001.webp';
 await db.query('insert into public.albuns(slug,titulo,publicado,capa_url) values($1,$2,$3,$4)',['privado','Fixture',false,base+'/functions/v1/foto-publicada/'+privado]);
 await db.exec("insert into public.album_fotos(album_id,url) select id,'"+base+"/storage/v1/object/public/midia/filha.jpg' from public.albuns");
 const publicada=async(bucket,caminho)=>(await db.query('select origem_worker.foto_publicada($1,$2) ok',[bucket,caminho])).rows[0].ok;
 assert.equal(await publicada('midia','visivel.jpg'),true);
 for(const p of ['futuro.jpg','rascunho.jpg','filha.jpg','sem-referencia.jpg','../visivel.jpg','a\\visivel.jpg','%2e%2e/visivel.jpg'])assert.equal(await publicada('midia',p),false,p);
 assert.equal(await publicada('midia-rascunhos',privado),false);
 await db.exec('update public.albuns set publicado=true');
 assert.equal(await publicada('midia-rascunhos',privado),true);assert.equal(await publicada('midia','filha.jpg'),true);
 const consumir=async(n,e)=>(await db.query('select origem_worker.consumir_nonce($1::uuid,$2::bigint) ok',[n,e])).rows[0].ok;
 const agora=Math.floor(Date.now()/1000),nonce='00000000-0000-4000-8000-000000000010';
 const corridas=await Promise.all([consumir(nonce,agora+36),consumir(nonce,agora+36)]);assert.deepEqual(corridas.sort(),[false,true]);
 assert.equal(await consumir('00000000-0000-4000-8000-000000000011',agora-1),false);
 assert.equal(await consumir('00000000-0000-4000-8000-000000000012',agora+1000),false);
 await db.query('insert into origem_worker.nonces values($1,$2)',['00000000-0000-4000-8000-000000000013',agora-1]);
 await consumir('00000000-0000-4000-8000-000000000014',agora+36);
 assert.equal((await db.query('select count(*)::int n from origem_worker.nonces where expira_em<$1',[agora])).rows[0].n,0);
 // Fluxo real do protocolo criptográfico + consumo/publicação em Postgres local.
 const segredo='fixture-nao-usar-em-producao-000000000000000',caminho='/midia-worker/midia/visivel.jpg';
 const headers=await assinarOrigem({segredo,caminho});let leituras=0;
 const op={segredo,request:new Request('https://origem.invalid'+caminho,{headers}),consumirNonce:consumir};
 const adaptadores={estaPublicada:async()=>publicada('midia','visivel.jpg'),lerObjeto:async()=>{leituras++;return 'fixture-bytes';}};
 assert.equal(await autorizarLeituraOrigem(op,adaptadores),'fixture-bytes');assert.equal(await autorizarLeituraOrigem(op,adaptadores),null);assert.equal(leituras,1);
 await db.exec('create role visitante nologin; set role visitante;');
 await assert.rejects(db.query('select origem_worker.foto_publicada($1,$2)',['midia','visivel.jpg']));
 await assert.rejects(db.query('select origem_worker.consumir_nonce($1,$2)',[nonce,agora+36]));
 await db.exec('reset role;');
 // Limite de capacidade é testado no banco efêmero, sem criar dados reais.
 await db.exec('truncate origem_worker.nonces');
 await db.query(`insert into origem_worker.nonces select md5(n::text)::uuid,$1 from generate_series(1,10000) n`,[agora+60]);
 assert.equal(await consumir('ffffffff-ffff-4fff-8fff-ffffffffffff',agora+36),false);
 assert.equal((await db.query('select count(*)::int n from origem_worker.nonces')).rows[0].n,10000);
 console.log('Origem protegida em Postgres LOCAL: nonce atômico/replay/expiração/capacidade e função restrita de publicação, rascunho/futuro/filha privada e papel visitante testados; HMAC integrado ao SQL. Sem mudança remota.');
}finally{await db.close();}
