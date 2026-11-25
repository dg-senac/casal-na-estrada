document.getElementById('consultar-agendamento').onclick=async()=>{
 if(ocupadoAcao||!token)return;
 ocupadoAcao=true;const botoes=[...document.querySelectorAll('#acoes button'),document.getElementById('limpar')];botoes.forEach(b=>b.disabled=true);
 status.textContent='Consultando último resultado registrado. Não dispara build…';
 try{
  const r=await fetch('/api/status-agendamento',{method:'POST',headers:{Authorization:'Bearer '+token},credentials:'omit',cache:'no-store',redirect:'error'});
  if(r.status===403){limpar();return;}
  const d=await r.json();if(!r.ok||!d.ok)throw Error('indisponível');
  const mensagens={desativado:'Rotina desativada.', 'sem-configuracao':'Configuração do hook indisponível.',manutencao:'Publicação pausada por manutenção.','sem-referencia':'Manifesto da versão publicada ausente.','referencia-invalida':'Manifesto da versão publicada inválido.',atualizado:'Revisão publicada atualizada; nenhum build necessário.','limite-ou-espera':'Intervalo de espera ou limite diário atingido.','solicitacao-recente':'Havia solicitação recente; nenhum novo pedido enviado.','tentativa-enviada':'Pedido enviado ao hook; publicação ainda depende de build Ready.','tentativa-sem-confirmacao':'Hook não confirmou o pedido.',indisponivel:'Verificação indisponível; não confirma atualização.'};
  status.textContent='Agendamento '+(d.habilitado?'habilitado no runtime':'desabilitado no runtime')+'. '+(d.ultimaVerificacao?'Última verificação: '+new Date(d.ultimaVerificacao).toLocaleString('pt-BR',{timeZone:'America/Recife'})+' (Recife). '+(mensagens[d.resultado]||'Resultado não reconhecido.'):'Ainda não há verificação registrada nesta versão. Aguarde o próximo minuto 17; a consulta não executa a rotina.')+' Tentativas automáticas em '+d.diaRecife+': '+d.tentativasHoje+'/'+d.limiteDiario+'. Nenhum build, backup ou mudança de manutenção foi disparado por esta consulta.';
 }catch{status.textContent='Não foi possível consultar o agendamento. Nenhum build solicitado pela consulta.';}
 finally{ocupadoAcao=false;botoes.forEach(b=>b.disabled=false);}
};
