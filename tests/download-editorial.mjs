import assert from 'node:assert/strict';
import {downloadEditorial} from '../experiments/emergencia/download-editorial.mjs';
import {TABELAS,abrirPacote} from '../experiments/emergencia/pacote-editorial.mjs';
const url='https://teste.invalid/api/exportar-editorial';
const token=aal=>'header.'+Buffer.from(JSON.stringify({sub:'ficticio',aal})).toString('base64url')+'.assinatura';
const config={habilitado:true,supabaseUrl:'https://pjglrlullnchqazxpvyn.supabase.co',chavePublica:'sb_publishable_ficticia'};
const req=(aal='aal2',origin='https://teste.invalid')=>new Request(url,{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token(aal)}});
const dados=Object.fromEntries(TABELAS.map(t=>[t,[]]));dados.posts=[{id:'ficticio',publicado:false,corpo:'Ação 🏍️'}];
const captura={versaoCaptura:1,capturadoEm:'2026-11-09T12:00:00.000Z',contagens:Object.fromEntries(TABELAS.map(t=>[t,dados[t].length])),dados};
function mock(retorno=()=>Response.json(captura),acesso={autorizado:true,mfa_necessario:false}){
 const chamadas=[];
 const fetcher=async(u,o)=>{chamadas.push(u);assert.equal(o.redirect,'manual');assert(o.signal);
 if(u.endsWith('/user'))return Response.json({id:'ficticio'});
 if(u.endsWith('/estado_acesso_painel'))return Response.json(acesso);
 assert.equal(u,config.supabaseUrl+'/rest/v1/rpc/capturar_editorial_emergencia');assert.equal(o.body,'{}');return retorno();};
 return {fetcher,chamadas};
}
let m=mock();let r=await downloadEditorial(req(),config,m.fetcher);assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'no-store');assert.match(r.headers.get('Content-Disposition'),/^attachment/);assert.equal(r.headers.get('Access-Control-Allow-Origin'),null);
assert.deepEqual((await abrirPacote(await r.text())).dados,dados);assert.equal(m.chamadas.length,3);
for(const request of [new Request(url),req('aal2','https://outro.invalid'),new Request(url,{method:'POST',headers:{Origin:'https://teste.invalid'}})]){
 m=mock();assert.notEqual((await downloadEditorial(request,config,m.fetcher)).status,200);assert.equal(m.chamadas.length,0);
}
m=mock();assert.equal((await downloadEditorial(req(),{...config,habilitado:false},m.fetcher)).status,503);assert.equal(m.chamadas.length,0);
for(const aal of ['aal1']){m=mock();assert.equal((await downloadEditorial(req(aal),config,m.fetcher)).status,403);assert.equal(m.chamadas.length,2);}
m=mock(undefined,{autorizado:false,mfa_necessario:false});assert.equal((await downloadEditorial(req(),config,m.fetcher)).status,403);assert.equal(m.chamadas.length,2);
for(const retorno of [
 ()=>new Response('',{status:302,headers:{Location:'https://outro.invalid'}}),
 ()=>new Response('erro privado do banco',{status:500}),
 ()=>new Response('{"incompleto":',{headers:{'Content-Type':'application/json'}}),
 ()=>Response.json({...captura,contagens:{...captura.contagens,posts:99}}),
 ()=>Response.json({...captura,dados:{...dados,auth_users:[]}}),
 ()=>Response.json({...captura,capturadoEm:'inválido'}),
 ()=>new Response('x'.repeat(1572865),{headers:{'Content-Type':'application/json'}}),
 ()=>{throw Error('falha privada');},
]){
 m=mock(retorno);r=await downloadEditorial(req(),config,m.fetcher);assert.equal(r.status,503);assert.equal(r.headers.get('Content-Disposition'),null);assert.doesNotMatch(await r.text(),/erro privado|falha privada|Ação/);
}
console.log('Download local: autenticação/MFA, origem/método, desativado por padrão, captura fixa, limites, envelope/contagens, falhas sem anexo, pacote válido e headers privados aprovados. Somente mocks.');
