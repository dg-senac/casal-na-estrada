import {readFileSync,writeFileSync} from 'node:fs';
import './gerar-worker-conferencia.mjs';
const pasta=new URL('./',import.meta.url);
let base=readFileSync(new URL('worker-conferencia-teste.mjs',pasta),'utf8');
base=base.replace("if(url.pathname === '/api/conferir-backup')return conferirBackup", "if(['/api/conferir-backup','/api/baixar-backup'].includes(url.pathname))return conferirBackup");
base=base.replace('<button id="conferir" type="button">Conferir cópia no D1</button>',`<button id="conferir" type="button">Conferir cópia no D1</button>
<button id="baixar-guardada" type="button">Baixar esta cópia guardada no D1</button>
<p>Inclui rascunhos. Não cria nova cópia nem consulta os cadastros atuais. Guarde o arquivo em pasta privada. Não inclui os arquivos das fotos.</p>`);
const pos=base.indexOf("document.getElementById('limpar').addEventListener");if(pos<0)throw Error('Marcador ausente');
base=base.slice(0,pos)+`document.getElementById('baixar-guardada').addEventListener('click',async()=>{
 if(ocupadoAcao||!token)return;
 const id=document.getElementById('id-copia').value.trim();
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id)){status.textContent='Confira o ID da cópia.';return;}
 if(!confirm('Baixar a cópia editorial já guardada no D1, incluindo rascunhos, para este computador? Não inclui arquivos das fotos.'))return;
 ocupadoAcao=true;const botoes=['baixar-guardada','conferir','backup-real','baixar','emergencia','reabrir','limpar'];botoes.forEach(id=>document.getElementById(id).disabled=true);
 status.textContent='Validando e baixando a cópia guardada no D1…';
 try{
 const r=await fetch('/api/baixar-backup',{method:'POST',headers:{Authorization:'Bearer '+token,'X-Teste-Id':id},credentials:'omit',cache:'no-store',redirect:'error'});
 if(!r.ok){status.textContent=await r.text();if(r.status===403)limpar();return;}
 const blob=await r.blob(),href=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=href;a.download='snapshot-editorial-d1-'+id+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);
 status.textContent='Cópia guardada validada e recebida. Download solicitado ao navegador: confira se o arquivo foi salvo em pasta privada. Nenhuma nova cópia foi criada no D1.';
 }catch{status.textContent='Falha no download da cópia guardada. Nenhum arquivo completo foi confirmado.';}
 finally{ocupadoAcao=false;botoes.forEach(id=>document.getElementById(id).disabled=false);}
});
`+base.slice(pos);
writeFileSync(new URL('worker-copia-guardada-teste.mjs',pasta),base);
console.log('Worker de download da cópia guardada gerado. Não publicado.');
