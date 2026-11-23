import assert from 'node:assert/strict';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {verificarPublicacaoAgendada} from '../cloudflare/agendamento-publicacao.mjs';
import {revisaoPublicada,diaRecife} from '../cloudflare/revisao-publicada.mjs';
const mf=new Miniflare(convertV4MiniflareOptions({rootPath:'/',name:'agenda',modules:true,script:'export default {fetch(){return new Response("local");}}',d1Databases:['DB']}));
try{
 const db=await mf.getD1Database('DB','agenda');await db.exec('CREATE TABLE estado_site(id INTEGER PRIMARY KEY,manutencao INTEGER);INSERT INTO estado_site VALUES(1,0);');
 const agora=Date.parse('2026-11-10T03:10:00Z');assert.equal(diaRecife(agora-11*60000),'2026-11-09');
 let dados={versao:1,posts:[],albuns:[],trofeus:[],encontros:[]};let referencia=await revisaoPublicada(dados,agora),hooks=0,falha=false;
 const env={AGENDAMENTO_PUBLICACAO:'1',DB:db,MIDIA_WORKER_HMAC:'fixture-apenas-local-000000000000000000',CLOUDFLARE_DEPLOY_HOOK_URL:'https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/00000000-0000-4000-8000-000000000001',ASSETS:{fetch:async()=>Response.json(referencia)}};
 const buscar=async(u,o)=>{assert.equal(o.redirect,'manual');if(u.includes('/functions/v1/'))return Response.json(dados);hooks++;if(falha)throw Error('segredo-nao-logar');return Response.json({success:true});};
 const executar=(extras={})=>verificarPublicacaoAgendada(env,{buscar,agora,...extras});
 assert.equal(await verificarPublicacaoAgendada({...env,AGENDAMENTO_PUBLICACAO:undefined}), 'desativado');
 assert.equal(await executar(),'atualizado');assert.equal(hooks,0);
 assert.deepEqual(await revisaoPublicada({encontros:[],trofeus:[],albuns:[],posts:[],versao:1},agora),referencia);
 dados={...dados,posts:[{id:'post-na-data',publicado:true}]};
 assert.equal(await executar(),'tentativa-enviada');assert.equal(hooks,1);assert.equal(await executar(),'limite-ou-espera');
 await db.exec('UPDATE publicacao_cloudflare SET solicitado_em=0');falha=true;
 assert.equal(await executar({agora:agora+3600001}),'indisponivel');assert.equal(hooks,2);assert.equal(await executar({agora:agora+3600001}),'limite-ou-espera');
 falha=false;referencia=await revisaoPublicada(dados,agora);assert.equal(await executar(),'atualizado');
 // Edição após baseline continua pendente; nenhum sucesso do hook substitui manifesto.
 dados={...dados,posts:[{id:'post-na-data',publicado:true,titulo:'editado durante build'}]};
 await db.exec('UPDATE estado_site SET manutencao=1');assert.equal(await executar(),'manutencao');await db.exec('UPDATE estado_site SET manutencao=0');
 for(let i=2;i<4;i++){await db.exec('UPDATE publicacao_cloudflare SET solicitado_em=0');assert.equal(await executar({agora:agora+i*3600001}),'tentativa-enviada');}
 await db.exec('UPDATE publicacao_cloudflare SET solicitado_em=0');assert.equal(await executar({agora:agora+5*3600001}),'limite-ou-espera');assert.equal(hooks,4);
 referencia=await revisaoPublicada(dados,agora+86400000);assert.equal(await executar({agora:agora+86400000}),'atualizado');
 // Virada Recife invalida HTML temporal mesmo sem mudança editorial.
 referencia=await revisaoPublicada(dados,agora);await db.exec('UPDATE publicacao_cloudflare SET solicitado_em=0');assert.equal(await executar({agora:agora+86400000}),'tentativa-enviada');
 assert.equal(await verificarPublicacaoAgendada({...env,ASSETS:{fetch:async()=>new Response('',{status:404})}},{buscar,agora}),'sem-referencia');
 console.log('Agendamento LOCAL: desativado por padrão, canonicalização, virada Recife, baseline efetivamente servido, edição em voo, manutenção, backoff e limite4/dia aprovados. Nenhum cron/build remoto.');
}finally{await mf.dispose();}
