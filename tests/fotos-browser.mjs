import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import worker from '../cloudflare/site-worker.mjs';
import {tratarMidiaBackup} from '../cloudflare/midia-backup.mjs';
import {verificarZipFotos} from '../experiments/emergencia/zip-fotos.mjs';
const bytes=new Uint8Array([255,216,0,42,255,217]);
const hash=Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');
const token='h.'+Buffer.from(JSON.stringify({sub:'ficticio',aal:'aal2'})).toString('base64url')+'.s';
const env={SUPABASE_URL:'https://pjglrlullnchqazxpvyn.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_ficticia',ASSETS:{fetch:async request=>new URL(request.url).pathname==='/_backup-assets.json'?Response.json({versao:1,arquivos:[{bucket:'repositorio',caminho:'media/ficticia.jpg',tamanho:bytes.length,sha256:hash}]}):new Response(bytes)}};
const externo=async url=>Response.json(url.endsWith('/user')?{id:'ficticio'}:url.endsWith('/estado_acesso_painel')?{autorizado:true,mfa_necessario:false}:[]);
const html=await (await worker.fetch(new Request('https://teste.invalid/login-teste'),env)).text();
const dom=new JSDOM(html,{url:'https://teste.invalid/login-teste',runScripts:'outside-only'});
const w=dom.window;let salvo,resolveu;const acabou=new Promise(r=>resolveu=r);
try{
 Object.defineProperty(w,'crypto',{value:crypto});Object.assign(w,{TextEncoder,TextDecoder,Blob,Uint8Array});
 w.confirm=()=>true;w.HTMLAnchorElement.prototype.click=function(){};
 w.URL.createObjectURL=blob=>{salvo=blob;resolveu();return 'blob:teste';};w.URL.revokeObjectURL=()=>{};
 w.fetch=(path,opcoes)=>tratarMidiaBackup(new Request(new URL(path,w.location.href),{...opcoes,headers:{...opcoes.headers,Origin:w.location.origin}}),env,externo);
 const js=html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1];
 w.eval(js+"\ntoken="+JSON.stringify(token)+";document.getElementById('baixar-fotos').click();");
 let timer;await Promise.race([acabou,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error(w.document.getElementById('status').textContent)),5000))]).finally(()=>clearTimeout(timer));
 assert.deepEqual(await verificarZipFotos(salvo),{arquivos:1,totalBytes:bytes.length});assert.equal(w.localStorage.length,0);
 console.log('Browser simulado: botão autenticado percorre inventário/arquivo, verifica bytes e produz ZIP validado sem persistir sessão no localStorage.');
}finally{w.close();}
