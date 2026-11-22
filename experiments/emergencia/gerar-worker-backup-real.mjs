import {readFileSync,writeFileSync} from 'node:fs';
import './gerar-worker-download.mjs';
const pasta=new URL('./',import.meta.url);
let base=readFileSync(new URL('worker-download-teste.mjs',pasta),'utf8');
const modulo=readFileSync(new URL('backup-real.mjs',pasta),'utf8').replace(/^import .*;\n/gm,'').replaceAll('export ','');
base=base.replace("    const url = new URL(request.url);",`    const url = new URL(request.url);
    if(url.pathname === '/api/emergencia-real') {
      return emergenciaReal(request,{habilitado:true,supabaseUrl:env.SUPABASE_URL,chavePublica:env.SUPABASE_ANON_KEY},env.DB);
    }`);
base=base.replace('Opera somente no Worker de teste e nas tabelas fictícias do D1. Não altera o GitHub Pages nem copia dados reais do Supabase.', 'Ambiente separado. A manutenção afeta somente este Worker. Há ações fictícias e uma ação identificada para guardar cadastros REAIS no D1. Não altera o GitHub Pages.');
base=base.replace('<button id="baixar" type="button">',`<h2>Emergência do TESTE + cópia editorial REAL</h2>
<p>Ativa manutenção só neste endereço e armazena os cadastros reais, incluindo rascunhos, em tabela privada do D1. Sem arquivos de fotos. Máximo 5 cópias de até 1 MiB; sem exclusão automática. Não é backup completo nem proteção do GitHub Pages.</p>
<button id="backup-real" type="button">Manutenção do TESTE + guardar cadastros REAIS</button>
<button id="baixar" type="button">`);
base=base.replace("const botoes=['baixar','emergencia','reabrir','limpar'];","const botoes=['backup-real','baixar','emergencia','reabrir','limpar'];");
base=base.replace(" document.getElementById('baixar').disabled=true;", " document.getElementById('backup-real').disabled=true;\n document.getElementById('baixar').disabled=true;");
base=base.replace("finally{ocupadoAcao=false;document.getElementById('baixar')", "finally{ocupadoAcao=false;document.getElementById('backup-real').disabled=false;document.getElementById('baixar')");
const pos=base.indexOf("document.getElementById('limpar').addEventListener");
if(pos<0)throw Error('Marcador ausente');
base=base.slice(0,pos)+`let tentativaReal=null;
document.getElementById('backup-real').addEventListener('click',async()=>{
 if(ocupadoAcao||!token)return;
 if(!confirm('Ativar manutenção SOMENTE NO TESTE e guardar cadastros REAIS (incluindo rascunhos) no D1 da sua Cloudflare? Sem fotos; não bloqueia o GitHub Pages.'))return;
 ocupadoAcao=true;const botoes=['backup-real','baixar','emergencia','reabrir','limpar'];botoes.forEach(id=>document.getElementById(id).disabled=true);
 tentativaReal=tentativaReal||crypto.randomUUID();status.textContent='Ativando manutenção do teste e aguardando confirmação do backup real…';
 try{
  const r=await fetch('/api/emergencia-real',{method:'POST',headers:{Authorization:'Bearer '+token,'X-Teste-Id':tentativaReal},credentials:'omit',cache:'no-store',redirect:'error'});
  status.textContent=await r.text();
  if(r.ok)tentativaReal=null;
  if(r.status===403)limpar();
 }catch{status.textContent='Sem confirmação. O teste pode estar em manutenção. Não presuma que a cópia falhou: confira o D1. Repetir nesta aba reutiliza o identificador.';}
 finally{ocupadoAcao=false;botoes.forEach(id=>document.getElementById(id).disabled=false);}
});
`+base.slice(pos);
writeFileSync(new URL('worker-backup-real-teste.mjs',pasta),modulo+'\n'+base);
console.log('Worker de backup real gerado. Não publicado.');
