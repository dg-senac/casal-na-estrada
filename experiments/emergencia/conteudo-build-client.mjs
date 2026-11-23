document.getElementById('testar-conteudo-build').onclick=async()=>{
 if(ocupadoAcao||!token)return;
 ocupadoAcao=true;const botoes=[...document.querySelectorAll('#acoes button'),document.getElementById('limpar')];botoes.forEach(b=>b.disabled=true);
 status.textContent='Conferindo canal assinado de conteúdo publicado. Não cria backup nem ativa manutenção…';
 try{
  const r=await fetch('/api/testar-conteudo-build',{method:'POST',headers:{Authorization:'Bearer '+token},credentials:'omit',cache:'no-store',redirect:'error'});
  status.textContent=await r.text();if(r.status===403)limpar();
 }catch{status.textContent='Não foi possível confirmar o canal de conteúdo. Nenhuma conclusão obtida; não alterou a manutenção.';}
 finally{ocupadoAcao=false;botoes.forEach(b=>b.disabled=false);}
};
