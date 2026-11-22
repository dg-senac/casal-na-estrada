// Inserido pelo gerador na página autenticada; não usa localStorage ou URLs externas.
document.getElementById('baixar-fotos').addEventListener('click',async()=>{
 if(ocupadoAcao||!token)return;
 if(!confirm('Baixar os arquivos de public/media e dos buckets midia/midia-rascunhos? Pode incluir fotos privadas e não publicadas. ZIP montado neste navegador, sem nova assinatura ou armazenamento de imagens no D1.'))return;
 ocupadoAcao=true;const botoes=[...document.querySelectorAll('#acoes button'),document.getElementById('limpar')];botoes.forEach(b=>b.disabled=true);
 const partes=[],manifesto=[];let total=0;
 try{
  status.textContent='Inventariando arquivos. Nenhuma cópia de fotos foi confirmada ainda…';
  const r=await fetch('/api/midia-inventario',{method:'POST',headers:{Authorization:'Bearer '+token},credentials:'omit',cache:'no-store',redirect:'error'});
  if(!r.ok){if(r.status===403)limpar();throw Error(await r.text());}
  const inventario=await r.json();
  if(inventario.versao!==1||!Array.isArray(inventario.arquivos)||inventario.arquivos.length>999)throw Error('Inventário incompatível.');
  for(const [i,a] of inventario.arquivos.entries()){
   status.textContent='Baixando arquivo '+(i+1)+' de '+inventario.arquivos.length+'… Mantenha esta aba aberta.';
   const f=await fetch('/api/midia-arquivo',{method:'POST',headers:{Authorization:'Bearer '+token,'X-Midia-Bucket':a.bucket,'X-Midia-Caminho':encodeURIComponent(a.caminho)},credentials:'omit',cache:'no-store',redirect:'error'});
   if(!f.ok){if(f.status===403)limpar();throw Error('Não foi possível obter todos os arquivos. Nenhum ZIP completo foi confirmado.');}
   const bytes=new Uint8Array(await f.arrayBuffer());total+=bytes.length;
   if(total>60*1024*1024||bytes.length!==a.tamanho)throw Error('Tamanho alterado ou limite excedido. Refaça o inventário; nenhum ZIP completo foi confirmado.');
   const sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
   if(sha256!==f.headers.get('X-Conteudo-Sha256')||(a.sha256&&sha256!==a.sha256))throw Error('Integridade divergente. Nenhum ZIP completo foi confirmado.');
   const nome=a.bucket+'/'+a.caminho;partes.push({nome,bytes});manifesto.push({bucket:a.bucket,caminho:a.caminho,nome,tamanho:bytes.length,sha256});
  }
  const doc={versao:1,tipo:'arquivos-midia-sem-cadastros',criadoEm:inventario.criadoEm,totalBytes:total,arquivos:manifesto,limitacoes:inventario.observacao};
  partes.push({nome:'manifesto.json',bytes:new TextEncoder().encode(JSON.stringify(doc,null,2))});
  status.textContent='Preparando ZIP. Aguarde…';
  const blob=montarZipFotos(partes),href=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=href;link.download='arquivos-midia-'+new Date().toISOString().replace(/[:.]/g,'-')+'.zip';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);
  status.textContent='Arquivos recebidos e verificados: '+manifesto.length+' ('+total+' bytes). Download do ZIP solicitado; confirme que foi salvo em pasta privada. Não inclui cadastros nem comprova restauração. Fotos não são copiadas automaticamente para o D1.';
 }catch(e){status.textContent=e.message||'Falha no backup dos arquivos. Nenhum ZIP completo confirmado.';}
 finally{partes.length=0;ocupadoAcao=false;botoes.forEach(b=>b.disabled=false);}
});
document.getElementById('verificar-fotos').addEventListener('click',async()=>{
 if(ocupadoAcao)return;
 const arquivo=document.getElementById('zip-local-fotos').files[0];if(!arquivo){status.textContent='Selecione o ZIP de mídia baixado.';return;}
 ocupadoAcao=true;const botoes=[...document.querySelectorAll('#acoes button'),document.getElementById('limpar')];botoes.forEach(b=>b.disabled=true);
 status.textContent='Verificando ZIP somente neste navegador. Nada será enviado…';
 try{const r=await verificarZipFotos(arquivo);status.textContent='ZIP local validado: '+r.arquivos+' arquivos, '+r.totalBytes+' bytes. CRC, manifesto e SHA-256 conferem. Nada enviado. Isso não prova autenticidade contra invasor nem restauração do site.';}
 catch(e){status.textContent='ZIP não validado: '+e.message;}
 finally{ocupadoAcao=false;botoes.forEach(b=>b.disabled=false);}
});
