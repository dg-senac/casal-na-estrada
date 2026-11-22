import {readFileSync,writeFileSync} from 'node:fs';
const pasta=new URL('./',import.meta.url);
const ler=n=>readFileSync(new URL(n,pasta),'utf8');
const pacote=ler('pacote-editorial.mjs').replaceAll('export ','');
let download=ler('download-editorial.mjs').replace(/^import .*;\n/gm,'').replaceAll('export ','').replace(/\bresposta\b/g,'respostaDownload').replace(/\bexatas\b/g,'exatasDownload');
let worker=ler('worker-emergencia-teste.mjs');
worker=worker.replace("    const url = new URL(request.url);",`    const url = new URL(request.url);
    if (url.pathname === '/api/exportar-editorial') {
      return downloadEditorial(request, {habilitado:true, supabaseUrl:env.SUPABASE_URL, chavePublica:env.SUPABASE_ANON_KEY});
    }`);
worker=worker.replace('<button id="reabrir" type="button">Reabrir ambiente de teste</button>',`<button id="reabrir" type="button">Reabrir ambiente de teste</button>
<h2>Download manual de cadastros REAIS</h2>
<p>Inclui rascunhos do Supabase. Não inclui fotos, senhas ou tokens. Guarde em local privado. Não salva conteúdo real no D1 e não altera o GitHub Pages.</p>
<button id="baixar" type="button">Baixar pacote editorial real (JSON)</button>`);
const marcador="document.getElementById('limpar').addEventListener";
const pos=worker.indexOf(marcador);
if(pos<0)throw Error('Marcador não encontrado');
worker=worker.slice(0,pos)+`document.getElementById('baixar').addEventListener('click',async()=>{
 if(ocupadoAcao||!token)return;
 if(!confirm('Baixar os cadastros REAIS, incluindo rascunhos, para este computador? Não inclui os arquivos das fotos.'))return;
 ocupadoAcao=true;
 const botoes=['baixar','emergencia','reabrir','limpar'];
 botoes.forEach(id=>document.getElementById(id).disabled=true);
 status.textContent='Gerando pacote editorial real. Aguarde…';
 try{
   const r=await fetch('/api/exportar-editorial',{method:'POST',headers:{Authorization:'Bearer '+token},credentials:'omit',cache:'no-store',redirect:'error'});
   if(!r.ok){status.textContent=await r.text();if(r.status===403)limpar();return;}
   const blob=await r.blob();
   const href=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=href;a.download='snapshot-editorial-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
   document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);
   status.textContent='Pacote recebido e download solicitado ao navegador. Confira se o arquivo foi salvo. Não é backup das fotos nem restauração de produção validada.';
 }catch{status.textContent='Falha no download. Nenhum arquivo completo foi confirmado.';}
 finally{ocupadoAcao=false;botoes.forEach(id=>document.getElementById(id).disabled=false);}
});
`+worker.slice(pos);
// Bloqueia download enquanto há comando de emergência em curso.
worker=worker.replace(" document.getElementById('emergencia').disabled=true;"," document.getElementById('baixar').disabled=true;\n document.getElementById('emergencia').disabled=true;");
worker=worker.replace('finally{ocupadoAcao=false;document.getElementById(\'emergencia\')',"finally{ocupadoAcao=false;document.getElementById('baixar').disabled=false;document.getElementById('emergencia')");
writeFileSync(new URL('worker-download-teste.mjs',pasta),pacote+'\n'+download+'\n'+worker);
console.log('Worker completo de download gerado. Nenhum deploy realizado.');
