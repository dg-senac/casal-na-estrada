import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {criarPacote,TABELAS} from '../experiments/emergencia/pacote-editorial.mjs';
import {montarZipFotos} from '../experiments/emergencia/zip-fotos.mjs';
import {reconstruirAcervo,tipoImagemSeguro} from '../experiments/emergencia/ensaio-local.mjs';
const bytes=new Uint8Array([255,216,255,0]);const hash=Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');
const nome='repositorio/media/ficticia.jpg';const manifesto={versao:1,tipo:'arquivos-midia-sem-cadastros',totalBytes:4,arquivos:[{nome,bucket:'repositorio',caminho:'media/ficticia.jpg',tamanho:4,sha256:hash}]};
const zip=montarZipFotos([{nome,bytes},{nome:'manifesto.json',bytes:new TextEncoder().encode(JSON.stringify(manifesto))}]);
const dados=Object.fromEntries(TABELAS.map(t=>[t,[]]));dados.posts=[{id:'ficticio',titulo:'<img src="https://invasor.invalid/x" onerror="alert(1)">',corpo:'<script>alert(1)</script>'}];
const json=await criarPacote(dados);const acervo=await reconstruirAcervo(json,zip);
assert.deepEqual(acervo.registros[0].registro,dados.posts[0]);assert.deepEqual(acervo.arquivos[0].bytes,bytes);
assert.equal(tipoImagemSeguro(bytes),'image/jpeg');assert.equal(tipoImagemSeguro(new TextEncoder().encode('<svg onload="alert(1)">')),null);
await assert.rejects(reconstruirAcervo(json,new Blob(['ruim'])));
const html=readFileSync('entregas/ensaio-recuperacao-local.html','utf8');assert.match(html,/connect-src 'none'/);assert.match(html,/img-src blob:/);
const dom=new JSDOM(html,{runScripts:'outside-only',url:'file:///ensaio.html'}),w=dom.window;let revogadas=0;
try{
 Object.defineProperty(w,'crypto',{value:crypto});Object.assign(w,{Blob,Uint8Array,TextEncoder,TextDecoder,structuredClone});w.fetch=()=>{throw Error('Rede proibida');};w.URL.createObjectURL=()=> 'blob:ficticio';w.URL.revokeObjectURL=()=>{revogadas++;};
 w.eval(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
 Object.defineProperty(w.document.getElementById('json'),'files',{value:[new Blob([json])]});Object.defineProperty(w.document.getElementById('zip'),'files',{value:[zip]});
 await w.document.getElementById('abrir').onclick();
 assert.match(w.document.getElementById('resultado').textContent,/1 registros e 1 arquivos/);
 assert.equal(w.document.querySelectorAll('#acervo script').length,0);assert.equal(w.document.querySelectorAll('#acervo img').length,1);
 assert.equal(w.document.querySelector('#acervo img').getAttribute('src'),'blob:ficticio');
 assert.match(w.document.querySelector('summary').textContent,/<img/);
 w.document.querySelector('#acervo img').onload();assert.match(w.document.getElementById('imagens').textContent,/: 1; falhas: 0/);
 w.document.getElementById('limpar').click();assert.equal(w.document.getElementById('acervo').children.length,0);assert.equal(revogadas,1);
}finally{w.close();}
console.log('Ensaio local: dados/bytes íntegros reconstruídos em memória; HTML malicioso tratado como texto; fotos somente blob; limpeza revoga URLs. Teste não comprova decodificação de imagens reais ou restauração de produção.');
