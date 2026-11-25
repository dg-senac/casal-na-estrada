import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const modulos=['pacote-editorial','zip-fotos','ensaio-local'].map(n=>readFileSync('experiments/emergencia/'+n+'.mjs','utf8').replace(/^import .*;\n/gm,'').replaceAll('export ',''));
const script=modulos.join('\n')+`
const urls=[];let geracao=0;
function limparEnsaio(){geracao++;for(const u of urls)URL.revokeObjectURL(u);urls.length=0;document.getElementById('acervo').replaceChildren();document.getElementById('imagens').textContent='';document.getElementById('resultado').textContent='Acervo removido da página.';}
window.addEventListener('pagehide',limparEnsaio);
document.getElementById('limpar').onclick=limparEnsaio;
function elemento(tag,texto){const e=document.createElement(tag);e.textContent=texto;return e;}
document.getElementById('abrir').onclick=async()=>{
 limparEnsaio();const versao=geracao,saida=document.getElementById('resultado'),destino=document.getElementById('acervo');
 const json=document.getElementById('json').files[0],zip=document.getElementById('zip').files[0];
 if(!json||!zip){saida.textContent='Selecione JSON e ZIP.';return;}
 const botao=document.getElementById('abrir');botao.disabled=true;saida.textContent='Validando e reconstruindo em memória…';
 try{
  if(json.size>2*1024*1024)throw Error('JSON acima do limite');
  const acervo=await reconstruirAcervo(await json.text(),zip);if(versao!==geracao)return;
  destino.append(elemento('h2','Cadastros recuperados como texto'));
  for(const {tabela,registro} of acervo.registros){const d=document.createElement('details');d.append(elemento('summary',tabela+' — '+(registro.titulo||registro.nome||registro.slug||registro.id)),elemento('pre',JSON.stringify(registro,null,2)));destino.append(d);}
  destino.append(elemento('h2','Arquivos do ZIP — prévias locais'));
  let imagens=0,decodificadas=0,falhas=0;
  for(const a of acervo.arquivos){
   const d=document.createElement('figure');d.append(elemento('figcaption',a.nome+' ('+a.tamanho+' bytes)'));
   const tipo=tipoImagemSeguro(a.bytes);
   if(tipo){imagens++;const img=document.createElement('img'),url=URL.createObjectURL(new Blob([a.bytes],{type:tipo}));urls.push(url);img.alt=a.nome;img.loading='lazy';img.src=url;
    img.onload=()=>{if(versao===geracao){decodificadas++;document.getElementById('imagens').textContent='Imagens decodificadas pelo navegador: '+decodificadas+'; falhas: '+falhas+'. Role a página para carregar as prévias.';}};
    img.onerror=()=>{if(versao===geracao){falhas++;document.getElementById('imagens').textContent='Imagens decodificadas pelo navegador: '+decodificadas+'; falhas: '+falhas+'.';}};d.append(img);
   }else d.append(elemento('p','Prévia não permitida para este formato. Bytes preservados no ZIP.'));
   destino.append(d);
  }
  saida.textContent='Acervo reconstruído em memória: '+acervo.registros.length+' registros e '+acervo.arquivos.length+' arquivos íntegros; '+imagens+' candidatos a prévia. Não restaura banco, login ou site. Confira os textos e role para visualizar fotos.';
 }catch(e){if(versao===geracao){destino.replaceChildren();saida.textContent='Ensaio não concluído: '+e.message;}}
 finally{botao.disabled=false;}
};`;
const html=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; img-src blob:; form-action 'none'; base-uri 'none'; object-src 'none'"><title>Ensaio local do acervo</title><style>body{font:17px system-ui;max-width:900px;margin:30px auto;padding:0 20px;line-height:1.5}label{display:block;margin:20px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere}figure{margin:24px 0;border:1px solid #ccc;padding:12px}img{max-width:100%;max-height:550px;object-fit:contain}figcaption{overflow-wrap:anywhere}button{padding:12px;margin:5px}</style><h1>Ensaio local do acervo</h1><p>Selecione seus backups. Nada é enviado e nada é alterado no site. Cadastros aparecem como texto; imagens são abertas somente a partir dos bytes do ZIP, sem endereços externos.</p><p><strong>Não é restauração completa:</strong> não recria banco, login, regras de acesso ou layout do site. Conteúdo privado pode aparecer nesta tela; use em computador confiável.</p><label>Cadastros JSON <input id="json" type="file" accept=".json"></label><label>Fotos ZIP <input id="zip" type="file" accept=".zip"></label><button id="abrir">Reconstruir acervo localmente</button><button id="limpar">Limpar acervo da página</button><p id="resultado" aria-live="polite">Aguardando arquivos.</p><p id="imagens"></p><section id="acervo"></section><script>${script.replaceAll('</script','<\\/script')}</script></html>`;
mkdirSync('entregas',{recursive:true});writeFileSync('entregas/ensaio-recuperacao-local.html',html);console.log('Ensaio local gerado, sem dados reais.');
