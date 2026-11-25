import {readFileSync,writeFileSync} from 'node:fs';
import './gerar-worker-backup-real.mjs';
const pasta=new URL('./',import.meta.url);
let base=readFileSync(new URL('worker-backup-real-teste.mjs',pasta),'utf8');
const modulo=readFileSync(new URL('conferir-backup.mjs',pasta),'utf8').replace(/^import .*;\n/gm,'').replaceAll('export ','');
base=base.replace('    const url = new URL(request.url);',`    const url = new URL(request.url);
    if(url.pathname === '/api/conferir-backup')return conferirBackup(request,{habilitado:true,supabaseUrl:env.SUPABASE_URL,chavePublica:env.SUPABASE_ANON_KEY},env.DB);`);
base=base.replace('<button id="baixar" type="button">',`<h2>Conferir cópia já guardada</h2><p>Somente leitura: recalcula checksum sem exibir cadastros ou gerar outra cópia.</p>
<label>ID da cópia <input id="id-copia" maxlength="36" value="2988653f-e376-40cd-a687-5c52a7f370f6"></label>
<button id="conferir" type="button">Conferir cópia no D1</button>
<button id="baixar" type="button">`);
const pos=base.indexOf("document.getElementById('limpar').addEventListener");if(pos<0)throw Error('Marcador ausente');
base=base.slice(0,pos)+`document.getElementById('conferir').addEventListener('click',async()=>{
 if(ocupadoAcao||!token)return;
 const id=document.getElementById('id-copia').value.trim();
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id)){status.textContent='Confira o ID da cópia.';return;}
 ocupadoAcao=true;const botoes=['conferir','backup-real','baixar','emergencia','reabrir','limpar'];botoes.forEach(id=>document.getElementById(id).disabled=true);
 status.textContent='Conferindo a cópia armazenada…';
 try{
 const r=await fetch('/api/conferir-backup',{method:'POST',headers:{Authorization:'Bearer '+token,'X-Teste-Id':id},credentials:'omit',cache:'no-store',redirect:'error'});
 status.textContent=await r.text();if(r.status===403)limpar();
 }catch{status.textContent='Falha na conferência. Nenhuma conclusão sobre integridade foi obtida.';}
 finally{ocupadoAcao=false;botoes.forEach(id=>document.getElementById(id).disabled=false);}
});
`+base.slice(pos);
writeFileSync(new URL('worker-conferencia-teste.mjs',pasta),modulo+'\n'+base);
console.log('Arquivo de conferência gerado. Não publicado.');
