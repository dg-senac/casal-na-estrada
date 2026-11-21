import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
import { categoriaEncontro } from '../src/lib/categorias-encontros.js';
for (const estado of ['futuro', 'andamento', 'passado']) {
  for (const confirmado of [true, false]) {
    assert.equal(categoriaEncontro(estado, true, confirmado), 'cancelado');
    assert.equal(categoriaEncontro(estado, false, confirmado), estado === 'passado' ? 'passado' : confirmado ? estado : 'confirmar');
  }
}
const fonte = readFileSync(new URL('../src/pages/encontros.astro', import.meta.url), 'utf8');
const script = fonte.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^\s*import .*;$/gm, '');
const ids = ['andamento', 'futuro', 'confirmar', 'passado', 'cancelado'];
const agora = Date.now();
const dom = new JSDOM(`<div data-filtro-estado hidden><select id="agenda-uf"><option value="">Todos</option><option>PE</option><option>PB</option></select></div><nav data-categorias hidden>${ids.map(id => `<button data-filtro="${id}"><span data-total="${id}"></span></button>`).join('')}</nav><p data-categoria-vazia hidden></p>${ids.map(id => `<section data-grupo="${id}"><div class="lista"></div></section>`).join('')}`, { runScripts: 'outside-only' });
const { window: w } = dom;
const d = w.document;
function card(inicio, fim, confirmado, cancelado) {
  const el = d.createElement('article');
  Object.assign(el.dataset, {evento: '', inicio: String(inicio), fim: String(fim), confirmado: String(confirmado), cancelado: String(cancelado)});
  el.innerHTML = '<span data-estado></span><p data-relogio><strong data-restante></strong></p><a class="evento__acao" data-comboio>Vou também</a>';
  d.querySelector('.lista').append(el);
  return el;
}
const ativo = card(agora-1000, agora+100000, true, false);
const pendente = card(agora-1000, agora+100000, false, false);
const cancelado = card(agora-1000, agora+100000, true, true);
const encerrado = card(agora-2000, agora-1000, false, false);
const futuro = card(agora+100000, agora+200000, true, false);
ativo.dataset.uf='PE';futuro.dataset.uf='PB';cancelado.dataset.uf='PE';cancelado.id='encontro-cancelado';
w.categoriaEncontro = categoriaEncontro;
w.estadoEncontro = (inicio, fim, agora) => agora < inicio ? 'futuro' : agora < fim ? 'andamento' : 'passado';
w.tempoRestante = () => ({dias:'0',horas:'00',minutos:'00',segundos:'00'});
let tique;
w.setInterval = fn => { tique=fn; return 1; };
w.eval(ts.transpileModule(script, {compilerOptions:{target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.None}}).outputText);
for (const [el,id] of [[ativo,'andamento'],[pendente,'confirmar'],[cancelado,'cancelado'],[encerrado,'passado'],[futuro,'futuro']]) assert.equal(el.closest('[data-grupo]').dataset.grupo,id);
assert.equal(d.querySelector('[data-grupo="andamento"]').hidden,false);
assert.equal(d.querySelector('[data-grupo="cancelado"]').hidden,true);
d.querySelector('[data-filtro="cancelado"]').click();
assert.equal(d.querySelector('[data-grupo="cancelado"]').hidden,false);
assert.equal(d.querySelector('[data-filtro="cancelado"]').getAttribute('aria-pressed'),'true');
assert.equal(pendente.querySelector('[data-relogio]').hidden,true);
ativo.dataset.fim=String(agora-1);
tique();
assert.equal(ativo.closest('[data-grupo]').dataset.grupo,'passado');
assert.equal(d.querySelector('[data-grupo="cancelado"]').hidden,false);
d.querySelector('[data-filtro="andamento"]').click();
assert.equal(d.querySelector('[data-categoria-vazia]').hidden,false);
const uf=d.querySelector('#agenda-uf');
d.querySelector('[data-filtro="futuro"]').click();
uf.value='PB';uf.dispatchEvent(new w.Event('change'));
assert.equal(futuro.hidden,false);assert.equal(ativo.hidden,true);
assert.equal(d.querySelector('[data-total="futuro"]').textContent,'1');
uf.value='PE';uf.dispatchEvent(new w.Event('change'));
assert.equal(futuro.hidden,true);assert.equal(d.querySelector('[data-categoria-vazia]').hidden,false);
w.location.hash='#encontro-cancelado';w.dispatchEvent(new w.Event('hashchange'));
assert.equal(uf.value,'');assert.equal(d.querySelector('[data-grupo="cancelado"]').hidden,false);
w.close();
console.log('Categorias: classificação, filtros, contadores, estado vazio e encerramento automático aprovados.');
