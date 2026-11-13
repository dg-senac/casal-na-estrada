import { JSDOM } from 'jsdom';
import assert from 'node:assert/strict';
import { criarTelaMfa } from '../src/lib/mfa-painel.js';
const tick = () => new Promise(resolve=>setImmediate(resolve));
function preparar() {
 const dom = new JSDOM('<main id="app"></main>');
 const app = dom.window.document.getElementById('app');
 const calls = [], eventos=[];
 let erroCodigo = false;
 const client = {auth:{mfa:{
  enroll: async () => ({data:{id:'fator-de-teste',totp:{qr_code:'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg"/>',secret:'CHAVE-FICTICIA-SEM-USO'}},error:null}),
  listFactors: async () => ({data:{totp:[{id:'fator-de-teste',status:'verified',friendly_name:'Meu autenticador'}]},error:null}),
  challengeAndVerify: async args => {calls.push(['verificar',args]);return {error:erroCodigo?{message:'Código inválido'}:null};},
  unenroll: async args => {calls.push(['descartar',args]);return {error:null};},
 }}};
 const tela=criarTelaMfa({app,client,documento:dom.window.document,voltar:()=>eventos.push('voltar'),concluido:cadastro=>eventos.push(cadastro?'ativado':'verificado'),sair:()=>eventos.push('sair')});
 const submit=()=>app.querySelector('form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
 return {dom,app,client,calls,eventos,tela,submit,erro:()=>{erroCodigo=true;}};
}
let t=preparar();t.tela.configurar(false);
t.app.querySelector('button').click();await tick();
assert(t.app.querySelector('img').src.startsWith('data:image/svg+xml;'));
assert.equal(t.app.querySelectorAll('svg').length,0); // QR não é HTML executável
assert(t.app.textContent.includes('CHAVE-FICTICIA'));
t.app.querySelector('[name="codigo"]').value='123';t.submit();await tick();assert.equal(t.calls.length,0);
t.app.querySelector('[name="codigo"]').value='123456';t.submit();await tick();assert.equal(t.calls.length,0); // exige backup
 t.app.querySelector('[name="recuperacao"]').checked=true;t.submit();await tick();
assert.deepEqual(t.eventos,['ativado']);assert.equal(t.calls[0][1].code,'123456');
assert(!t.app.textContent.includes('CHAVE-FICTICIA'));
t=preparar();t.tela.configurar(false);t.app.querySelector('button').click();await tick();
t.app.querySelector('[data-voltar]').click();await tick();assert.equal(t.calls[0][0],'descartar');assert.deepEqual(t.eventos,['voltar']);
t=preparar();await t.tela.desafio();t.erro();t.app.querySelector('input').value='123456';t.submit();await tick();
assert.equal(t.eventos.length,0);assert(t.app.textContent.includes('Não foi possível confirmar'));assert.equal(t.app.querySelector('input').value,'');
t=preparar();await t.tela.desafio();t.app.querySelector('input').value='123456';t.submit();await tick();assert.deepEqual(t.eventos,['verificado']);
t=preparar();t.client.auth.mfa.listFactors=async()=>({data:null,error:{message:'offline'}});await t.tela.desafio();assert(!t.app.querySelector('form'));assert.equal(t.eventos.length,0);
t=preparar();t.tela.configurar(true);assert(!t.app.querySelector('img'));assert(!t.app.textContent.includes('Gerar QR'));
// Logout enquanto QR é gerado: resposta não pode reexibir segredo na tela.
t=preparar();let resolver;t.client.auth.mfa.enroll=()=>new Promise(r=>{resolver=r;});t.tela.configurar(false);t.app.querySelector('button').click();t.tela.limpar();
resolver({data:{id:'fator',totp:{qr_code:'data:image/png;base64,AA',secret:'NAO-DEVE-APARECER'}},error:null});await tick();assert(!t.app.textContent.includes('NAO-DEVE-APARECER'));
console.log('MFA/painel: QR isolado, backup, código, erro, descarte, desafio e logout concorrente OK.');
