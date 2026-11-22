import {readFileSync,writeFileSync} from 'node:fs';
import './gerar-worker-controle.mjs';
const pasta=new URL('./',import.meta.url);
let base=readFileSync(new URL('worker-controle-teste.mjs',pasta),'utf8');
base=base.replace('<button id="baixar" type="button">',`<h2>Arquivos das fotos — ZIP privado no computador</h2>
<p>Inclui public/media e arquivos visíveis dos buckets midia/midia-rascunhos. Pode incluir rascunhos. Não inclui URLs externas, cadastros ou tudo que existe na conta. Limites: 60 MiB no total e 10 MiB por arquivo. Não é backup automático no D1.</p>
<button id="baixar-fotos" type="button">Baixar arquivos de mídia (ZIP)</button>
<p><label>Conferência local, sem enviar arquivo: <input id="zip-local-fotos" type="file" accept=".zip,application/zip"></label></p>
<button id="verificar-fotos" type="button">Conferir ZIP local neste navegador</button>
<button id="baixar" type="button">`);
const script=readFileSync(new URL('zip-fotos.mjs',pasta),'utf8').replaceAll('export ','')+'\n'+readFileSync(new URL('fotos-client.mjs',pasta),'utf8');
const escapado=script.replaceAll('\\','\\\\').replaceAll('`','\\`').replaceAll('${','\\${');
const pos=base.indexOf("document.getElementById('limpar').addEventListener");if(pos<0)throw Error('Marcador ausente');
base=base.slice(0,pos)+escapado+'\n'+base.slice(pos);
writeFileSync(new URL('worker-fotos-teste.mjs',pasta),base);
console.log('Painel de mídia gerado. Não publicado.');
