import assert from 'node:assert/strict';
import {JSDOM,VirtualConsole} from 'jsdom';
import worker from '../cloudflare/site-worker.mjs';
let chamadas=0;
const r=await worker.fetch(new Request('https://controle.invalid/login-teste'),{SUPABASE_URL:'https://pjglrlullnchqazxpvyn.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_fixture',DB:{prepare(){throw Error('Login não deve consultar/gravar D1');}}});
assert.equal(r.status,200);const html=await r.text(),csp=r.headers.get('Content-Security-Policy');
const erros=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>erros.push(e.message));
const dom=new JSDOM(html,{url:'https://controle.invalid/login-teste',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){w.fetch=()=>{chamadas++;throw Error('Não pode requisitar ao abrir');};}});
try{
const d=dom.window.document;assert.deepEqual(erros,[]);assert.equal(chamadas,0);
for(const id of ['login','mfa','acoes','email','senha','codigo','reabrir','backup-real','emergencia','id-copia','conferir','baixar-guardada','consultar-agendamento','testar-conteudo-build','testar-origem-assinada','retomar-fotos-d1','baixar-fotos-d1','baixar-fotos','zip-local-fotos','verificar-fotos','baixar','status','limpar'])assert.equal(d.querySelectorAll('#'+id).length,1,id);
assert.equal(d.getElementById('acoes').hidden,true);assert.equal(d.getElementById('mfa').hidden,true);assert.equal(d.getElementById('reabrir').textContent,'Reabrir site');
assert(d.getElementById('emergencia').closest('details'));assert(d.getElementById('backup-real').closest('details'));
const nonce=d.querySelector('script').getAttribute('nonce');assert(nonce);assert.equal(d.querySelector('style').getAttribute('nonce'),nonce);assert(csp.includes("style-src 'nonce-"+nonce+"'"));assert(csp.includes("frame-ancestors 'none'"));assert(!csp.includes('unsafe-inline'));assert(!csp.includes('unsafe-eval'));assert(d.querySelector('style').textContent.includes('data:font/woff2;base64,'));assert.equal(d.querySelectorAll('link,iframe,img').length,0);
assert.match(d.querySelector('h1').textContent,/Controle de emergência/);
console.log('Controle visual: HTML real, todos IDs/handlers inicializam sem rede, MFA/ações ocultos, CSP nonce preservada e fonte local embutida. Não prova aparência em navegador real.');
}finally{dom.window.close();}
