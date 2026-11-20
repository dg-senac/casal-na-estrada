import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import ts from 'typescript';
const carregar = arquivo => {
 const exp = {};
 new Function('exports',ts.transpile(readFileSync(arquivo,'utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}))(exp);
 return exp;
};
const {lugares}=carregar('src/lib/estrada.ts');
const {marcosEstrada}=carregar('src/data/marcos-estrada.ts');
const grupos=lugares([],[],marcosEstrada);
assert.equal(grupos.length,1);assert.equal(grupos[0].uf,'BA');
assert.equal(grupos[0].publicacoes,0);assert.equal(grupos[0].pecas,0);
assert.equal(grupos[0].lugares[0].nome,'Salvador');
const comPost=lugares([{data:{local:'Salvador',uf:'BA'}}],[],marcosEstrada);
assert.equal(comPost[0].lugares.length,1);assert.equal(comPost[0].publicacoes,1);
assert.equal(comPost[0].lugares[0].marcos.length,1);
const doc=new JSDOM(readFileSync('dist/lugares/index.html','utf8')).window.document;
const pontos=JSON.parse(doc.querySelector('#mapa-viagens').dataset.pontos);
const salvador=pontos.filter(p=>p.nome==='Salvador'&&p.uf==='BA');assert.equal(salvador.length,1);
assert.ok(salvador[0].coords.every(Number.isFinite));
const cartao=doc.getElementById(salvador[0].id);
assert.match(cartao.textContent,/2023/);
assert.ok(cartao.querySelector('a[href$="/sobre#primeira-viagem"]'));
assert.match(doc.querySelector('.primeira-estrada').textContent,/Yamaha Lander 250/);
assert.match(doc.querySelector('#uf-BA').textContent,/Salvador/);
const sobre=new JSDOM(readFileSync('dist/sobre/index.html','utf8')).window.document;
assert.ok(sobre.getElementById('primeira-viagem'));
console.log('Primeira viagem: Salvador no mapa/lista, homenagem, link de origem e contagens sem posts fictícios OK.');

// Regressão do contraste: bloco claro não pode herdar tinta clara do tema.
const fonte = readFileSync('src/pages/lugares.astro','utf8');
const regras = fonte.match(/\.primeira-estrada \{([^}]+)\}/)[1];
assert.match(regras, /color: var\(--ink\)/);
assert.ok(!regras.includes('--paper2'));
const fundo = regras.match(/background: (#[a-f0-9]{6})/i)[1];
const luminancia = hex => {
 const rgb = hex.slice(1).match(/../g).map(n => parseInt(n,16)/255).map(n => n <= .04045 ? n/12.92 : ((n+.055)/1.055)**2.4);
 return rgb[0]*.2126 + rgb[1]*.7152 + rgb[2]*.0722;
};
for (const token of ['ink','ink-2','ink-soft','ink-mute','rust-text']) {
 const tinta = regras.match(new RegExp(`--${token}: (#[a-f0-9]{6})`, 'i'))[1];
 const a=luminancia(fundo), b=luminancia(tinta);
 const contraste=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 assert.ok(contraste >= 4.5, `${token}: contraste ${contraste.toFixed(2)} abaixo de 4.5:1`);
}
console.log('Contraste da homenagem: texto, selo, subtítulo e link/hover >= 4.5:1.');
