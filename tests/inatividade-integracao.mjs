import { BUCKET_RASCUNHOS, urlFotoPrivada, criarPreviaPrivada } from '../src/lib/midia-privada.js';
// Executa o script real do painel em DOM, com Auth simulado e relógio acelerado.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { marked } from 'marked';
import { sanitizarPrevia } from '../src/lib/previa-segura.js';
import { criarControleAcesso } from '../src/lib/controle-acesso.js';
import { criarTelaMfa } from '../src/lib/mfa-painel.js';
import { criarRelogioInatividade, identificadorSessao } from '../src/lib/inatividade.js';
import { criarAvisoInatividade } from '../src/lib/aviso-inatividade.js';
const dom=new JSDOM('<div id="pn-app"></div><div id="pn-config" data-base="/"></div>',{url:'https://fixture.invalid/admin/',runScripts:'outside-only',pretendToBeVisual:true});
const win=dom.window, doc=win.document;
let now=10000000, offline=true, authCallback, logoutCalls=0;
const jwt=id=>'a.'+Buffer.from(JSON.stringify({session_id:id})).toString('base64url')+'.c';
let session={user:{id:'conta-local',email:'teste@example.invalid'},access_token:jwt('sessao-inicial')};
const client={
 auth:{
  getSession:async()=>({data:{session},error:null}),
  onAuthStateChange:callback=>{authCallback=callback;},
  signOut:async({scope})=>{
   assert.equal(scope,'local');logoutCalls++;
   if(offline)return {error:{message:'offline'}};
   session=null;authCallback('SIGNED_OUT',null);return {error:null};
  },
 },
 rpc:async nome=>({data:nome==='estado_acesso_painel'?{autorizado:true,mfa_necessario:false,mfa_ativo:false}:{ok:true,configurada:true},error:null}),
 from:()=>({select:()=>({order:async()=>({data:[],error:null})})}),
};
const timeouts=[],intervals=[];
win.setTimeout=(fn,ms=0)=>{if(ms===0)timeouts.push(fn);return 1;};
win.setInterval=(fn,ms)=>{intervals.push({fn,ms});return intervals.length;};
win.Date.now=()=>now;
win.deps={
 BUCKET_RASCUNHOS, urlFotoPrivada, criarPreviaPrivada:opts=>criarPreviaPrivada({...opts,documento:doc}),
 createClient:()=>client,marked,sanitizarPrevia,criarControleAcesso,identificadorSessao,
 criarTelaMfa:opts=>criarTelaMfa({...opts,documento:doc}),
 criarRelogioInatividade:opts=>criarRelogioInatividade({...opts,agora:()=>now}),
 criarAvisoInatividade:opts=>criarAvisoInatividade({...opts,documento:doc}),
};
let source=readFileSync('src/scripts/admin.js','utf8').replace(/^import .*;\s*$/gm,'')
 .replaceAll('import.meta.env.PUBLIC_SUPABASE_URL',"'https://fixture.invalid'")
 .replaceAll('import.meta.env.PUBLIC_SUPABASE_ANON_KEY',"'fixture-publica'");
win.eval(`(()=>{const {${Object.keys(win.deps).join(',')}}=window.deps;${source}\n})()`);
const flush=async()=>{for(let i=0;i<5;i++){while(timeouts.length)timeouts.shift()();await new Promise(r=>setImmediate(r));}};
authCallback('INITIAL_SESSION',session);await flush();assert(doc.querySelector('.pn-topo'));
const tick=intervals.find(t=>t.ms===1000).fn;
now+=28*60000;tick();assert(doc.querySelector('[role="alertdialog"]'));
doc.querySelector('[data-continuar]').click();assert(!doc.querySelector('[role="alertdialog"]'));assert(doc.querySelector('.pn-topo'));
now+=31*60000;tick();await flush();assert(!doc.querySelector('.pn-topo'));assert(doc.querySelector('[data-repetir-saida]'));assert.equal(logoutCalls,1);
assert.equal(doc.querySelector('[data-repetir-saida]').disabled,false);
// Um refresh automático atrasado não reabre o editor enquanto logout falhou.
authCallback('TOKEN_REFRESHED',session);await flush();assert(!doc.querySelector('.pn-topo'));assert(doc.querySelector('[data-repetir-saida]'));
offline=false;doc.querySelector('[data-repetir-saida]').click();await flush();assert(doc.querySelector('#pn-login'));assert(doc.body.textContent.includes('inatividade'));
// Um novo login com outra sessão recebe prazo novo.
session={user:{id:'conta-local',email:'teste@example.invalid'},access_token:jwt('novo-login')};
authCallback('SIGNED_IN',session);await flush();assert(doc.querySelector('.pn-topo'));
dom.window.close();
console.log('Inatividade/integrado: script real, aviso, continuação, logout offline, refresh bloqueado, retry e novo login OK.');
