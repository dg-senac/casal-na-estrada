import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const modulos=['pacote-editorial','zip-fotos','conferencia-conjunta'].map(n=>readFileSync('experiments/emergencia/'+n+'.mjs','utf8').replace(/^import .*;\n/gm,'').replaceAll('export ',''));
const script=modulos.join('\n')+`
document.getElementById('conferir').addEventListener('click',async()=>{
 const botao=document.getElementById('conferir'),saida=document.getElementById('resultado');
 const json=document.getElementById('cadastros').files[0],zip=document.getElementById('fotos').files[0];
 if(!json||!zip){saida.textContent='Selecione o pacote JSON dos cadastros e o ZIP das fotos.';return;}
 botao.disabled=true;saida.textContent='Conferindo localmente. Aguarde…';
 try{
  if(json.size>2*1024*1024)throw Error('JSON acima do limite.');
  const r=await conferirConjunto(await json.text(),zip);
  saida.textContent=JSON.stringify(r,null,2);
 }catch(e){saida.textContent='Conferência não concluída: '+e.message;}
 finally{botao.disabled=false;}
});`;
const html=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'"><title>Conferência local dos backups</title><style>body{font:17px system-ui;max-width:850px;margin:32px auto;padding:0 20px;line-height:1.5}label{display:block;margin:24px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f3f3f3;padding:16px}button{padding:12px}</style><h1>Conferência local dos backups</h1><p>Abra este arquivo no seu computador. Escolha o JSON dos cadastros e o ZIP das fotos. Nada será enviado: esta página não faz conexões de rede.</p><p><strong>Não restaura nem altera o site.</strong> Confere integridade e referências de mídia conhecidas. Não verifica imagens embutidas em HTML/Markdown, senhas, esquema ou regras de acesso. Datas diferentes podem gerar pendências.</p><label>Pacote editorial dos cadastros (JSON) <input id="cadastros" type="file" accept=".json,application/json"></label><label>Arquivos de mídia (ZIP) <input id="fotos" type="file" accept=".zip,application/zip"></label><button id="conferir">Conferir os dois backups localmente</button><p>O resultado pode conter nomes de arquivos privados. Não publique nem envie o relatório completo.</p><pre id="resultado" aria-live="polite">Aguardando arquivos.</pre><script>${script.replaceAll('</script','<\\/script')}</script></html>`;
mkdirSync('entregas',{recursive:true});writeFileSync('entregas/conferir-backups-offline.html',html);
console.log('Conferidor offline gerado; não contém dados reais.');
