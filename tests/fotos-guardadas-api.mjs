import assert from 'node:assert/strict';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {fotosGuardadas} from '../cloudflare/fotos-guardadas.mjs';
import {SQL_SNAPSHOT_FOTOS} from '../experiments/emergencia/snapshot-fotos.mjs';
import {copiarFotosAutomaticas} from '../src/lib/fotos-automaticas.js';
const mf=new Miniflare(convertV4MiniflareOptions({rootPath:'/',name:'fotos',modules:true,script:'export default {fetch(){return new Response("local");}}',d1Databases:['DB']}));
try{
 const db=await mf.getD1Database('DB','fotos');await db.exec('CREATE TABLE backups_editoriais_reais(id TEXT PRIMARY KEY,usuario_id TEXT); CREATE TABLE estado_site(id INTEGER PRIMARY KEY,manutencao INTEGER); INSERT INTO estado_site VALUES(1,1);');await db.exec(SQL_SNAPSHOT_FOTOS.replaceAll('\n',' '));
 const id='00000000-0000-4000-8000-000000000001';await db.prepare('INSERT INTO backups_editoriais_reais VALUES(?,?)').bind(id,'fixture').run();
 const env={DB:db,SUPABASE_URL:'https://pjglrlullnchqazxpvyn.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_fixture',ASSETS:{fetch:async()=>Response.json({versao:1,arquivos:[]})}};
 const token='h.'+Buffer.from(JSON.stringify({sub:'fixture',aal:'aal2'})).toString('base64url')+'.s';
 const bytes=new Uint8Array([255,216,255,0,128]);let objetoIndisponivel=false,admin=true;let chamadasStorage=0;
 const rede=async(u,o)=>{assert.equal(o.redirect,'manual');if(u.endsWith('/user'))return Response.json({id:'fixture'});if(u.endsWith('/estado_acesso_painel'))return Response.json({autorizado:admin,mfa_necessario:false});if(u.includes('/object/list/'))return Response.json(u.endsWith('/midia')?[{id:'a',name:'foto.jpg',metadata:{size:5}}]:[]);assert(u.includes('/object/authenticated/midia/foto.jpg'));chamadasStorage++;return objetoIndisponivel?new Response('removido',{status:404}):new Response(bytes);};
 const chamar=(acao,extra={})=>fotosGuardadas(new Request('https://fixture.invalid/api/fotos-guardadas/'+acao,{method:'POST',headers:{Origin:'https://fixture.invalid',Authorization:'Bearer '+token,'X-Teste-Id':id,...extra}}),env,rede);
 assert.equal((await chamar('concluir')).status,404);
 const fetchImpl=(u,o)=>fotosGuardadas(new Request('https://fixture.invalid'+u,{...o,headers:{...o.headers,Origin:'https://fixture.invalid'}}),env,rede);
 const mensagem=await copiarFotosAutomaticas({id,token,fetchImpl});assert.match(mensagem,/1 arquivos, 5 bytes/);
 assert.equal(chamadasStorage,1);objetoIndisponivel=true;
 // Download não consulta origem; continua íntegro mesmo com objeto fonte removido.
 const inventario=await (await chamar('inventario')).json();assert.equal(inventario.arquivos.length,1);
 let r=await chamar('arquivo',{'X-Foto-Nome':encodeURIComponent('midia/foto.jpg')});assert.equal(r.status,200);assert.deepEqual(new Uint8Array(await r.arrayBuffer()),bytes);assert.equal(chamadasStorage,1);
 await copiarFotosAutomaticas({id,token,fetchImpl});assert.equal(chamadasStorage,1);
 r=await chamar('arquivo',{'X-Foto-Nome':encodeURIComponent('midia/../segredo')});assert.equal(r.status,400);
 admin=false;assert.equal((await chamar('inventario')).status,403);admin=true;
 const semOrigem=new Request('https://fixture.invalid/api/fotos-guardadas/inventario',{method:'POST'});assert.equal((await fotosGuardadas(semOrigem,env,rede)).status,403);
 const corrompido=new Uint8Array(5);await db.prepare('UPDATE objetos_snapshot_fotos SET bytes=? WHERE snapshot_id=?').bind(corrompido.buffer,id).run();assert.equal((await chamar('arquivo',{'X-Foto-Nome':'midia%2Ffoto.jpg'})).status,503);
 assert.equal((await db.prepare('SELECT manutencao FROM estado_site').first()).manutencao,1);
 console.log('API fotos LOCAL: autenticação/Origin, captura, retomada, selo, download independente da origem, integridade, path inválido e manutenção preservada aprovados. Sem conteúdo ou provedor real.');
}finally{await mf.dispose();}
