// Run after a fixture build: node tests/busca.mjs (requires jsdom).
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import ts from 'typescript';
const source = readFileSync('src/pages/buscar.astro', 'utf8').split('<script>')[1].split('</script>')[0];
const html = readFileSync('dist/buscar/index.html', 'utf8');
function setup(query = '') {
  const dom = new JSDOM(html, { url: `https://example.com/casal-na-estrada/buscar/${query}`, runScripts: 'outside-only' });
  dom.window.eval(ts.transpile(source));
  const document = dom.window.document;
  return { dom, document, visible: () => [...document.querySelectorAll('.resultado')].filter(e => !e.hidden) };
}
const { dom, document, visible } = setup();
const all = visible().length;
assert(all > 0);
const campo = document.querySelector('input');
function search(text) { campo.value = text; campo.dispatchEvent(new dom.window.Event('input')); }
search('GRAVATA'); assert(visible().length > 0 && visible().length < all);
search('zzzz-inexistente'); assert.equal(visible().length, 0); assert.equal(document.querySelector('#vazio').hidden, false);
search(''); assert.equal(visible().length, all);
document.querySelector('button[data-tipo="diario"]').click();
assert(visible().every(e => e.dataset.tipo === 'diario')); assert(visible().length > 0);
document.querySelector('button[data-tipo=""]').click();
const chip = document.querySelector('[data-marcador="serra"]'); chip.click();
assert(visible().every(e => e.dataset.tags.split('|').includes('serra')));
chip.click(); assert.equal(visible().length, all);
const linked = setup('?tag=serra&tipo=diario');
assert(linked.visible().length > 0);
assert(linked.visible().every(e => e.dataset.tipo === 'diario' && e.dataset.tags.includes('serra')));
assert(!document.querySelector('a.resultado[aria-pressed]'));
console.log('Busca: texto, acentos, vazio, tipo, marcador, alternância e links OK.');
