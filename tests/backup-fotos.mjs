import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {montarZipFotos,verificarZipFotos} from '../experiments/emergencia/zip-fotos.mjs';
import {tratarMidiaBackup} from '../cloudflare/midia-backup.mjs';
import worker from '../cloudflare/site-worker.mjs';
const bytes=new Uint8Array([0,255,1,128,42]),hash=Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');
const nome='media/ação.jpg';
const repo={bucket:'repositorio',caminho:nome,tamanho:bytes.length,sha256:hash};
let listas=0,leituras=0,negado=false,falhar=false,grande=false;
const env={SUPABASE_URL:'https://pjglrlullnchqazxpvyn.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_ficticia',ASSETS:{fetch:async req=>new URL(req.url).pathname==='/_backup-assets.json'?Response.json({versao:1,arquivos:[repo]}):new Response(bytes)}};
const token='h.'+Buffer.from(JSON.stringify({sub:'ficticio',aal:'aal2'})).toString('base64url')+'.s';
const req=(path='/api/midia-inventario',extra={})=>new Request('https://teste.invalid'+path,{method:'POST',headers:{Origin:'https://teste.invalid',Authorization:'Bearer '+token,...extra}});
const fetcher=async(u,o)=>{
 assert.equal(new URL(u).origin,env.SUPABASE_URL);assert.equal(o.redirect,'manual');assert(o.signal);
 if(u.endsWith('/user'))return Response.json({id:'ficticio'});
 if(u.endsWith('/estado_acesso_painel'))return Response.json({autorizado:!negado,mfa_necessario:false});
 if(u.includes('/object/list/')){listas++;if(falhar)return new Response('falha privada',{status:403});const p=JSON.parse(o.body);if(u.endsWith('/midia'))return Response.json([{id:'id',name:'publica.jpg',metadata:{size:grande?11*1024*1024:5}}]);if(p.prefix==='')return Response.json([{id:null,name:'v1',metadata:null}]);return Response.json([{id:'id2',name:'privada.webp',metadata:{size:5}}]);}
 leituras++;assert(u.includes('/object/authenticated/'));return new Response(bytes);
};
let r=await tratarMidiaBackup(req(),env,fetcher);assert.equal(r.status,200);const inventario=await r.json();assert.equal(inventario.arquivos.length,3);assert.equal(listas,3);
for(const a of inventario.arquivos){r=await tratarMidiaBackup(req('/api/midia-arquivo',{'X-Midia-Bucket':a.bucket,'X-Midia-Caminho':encodeURIComponent(a.caminho)}),env,fetcher);assert.equal(r.status,200);assert.deepEqual(new Uint8Array(await r.arrayBuffer()),bytes);assert.equal(r.headers.get('X-Conteudo-Sha256'),hash);assert.equal(r.headers.get('Cache-Control'),'no-store');}
assert.equal(leituras,2);
for(const [b,p] of [['qualquer','segredo'],['midia','../segredo'],['repositorio','media/inexistente.jpg'],['midia','https://invasor.invalid/foto'],['midia','a\\b']]){
 const status=(await tratarMidiaBackup(req('/api/midia-arquivo',{'X-Midia-Bucket':b,'X-Midia-Caminho':encodeURIComponent(p)}),env,fetcher)).status;assert(status===400||status===404);
}
negado=true;const antes=listas;assert.equal((await tratarMidiaBackup(req(),env,fetcher)).status,403);assert.equal(listas,antes);negado=false;
falhar=true;r=await tratarMidiaBackup(req(),env,fetcher);assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/falha privada/);falhar=false;
grande=true;assert.equal((await tratarMidiaBackup(req(),env,fetcher)).status,503);grande=false;
const semToken=req();semToken.headers.delete('Authorization');assert.equal((await tratarMidiaBackup(semToken,env,fetcher)).status,403);
const origem=req();origem.headers.set('Origin','https://outro.invalid');assert.equal((await tratarMidiaBackup(origem,env,fetcher)).status,403);
assert.equal((await tratarMidiaBackup(new Request('https://teste.invalid/api/midia-inventario'),env,fetcher)).status,405);
const html=await (await worker.fetch(new Request('https://teste.invalid/login-teste'),env)).text();assert.match(html,/id="baixar-fotos"/);new Function(html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1]);
assert.equal((await worker.fetch(new Request('https://teste.invalid/_backup-assets.json'),env)).status,404);
const pasta=mkdtempSync(join(tmpdir(),'zip-fotos-'));try{
 const zip=montarZipFotos([{nome:'repositorio/'+nome,bytes},{nome:'midia-rascunhos/v1/privada.webp',bytes},{nome:'manifesto.json',bytes:new TextEncoder().encode('{"ficticio":true}')}]);
 writeFileSync(join(pasta,'teste.zip'),Buffer.from(await zip.arrayBuffer()));
 const python=spawnSync('python3',['-c',"import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; assert z.read('repositorio/media/ação.jpg')==bytes([0,255,1,128,42]); assert len(z.namelist())==3",join(pasta,'teste.zip')],{encoding:'utf8'});assert.equal(python.status,0,python.stderr);
 assert.throws(()=>montarZipFotos([{nome:'../fora',bytes}]),/inválido/);
 assert.throws(()=>montarZipFotos([{nome:'a',bytes},{nome:'a',bytes}]),/duplicado/);
}finally{rmSync(pasta,{recursive:true,force:true});}
console.log('Mídia: autenticação/MFA/origem, fontes fixas, listagem recursiva, bytes privados, SHA-256, falhas/limites, painel e ZIP extraído por Python com CRC íntegro aprovados. Fixtures apenas.');

const midiaDoc={versao:1,tipo:'arquivos-midia-sem-cadastros',totalBytes:bytes.length,arquivos:[{bucket:'repositorio',caminho:nome,nome:'repositorio/'+nome,tamanho:bytes.length,sha256:hash}]};
const zipValido=montarZipFotos([{nome:'repositorio/'+nome,bytes},{nome:'manifesto.json',bytes:new TextEncoder().encode(JSON.stringify(midiaDoc))}]);
assert.deepEqual(await verificarZipFotos(zipValido),{arquivos:1,totalBytes:5});
const truncado=new Blob([new Uint8Array(await zipValido.arrayBuffer()).subarray(0,100)]);await assert.rejects(verificarZipFotos(truncado));
const corrompido=new Uint8Array(await zipValido.arrayBuffer());corrompido[60]^=1;await assert.rejects(verificarZipFotos(new Blob([corrompido])));
const falso={...midiaDoc,arquivos:[{...midiaDoc.arquivos[0],sha256:'0'.repeat(64)}]};
await assert.rejects(verificarZipFotos(montarZipFotos([{nome:'repositorio/'+nome,bytes},{nome:'manifesto.json',bytes:new TextEncoder().encode(JSON.stringify(falso))}])),/SHA-256/);
console.log('Verificador offline: ZIP válido aceito; truncamento, corrupção e manifesto com hash falso recusados.');
