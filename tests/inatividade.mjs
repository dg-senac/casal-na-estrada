import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { criarRelogioInatividade, identificadorSessao } from '../src/lib/inatividade.js';
import { criarAvisoInatividade } from '../src/lib/aviso-inatividade.js';
const MIN=60000;
let agora=10000000;
const dados=new Map();
const armazenamento={getItem:k=>dados.get(k)??null,setItem:(k,v)=>dados.set(k,v)};
function criar(storage=armazenamento) {
 const eventos=[];
 const relogio=criarRelogioInatividade({armazenamento:storage,agora:()=>agora,avisar:ms=>eventos.push(['aviso',ms]),ocultarAviso:()=>eventos.push(['ocultar']),expirar:()=>eventos.push(['expirou'])});
 return {relogio,eventos};
}
let a=criar();assert(a.relogio.iniciar('sessao1'));const inicio=agora;
agora=inicio+28*MIN-1;a.relogio.verificar();assert.equal(a.eventos.length,0);
agora++;a.relogio.verificar();assert(a.relogio.emAviso);
assert.equal(a.relogio.atividade(),false); // aviso requer confirmação explícita
assert(a.relogio.atividade(true));assert.equal(a.relogio.emAviso,false);
let renovado=agora;agora=renovado+29*MIN;a.relogio.verificar();assert(a.relogio.emAviso);
// Revalidação/refresh do token não estende o prazo.
a.relogio.iniciar('sessao1');agora=renovado+30*MIN;a.relogio.verificar();assert(a.relogio.expirada);
assert.equal(a.relogio.atividade(true),false);assert.equal(a.eventos.filter(e=>e[0]==='expirou').length,1);
a.relogio.verificar();assert.equal(a.eventos.filter(e=>e[0]==='expirou').length,1);
// Reload não revive a mesma sessão expirada. Novo login/ID tem prazo novo.
let reload=criar();assert.equal(reload.relogio.iniciar('sessao1'),false);
assert(reload.relogio.iniciar('sessao2'));
// Duas abas compartilham a atividade e a expiração, sem enviar tokens.
agora+=1;const b=criar();a=criar();a.relogio.iniciar('duas-abas');b.relogio.iniciar('duas-abas');
let base=agora;agora=base+27*MIN;assert(b.relogio.atividade());
agora=base+30*MIN;assert(a.relogio.verificar());assert.equal(a.relogio.expirada,false);
agora=base+57*MIN;a.relogio.verificar();b.relogio.verificar();assert(a.relogio.expirada&&b.relogio.expirada);
// Ao voltar de suspensão, primeira interação não pode renovar sessão vencida.
a=criar();a.relogio.iniciar('suspensa');agora+=31*MIN;assert.equal(a.relogio.atividade(),false);assert(a.relogio.expirada);
// Storage indisponível: a proteção continua na memória da aba.
const falha={getItem(){throw Error('bloqueado');},setItem(){throw Error('bloqueado');}};
a=criar(falha);a.relogio.iniciar('restrita');agora+=30*MIN;a.relogio.verificar();assert(a.relogio.expirada);
// Valores inválidos/futuros e relógio que volta muito não prolongam sessão.
a=criar();a.relogio.iniciar('invalida');dados.set(a.relogio.chave,'NaN');a.relogio.verificar();assert(a.relogio.expirada);
a=criar();a.relogio.iniciar('futura');dados.set(a.relogio.chave,String(agora+60000));a.relogio.verificar();assert(a.relogio.expirada);
a=criar(falha);a.relogio.iniciar('relogio');agora-=60000;a.relogio.verificar();assert(a.relogio.expirada);
const payload=Buffer.from(JSON.stringify({session_id:'identificador-estavel'})).toString('base64url');
assert.equal(identificadorSessao({user:{id:'conta'},access_token:`a.${payload}.c`}), 'conta:identificador-estavel');
assert.equal(identificadorSessao({user:{id:'conta'},access_token:'invalido'}),'conta');
assert.equal(identificadorSessao(null),null);
// Diálogo não destrói formulário e mantém o foco entre os dois controles.
const dom=new JSDOM('<body><input id="edicao" value="trabalho não salvo" /></body>',{pretendToBeVisual:true});
const doc=dom.window.document;doc.querySelector('input').focus();let continuou=0,saiu=0;
const aviso=criarAvisoInatividade({documento:doc,continuar:()=>{continuou++;aviso.ocultar();},sair:()=>saiu++});
aviso.mostrar(120000);assert.equal(doc.querySelectorAll('[role="alertdialog"]').length,1);
aviso.mostrar(59000);assert.equal(doc.querySelectorAll('[role="alertdialog"]').length,1);assert(doc.querySelector('[data-restante]').textContent.includes('0min 59s'));
const primeiro=doc.querySelector('[data-continuar]');assert.equal(doc.activeElement,primeiro);
primeiro.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));assert.equal(doc.activeElement,doc.querySelector('[data-sair]'));
primeiro.click();assert.equal(continuou,1);assert.equal(doc.querySelector('input').value,'trabalho não salvo');assert.equal(doc.activeElement,doc.querySelector('input'));
aviso.mostrar(10000);doc.querySelector('[data-sair]').click();assert.equal(saiu,1);aviso.ocultar();
console.log('Inatividade: aviso, continuação, expiração, reload, duas abas, suspensão, fallback, relógio e foco OK.');
