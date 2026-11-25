import {testarConteudoBuild} from '../cloudflare/testar-conteudo-build.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {servirConteudoBuildCandidato} from '../cloudflare/conteudo-build-candidato.mjs';
import {responderConteudoCandidato} from '../experiments/origem-protegida/edge-conteudo-candidata.mjs';
import {lerConteudoBuild,URL_CONTEUDO_BUILD} from '../src/lib/conteudo-build.js';
import {assinarOrigem} from '../experiments/emergencia/assinatura-origem.mjs';
const db=new PGlite();
try{
 await db.exec(readFileSync('experiments/emergencia/esquema-colunas-observado.sql','utf8').replace('create schema restauracao;','').replaceAll('restauracao.','public.'));
 await db.exec('create role anon nologin;create role authenticated nologin;create role service_role nologin;');
 await db.exec(readFileSync('experiments/origem-protegida/candidato.sql','utf8'));await db.exec(readFileSync('experiments/origem-protegida/rpc-candidatas.sql','utf8'));await db.exec(readFileSync('experiments/origem-protegida/conteudo-publicado-candidato.sql','utf8'));
 await db.exec(`alter table posts add column dado_privado_futuro text default 'NAO-VAZAR';
 insert into posts(slug,titulo,resumo,data,publicado) values('visivel','Teste','',current_date-1,true),('futuro','NAO-VAZAR','',current_date+2,true),('rascunho','NAO-VAZAR','',current_date-1,false);
 insert into albuns(slug,titulo,publicado) values('visivel','Teste',true),('rascunho','NAO-VAZAR',false);
 insert into album_fotos(album_id,url) select id,case when publicado then 'visivel.jpg' else 'NAO-VAZAR' end from albuns;
 insert into trofeus(slug,evento,historia,publicado) values('visivel','Teste','',true),('rascunho','NAO-VAZAR','',false);
 insert into trofeu_fotos(trofeu_id,url) select id,case when publicado then 'visivel.jpg' else 'NAO-VAZAR' end from trofeus;
 insert into encontros(nome,inicio,cidade,uf,publicado) values('visivel',current_date,'Recife','PE',true),('NAO-VAZAR',current_date,'Recife','PE',false);`);
 const segredo='fixture-segredo-apenas-local-000000000000000',chaveServidor='fixture-chave-edge-apenas-local-000000000';let manutencao=0,rpcs=0;
 const env={MIDIA_WORKER_HMAC:segredo,DB:{prepare:()=>({first:async()=>({manutencao})})}};
 const redeEdge=async(url,o)=>{
  rpcs++;assert.equal(o.headers.Authorization,'Bearer '+chaveServidor);assert(url.startsWith('https://pjglrlullnchqazxpvyn.supabase.co/rest/v1/rpc/'));
  const b=JSON.parse(o.body);await db.exec('set role service_role');
  try{
   if(url.endsWith('/origem_worker_consumir_nonce'))return Response.json((await db.query('select public.origem_worker_consumir_nonce($1::uuid,$2::bigint) ok',[b.valor,b.expira])).rows[0].ok);
   assert(url.endsWith('/origem_worker_conteudo_publicado'));return Response.json((await db.query('select public.origem_worker_conteudo_publicado() doc')).rows[0].doc);
  }finally{await db.exec('reset role');}
 };
 const redeWorker=(url,o)=>{assert.equal(o.headers?.Authorization,undefined);assert.equal(o.headers?.apikey,undefined);return responderConteudoCandidato(new Request(url,o),{segredo,chaveServidor,buscar:redeEdge});};
 const redeBuild=(url,o)=>{assert.equal(url,URL_CONTEUDO_BUILD);assert.equal(o.headers?.Authorization,undefined);return servirConteudoBuildCandidato(new Request(url,o),env,redeWorker);};
 const dados=await lerConteudoBuild(URL_CONTEUDO_BUILD,redeBuild);for(const t of ['posts','albuns','trofeus','encontros'])assert.equal(dados[t].length,1);assert.equal(dados.albuns[0].album_fotos.length,1);assert.equal(dados.trofeus[0].trofeu_fotos.length,1);assert.doesNotMatch(JSON.stringify(dados),/NAO-VAZAR|dado_privado_futuro/);
 manutencao=1;const antes=rpcs;await assert.rejects(lerConteudoBuild(URL_CONTEUDO_BUILD,redeBuild));assert.equal(rpcs,antes);manutencao=0;
 await assert.rejects(lerConteudoBuild('https://externo.invalid/roubo',redeBuild));
 const imagem=await assinarOrigem({segredo,caminho:'/midia-worker/midia/fixture.jpg'});
 assert.equal((await responderConteudoCandidato(new Request('https://pjglrlullnchqazxpvyn.supabase.co/functions/v1/midia-worker/conteudo',{headers:imagem}),{segredo,chaveServidor,buscar:redeEdge})).status,403);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select public.origem_worker_conteudo_publicado()'));await db.exec('reset role');}
 const token='h.'+Buffer.from(JSON.stringify({sub:'fixture',aal:'aal2'})).toString('base64url')+'.s';
 const diagEnv={...env,SUPABASE_URL:'https://pjglrlullnchqazxpvyn.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_fixture'};
 const diagReq=()=>new Request('https://site.invalid/api/testar-conteudo-build',{method:'POST',headers:{Origin:'https://site.invalid',Authorization:'Bearer '+token}});
 const diagRede=async(url,o)=>{if(url.endsWith('/auth/v1/user'))return Response.json({id:'fixture'});if(url.endsWith('/estado_acesso_painel'))return Response.json({autorizado:true,mfa_necessario:false});return redeWorker(url,o);};
 const diag=await testarConteudoBuild(diagReq(),diagEnv,diagRede);assert.equal(diag.status,200);assert.match(await diag.text(),/1 posts, 1 álbuns, 1 troféus e 1 encontros.*HTTP 403/);
 const semOrigem=diagReq();semOrigem.headers.delete('Origin');assert.equal((await testarConteudoBuild(semOrigem,diagEnv,diagRede)).status,403);
 console.log('Conteúdo build LOCAL: build sem chave -> Worker -> HMAC exclusivo -> Edge -> SQL sob papel servidor. Publicados/filhos permitidos, rascunhos/futuros/coluna nova não vazam; manutenção sem fallback, RPCs privadas e assinatura de imagem recusada. Sem implantação.');
}finally{await db.close();}
