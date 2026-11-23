import {readFileSync,writeFileSync} from 'node:fs';
import './gerar-worker-controle.mjs';
const pasta=new URL('./',import.meta.url);
let base=readFileSync(new URL('worker-controle-teste.mjs',pasta),'utf8');
base=base.replace('<button id="baixar" type="button">',`<h2>Teste do canal de conteúdo para build</h2>
<p>Confere somente conteúdo publicado. Não altera conteúdo, backup ou manutenção.</p>
<button id="consultar-agendamento" type="button">Consultar agendamento automático</button>
<button id="testar-conteudo-build" type="button">Testar canal de conteúdo do build</button>
<h2>Teste isolado do canal de imagens</h2>
<p>Não cria backup, não ativa manutenção e não troca as imagens do site.</p>
<button id="testar-origem-assinada" type="button">Testar canal assinado de imagens</button>
<h2>Fotos do Supabase guardadas no D1</h2>
<p>Use o ID da cópia editorial no campo abaixo. Retoma as fotos sem criar outro backup de cadastros. Até 3 conjuntos, 100 arquivos, 1 MiB por arquivo e 8 MiB por conjunto. Não inclui public/media. A aba precisa ficar aberta; se interromper, retome com o mesmo ID.</p>
<button id="retomar-fotos-d1" type="button">Copiar ou retomar fotos do Supabase no D1</button>
<button id="baixar-fotos-d1" type="button">Baixar fotos guardadas no D1 (ZIP)</button>
<h2>Arquivos das fotos — ZIP privado no computador</h2>
<p>Inclui public/media e arquivos visíveis dos buckets midia/midia-rascunhos. Pode incluir rascunhos. Não inclui URLs externas, cadastros ou tudo que existe na conta. Limites: 60 MiB no total e 10 MiB por arquivo. Não é backup automático no D1.</p>
<button id="baixar-fotos" type="button">Baixar arquivos de mídia (ZIP)</button>
<p><label>Conferência local, sem enviar arquivo: <input id="zip-local-fotos" type="file" accept=".zip,application/zip"></label></p>
<button id="verificar-fotos" type="button">Conferir ZIP local neste navegador</button>
<button id="baixar" type="button">`);
const automatico=readFileSync(new URL('../../src/lib/fotos-automaticas.js',pasta),'utf8').replaceAll('export ','');
const script=automatico+'\n'+readFileSync(new URL('zip-fotos.mjs',pasta),'utf8').replaceAll('export ','')+'\n'+readFileSync(new URL('fotos-client.mjs',pasta),'utf8')+'\n'+readFileSync(new URL('fotos-guardadas-client.mjs',pasta),'utf8')+'\n'+readFileSync(new URL('origem-assinada-client.mjs',pasta),'utf8')+'\n'+readFileSync(new URL('conteudo-build-client.mjs',pasta),'utf8')+'\n'+readFileSync(new URL('status-agendamento-client.mjs',pasta),'utf8');
const escapado=script.replaceAll('\\','\\\\').replaceAll('`','\\`').replaceAll('${','\\${');
const pos=base.indexOf("document.getElementById('limpar').addEventListener");if(pos<0)throw Error('Marcador ausente');
base=base.slice(0,pos)+escapado+'\n'+base.slice(pos);
// Apresentação isolada: preserva todos os IDs e handlers do controle.
const fonte=readFileSync(new URL('../../node_modules/@fontsource/bodoni-moda/files/bodoni-moda-latin-400-normal.woff2',pasta)).toString('base64');
const visual=readFileSync(new URL('controle-visual.html',pasta),'utf8').replace('__FONT__',fonte);
const inicioVisual=base.indexOf('<title>Login isolado de teste</title>');
const fimVisual=base.indexOf('<script nonce="${nonce}">',inicioVisual);
if(inicioVisual<0||fimVisual<0)throw Error('Estrutura do controle não encontrada');
base=base.slice(0,inicioVisual)+visual+base.slice(fimVisual);
base=base.replace("script-src 'nonce-${nonce}'; connect-src", "script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; font-src data:; connect-src");
base=base.replace('Reabrir SOMENTE o ambiente de teste?', 'Reabrir o site para os visitantes? Confirme que é seguro encerrar a manutenção.');
writeFileSync(new URL('worker-fotos-teste.mjs',pasta),base);
console.log('Painel de mídia gerado. Não publicado.');
