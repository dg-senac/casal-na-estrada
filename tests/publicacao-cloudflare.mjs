import assert from 'node:assert/strict';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {publicacaoCloudflare,hookPermitido} from '../cloudflare/publicacao-cloudflare.mjs';
import {criarPublicacaoCloudflare} from '../src/lib/publicacao-cloudflare.js';
const mf=new Miniflare(convertV4MiniflareOptions({rootPath:'/',name:'publicacao',modules:true,script:'export default {fetch(){return new Response("local");}}',d1Databases:['DB']}));
try{
 const db=await mf.getD1Database('DB','publicacao');await db.exec('CREATE TABLE estado_site(id INTEGER PRIMARY KEY,manutencao INTEGER);INSERT INTO estado_site VALUES(1,0);');
 const hook='https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/00000000-0000-4000-8000-000000000001';
 assert(hookPermitido(hook));for(const h of ['https://externo.invalid/hook',hook+'?x=1',hook+'/',hook.replace('https:','http:')])assert(!hookPermitido(h));
 const env={DB:db,CLOUDFLARE_DEPLOY_HOOK_URL:hook,SUPABASE_URL:'https://pjglrlullnchqazxpvyn.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_fixture'};
 const token='h.'+Buffer.from(JSON.stringify({sub:'fixture',aal:'aal2'})).toString('base64url')+'.s';let chamadas=0,admin=true,quebrar=false;
 const rede=async(u,o)=>{assert.equal(o.redirect,'manual');if(u.endsWith('/user'))return Response.json({id:'fixture'});if(u.endsWith('/estado_acesso_painel'))return Response.json({autorizado:admin,mfa_necessario:false});assert.equal(u,hook);assert.equal(o.method,'POST');assert.equal(o.headers,undefined);chamadas++;if(quebrar)throw Error('URL-secreta-nao-expor');return Response.json({success:true,result:{status:'queued',build_uuid:'fixture'}});};
 const req=(acao='solicitar')=>new Request('https://site.invalid/api/publicacao-cloudflare/'+acao,{method:'POST',headers:{Origin:'https://site.invalid',Authorization:'Bearer '+token}});
 let r=await publicacaoCloudflare(req('status'),env,rede);assert.deepEqual(await r.json(),{ok:true,configurada:true});assert.equal(chamadas,0);
 r=await publicacaoCloudflare(req(),env,rede);assert.equal(r.status,202);assert.match((await r.json()).mensagem,/ainda não confirma/);assert.equal(chamadas,1);
 assert.equal((await publicacaoCloudflare(req(),env,rede)).status,429);assert.equal(chamadas,1);
 await db.exec('UPDATE estado_site SET manutencao=1');assert.equal((await publicacaoCloudflare(req(),env,rede)).status,409);assert.equal(chamadas,1);await db.exec('UPDATE estado_site SET manutencao=0');
 admin=false;assert.equal((await publicacaoCloudflare(req(),env,rede)).status,403);admin=true;
 assert.equal((await publicacaoCloudflare(req(),{...env,CLOUDFLARE_DEPLOY_HOOK_URL:undefined},rede)).status,503);
 const errado=req();errado.headers.set('Origin','https://externo.invalid');assert.equal((await publicacaoCloudflare(errado,env,rede)).status,403);
 await db.exec('UPDATE publicacao_cloudflare SET solicitado_em=0');quebrar=true;r=await publicacaoCloudflare(req(),env,rede);assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/URL-secreta|deploy_hooks/);assert.equal((await publicacaoCloudflare(req(),env,rede)).status,429);
 assert.equal(criarPublicacaoCloudflare({habilitado:true,origem:'https://dg-senac.github.io'}),null);
 let endpoint;const cliente=criarPublicacaoCloudflare({habilitado:true,origem:'https://casal-na-estrada.douglasmarista02.workers.dev',obterSessao:async()=>({access_token:'fixture'}),fetchImpl:async(u,o)=>{endpoint=u;assert.equal(o.headers.Authorization,'Bearer fixture');return Response.json({ok:true,mensagem:'solicitado'},{status:202});}});assert.equal((await cliente.solicitar()).ok,true);assert.equal(endpoint,'/api/publicacao-cloudflare/solicitar');
 console.log('Publicação Cloudflare LOCAL: hook restrito no servidor, auth/MFA/Origin, manutenção, cooldown D1, incerteza sem retry, status sem gatilho e cliente restrito ao paralelo aprovados. Nenhum build real solicitado.');
}finally{await mf.dispose();}
