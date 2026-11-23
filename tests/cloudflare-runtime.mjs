import {verificarOrigem} from '../experiments/emergencia/assinatura-origem.mjs';
// Integração com runtime local workerd/Miniflare e D1 emulado. Sem rede real.
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
const pasta=mkdtempSync(join(tmpdir(),'site-cf-'));
mkdirSync(join(pasta,'media'));writeFileSync(join(pasta,'index.html'),'<h1>Site fictício</h1>');writeFileSync(join(pasta,'media','foto.txt'),'foto fictícia');
let origem='http://teste.invalid';
const token='h.'+Buffer.from(JSON.stringify({sub:'operador-ficticio',aal:'aal2'})).toString('base64url')+'.s';
const segredoMidia='fixture-hmac-runtime-nao-producao-000000000000';let imagensAssinadas=0;
let capturou,soltar;
const capturaIniciou=new Promise(r=>capturou=r),gate=new Promise(r=>soltar=r);
const dados=Object.fromEntries(['posts','albuns','trofeus','encontros','album_fotos','album_videos','trofeu_fotos'].map(t=>[t,[]]));
const captura={versaoCaptura:1,capturadoEm:'2026-11-09T12:00:00.000Z',dados,contagens:Object.fromEntries(Object.keys(dados).map(t=>[t,0]))};
const conteudoFoto=new TextEncoder().encode('foto fictícia');
const hashFoto=Buffer.from(await crypto.subtle.digest('SHA-256',conteudoFoto)).toString('hex');
writeFileSync(join(pasta,'_backup-assets.json'),JSON.stringify({versao:1,arquivos:[{bucket:'repositorio',caminho:'media/foto.txt',tamanho:conteudoFoto.length,sha256:hashFoto}]}));
const mf=new Miniflare(convertV4MiniflareOptions({rootPath:'/',name:'site',modules:true,scriptPath:resolve(process.env.CLOUDFLARE_BUNDLE || '/tmp/cloudflare-dryrun/site-worker.js'),compatibilityDate:'2026-11-09',
 assets:{directory:pasta,binding:'ASSETS',run_worker_first:true},
 d1Databases:['DB'],bindings:{MIDIA_WORKER_HMAC:segredoMidia,SUPABASE_URL:'https://pjglrlullnchqazxpvyn.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_ficticia'},
 outboundService:async request=>{
  const url=new URL(request.url);assert.equal(url.origin,'https://pjglrlullnchqazxpvyn.supabase.co');
  if(url.pathname.startsWith('/functions/v1/midia-worker/')){
   const canonica=new URL(url);canonica.pathname=canonica.pathname.slice('/functions/v1'.length);
   assert.equal(await verificarOrigem({request:new Request(canonica,{headers:request.headers}),segredo:segredoMidia,consumirNonce:async()=>true}),true);imagensAssinadas++;return new Response(new Uint8Array([255,216,255]),{headers:{'Content-Type':'image/jpeg'}});
  }
  if(url.pathname==='/auth/v1/user')return Response.json({id:'operador-ficticio'});
  if(url.pathname==='/rest/v1/rpc/estado_acesso_painel')return Response.json({autorizado:true,mfa_necessario:false});
  if(url.pathname.startsWith('/storage/v1/object/list/'))return Response.json([]);
  assert.equal(url.pathname,'/rest/v1/rpc/capturar_editorial_emergencia');capturou();await gate;return Response.json(captura);
 },
}));
const executar=(u,o)=>mf.getWorker('site').then(w=>w.fetch(u,o));
const options=()=>({method:'POST',headers:{Origin:origem,Authorization:'Bearer '+token,'X-Teste-Id':crypto.randomUUID()}});
try{
 origem=(await mf.ready).origin;
 const db=await mf.getD1Database('DB');
 for(const sql of ["CREATE TABLE estado_site(id INTEGER PRIMARY KEY,manutencao INTEGER,atualizado_em TEXT);INSERT INTO estado_site VALUES(1,0,CURRENT_TIMESTAMP);",readFileSync('experiments/emergencia/controle-operacoes-d1.sql','utf8'),readFileSync('experiments/emergencia/backup-real-d1.sql','utf8')]){
  // D1 exec não aceita comentários/linhas complexas de modo uniforme; batch de instruções simples.
  const semComentarios=sql.replace(/^--.*$/gm,'');for(const q of semComentarios.split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(q).run();
 }
 {const inicial=await executar(origem+'/');assert.equal(inicial.status,200,await inicial.text());}
 const primeiro=executar(origem+'/api/emergencia-real',options());
 let timeout;await Promise.race([capturaIniciou,primeiro.then(async r=>{throw Error('Operação terminou antes da captura: '+r.status+' '+await r.clone().text());}),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Captura não iniciou')),15000);})]).finally(()=>clearTimeout(timeout));
 const concorrente=await executar(origem+'/api/reabrir-teste',options());assert.equal(concorrente.status,409);
 soltar();const completo=await primeiro;assert.equal(completo.status,200,await completo.text());
 assert.equal((await executar(origem+'/')).status,503);
 assert.equal((await executar(origem+'/media/foto.txt')).status,503);
 assert.equal((await executar(origem+'/midia-protegida/midia/ficticia.jpg')).status,503);assert.equal(imagensAssinadas,0);
 assert.equal((await db.prepare('SELECT count(*) AS n FROM backups_editoriais_reais').first()).n,1);
 assert.equal((await executar(origem+'/login-teste')).status,200);
 assert.equal((await executar(origem+'/api/reabrir-teste',options())).status,200);
 assert.equal((await executar(origem+'/')).status,200);
 assert.equal((await executar(origem+'/media/foto.txt')).status,200);
 assert.equal((await db.prepare('SELECT operacao_id FROM controle_operacoes WHERE id=1').first()).operacao_id,null);
 assert.equal((await db.prepare('SELECT count(*) AS n FROM historico_operacoes').first()).n,4);
 const inventario=await executar(origem+'/api/midia-inventario',options());assert.equal(inventario.status,200);assert.equal((await inventario.json()).arquivos.length,1);
 const baixar=options();baixar.headers['X-Midia-Bucket']='repositorio';baixar.headers['X-Midia-Caminho']='media%2Ffoto.txt';
 const foto=await executar(origem+'/api/midia-arquivo',baixar);assert.equal(foto.status,200);assert.equal(foto.headers.get('X-Conteudo-Sha256'),hashFoto);assert.equal(await foto.text(),'foto fictícia');
 assert.equal((await executar(origem+'/_backup-assets.json')).status,404);
 const protegida=await executar(origem+'/midia-protegida/midia/ficticia.jpg');assert.equal(protegida.status,200);assert.equal((await protegida.arrayBuffer()).byteLength,3);assert.equal(imagensAssinadas,1);
 console.log('Runtime local de mídia: inventário autenticado, bytes do ASSETS, hash SHA-256 e manifesto sem rota pública aprovados.');

 console.log('Runtime Cloudflare LOCAL: assets, D1 emulado, autenticação simulada, backup, concorrência 409, bloqueio HTML/arquivo, reabertura e auditoria transacional aprovados. Sem conta/provedor remoto.');
}finally{soltar();await mf.dispose();rmSync(pasta,{recursive:true,force:true});}
