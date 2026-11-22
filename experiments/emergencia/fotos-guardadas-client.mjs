async function executarFotosGuardadas(baixar){
 if(ocupadoAcao||!token)return;
 const id=document.getElementById('id-copia').value.trim();
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id)){status.textContent='Informe o ID da cópia editorial.';return;}
 if(!baixar&&!confirm('Copiar/retomar fotos reais e privadas do Supabase no D1 existente? A manutenção não será alterada; use o ID correto e mantenha esta aba aberta. Não inclui public/media.'))return;
 ocupadoAcao=true;const botoes=[...document.querySelectorAll('#acoes button'),document.getElementById('limpar')];botoes.forEach(b=>b.disabled=true);
 try{
  if(!baixar){status.textContent=await copiarFotosAutomaticas({id,token,progresso:t=>status.textContent=t});return;}
  const headers={Authorization:'Bearer '+token,'X-Teste-Id':id};
  const obter=async(acao,extras={})=>{const r=await fetch('/api/fotos-guardadas/'+acao,{method:'POST',headers:{...headers,...extras},credentials:'omit',cache:'no-store',redirect:'error'});if(!r.ok)throw Error(await r.text());return r;};
  status.textContent='Lendo manifesto das fotos GUARDADAS no D1…';
  const inventario=await (await obter('inventario')).json();if(inventario.estado!=='concluido'||!Array.isArray(inventario.arquivos)||inventario.arquivos.length>100)throw Error('Cópia não concluída.');
  const partes=[],arquivos=[];let total=0;
  for(const [i,a] of inventario.arquivos.entries()){
   status.textContent='Baixando e verificando do D1: '+(i+1)+' de '+inventario.arquivos.length;
   const r=await obter('arquivo',{'X-Foto-Nome':encodeURIComponent(a.nome)}),bytes=new Uint8Array(await r.arrayBuffer());total+=bytes.length;
   const sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
   if(total>8*1048576||bytes.length!==a.tamanho||sha256!==a.sha256||sha256!==r.headers.get('X-Conteudo-Sha256'))throw Error('Integridade do download divergente.');
   const pos=a.nome.indexOf('/');partes.push({nome:a.nome,bytes});arquivos.push({nome:a.nome,bucket:a.nome.slice(0,pos),caminho:a.nome.slice(pos+1),tamanho:bytes.length,sha256});
  }
  const manifesto={versao:1,tipo:'arquivos-midia-sem-cadastros',criadoEm:new Date().toISOString(),snapshotEditorialId:id,totalBytes:total,arquivos,limitacoes:'Somente fotos do Supabase copiadas no D1; não inclui public/media. Data indica download, não captura atômica.'};
  partes.push({nome:'manifesto.json',bytes:new TextEncoder().encode(JSON.stringify(manifesto,null,2))});
  const href=URL.createObjectURL(montarZipFotos(partes)),link=document.createElement('a');link.href=href;link.download='fotos-guardadas-d1-'+id+'.zip';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);
  status.textContent='Download solicitado: '+arquivos.length+' fotos guardadas no D1, '+total+' bytes. Confirme salvamento privado e use o verificador ZIP local. Não inclui public/media.';
 }catch(e){status.textContent='Fotos não confirmadas: '+e.message+' Preserve o ID; não repita a emergência. Nenhuma reabertura foi feita.';}
 finally{ocupadoAcao=false;botoes.forEach(b=>b.disabled=false);}
}
document.getElementById('retomar-fotos-d1').onclick=()=>executarFotosGuardadas(false);
document.getElementById('baixar-fotos-d1').onclick=()=>executarFotosGuardadas(true);
