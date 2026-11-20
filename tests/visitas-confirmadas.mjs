import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
const visitas=JSON.parse(readFileSync('src/data/visitas-confirmadas.json','utf8'));
const municipios=JSON.parse(readFileSync('src/data/municipios.json','utf8'));
assert.equal(visitas.length,29);
const exp={};new Function('exports',ts.transpile(readFileSync('src/lib/estrada.ts','utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}))(exp);
const grupos=exp.lugares([],[],[],visitas);
assert.equal(grupos.flatMap(g=>g.lugares).length,29);
assert.equal(grupos.reduce((n,g)=>n+g.publicacoes+g.pecas,0),0);
for(const v of visitas) assert.equal(municipios.filter(([nome,uf])=>nome===v.nome&&uf===v.uf).length,1,`${v.nome}/${v.uf} deve ser município inequívoco`);
// Preserva publicação e troféu existentes; ignora repetição e diferenças de acento/caixa.
const mesclados=exp.lugares([{data:{local:'GRAVATA',uf:'PE'}}],[{data:{cidade:'Pesqueira — PE'}}],[],[...visitas,...visitas]);
const lugares=mesclados.flatMap(g=>g.lugares);
assert.equal(lugares.length,29);
assert.equal(lugares.filter(l=>l.publicacoes===1).length,1);
assert.equal(lugares.filter(l=>l.pecas===1).length,1);
assert.equal(lugares.filter(l=>l.visita).length,27);
const doc=new JSDOM(readFileSync('dist/lugares/index.html','utf8')).window.document;
const pontos=JSON.parse(doc.querySelector('#mapa-viagens').dataset.pontos);
for(const v of visitas) {
 const correspondentes=pontos.filter(p=>p.nome===v.nome&&p.uf===v.uf);
 assert.equal(correspondentes.length,1,`${v.nome} não deve faltar nem duplicar`);
 assert.ok(correspondentes[0].coords.every(Number.isFinite));
 assert.ok(doc.querySelector(`#uf-${v.uf}`).textContent.includes(v.nome));
}
const jaboatao=pontos.find(p=>p.nome==='Jaboatão dos Guararapes'&&p.uf==='PE');
const card=doc.getElementById(jaboatao.id);
// Com fixture, não há publicação da cidade: confirma sem inventar link de relato.
if(card.querySelector('[data-visita-confirmada]')) assert.match(card.textContent,/sem registro da visita/);
console.log('Visitas: 29 municípios localizados, repetidos ignorados, contagens preservadas e mapa/lista completos.');
