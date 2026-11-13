import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
const compile = s => ts.transpile(s, { module: ts.ModuleKind.CommonJS });
const estrada = { exports: {} };
new Function('exports', compile(readFileSync('src/lib/estrada.ts','utf8')))(estrada.exports);
const geo = { exports: {} };
new Function('exports','require',compile(readFileSync('src/lib/mapa.ts','utf8')))(geo.exports, id => id.includes('municipios') ? {default:JSON.parse(readFileSync('src/data/municipios.json','utf8'))} : estrada.exports);
assert.deepEqual(geo.exports.coordenadas('Gravatá', 'PE'), geo.exports.coordenadas('gravata — PE'));
assert(geo.exports.coordenadas('Gravatá', 'PE'));
assert.equal(geo.exports.coordenadas('Pernambuco', 'PE'), null);
assert.equal(geo.exports.coordenadas('Cidade inexistente', 'PE'), null);
assert.equal(geo.exports.coordenadas('Bom Jesus'), null); // homônimos: não adivinhar
assert(geo.exports.coordenadas('Bom Jesus', 'PI'));
const html = readFileSync('dist/lugares/index.html','utf8');
const dom = new JSDOM(html, {runScripts:'outside-only'});
const doc = dom.window.document;
const pontos = JSON.parse(doc.querySelector('#mapa-viagens').dataset.pontos);
assert(pontos.length > 0);
for (const p of pontos) {
 assert(p.coords.every(Number.isFinite));
 const card = doc.getElementById(p.id);
 assert(card && card.querySelector('a'));
 for (const a of card.querySelectorAll('a')) assert(!a.href.includes('undefined'));
}
const script = readFileSync('src/components/MapaViagens.astro','utf8').split('<script>')[1].split('</script>')[0].replace(/^\s*import .*;$/gm,'');
// Simula mapa indisponível: seleção e acesso aos conteúdos devem continuar funcionando.
dom.window.L = {map: () => { throw Error('offline'); }};
dom.window.eval(ts.transpile(script));
const select = doc.querySelector('select');
select.value = pontos[0].id;
select.dispatchEvent(new dom.window.Event('change'));
assert.equal([...doc.querySelectorAll('.destino')].filter(c => !c.hidden).length,1);
select.value = ''; select.dispatchEvent(new dom.window.Event('change'));
assert.equal([...doc.querySelectorAll('.destino')].filter(c => !c.hidden).length,pontos.length);
console.log('Mapa: coordenadas, homônimos, estado sem pin, links e seleção offline OK.');
