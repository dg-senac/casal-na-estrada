import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {instalarEmergenciaAdmin} from '../src/lib/emergencia-admin.js';
const origem='https://casal-na-estrada-site-teste.douglasmarista02.workers.dev';
async function teste({habilitado=true,host=origem,status=200,falhar=false}={}){
 const dom=new JSDOM('<div class="pn-topo__direita"></div>',{url:host});const d=dom.window.document;let chamadas=0;
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};dom.window.HTMLDialogElement.prototype.close=function(){this.remove();};
 const opts={documento:d,origem:host,habilitado,obterSessao:async()=>({access_token:'fixture'}),uuid:()=> '00000000-0000-4000-8000-000000000001',fetchImpl:async(u,o)=>{chamadas++;assert.equal(u,'/api/emergencia-real');assert.equal(o.credentials,'omit');assert.equal(o.redirect,'error');assert.equal(o.headers.Authorization,'Bearer fixture');if(falhar)throw Error('rede');return new Response('<b>resposta fictícia</b>',{status});}};
 try{
 instalarEmergenciaAdmin(opts);instalarEmergenciaAdmin(opts);
 if(!habilitado||host!==origem){assert.equal(d.querySelectorAll('button').length,0);return;}
 assert.equal(d.querySelectorAll('#pn-emergencia').length,1);d.getElementById('pn-emergencia').click();assert.equal(chamadas,0);
 const dialogo=d.querySelector('dialog');assert.match(dialogo.textContent,/fotos NÃO/);assert.match(dialogo.textContent,/GitHub Pages/);
 await dialogo.querySelector('button').onclick();assert.equal(chamadas,1);await dialogo.querySelector('button').onclick();assert.equal(chamadas,1);
 assert.equal(dialogo.querySelectorAll('b').length,0);assert.equal(d.querySelector('a').getAttribute('href'),'/login-teste');
 assert.match(dialogo.querySelector('[role=status]').textContent,falhar?/sem confirmação/:/controle protegido/);
 }finally{dom.window.close();}
}
await teste();await teste({status:503});await teste({falhar:true});await teste({habilitado:false});await teste({host:'https://dg-senac.github.io'});
console.log('Admin emergência: restrito ao paralelo, confirmação, sessão sem persistência extra, resposta como texto, sem repetição após incerteza e acesso ao controle protegidos. Fixtures apenas.');
