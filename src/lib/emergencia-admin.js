import {copiarFotosAutomaticas} from './fotos-automaticas.js';
const HOST_TESTE='https://casal-na-estrada-site-teste.douglasmarista02.workers.dev';
/** Somente admin do build paralelo. Não transfere tokens para outra origem. */
export function instalarEmergenciaAdmin({documento=document,origem=location.origin,habilitado=false,obterSessao,fetchImpl=fetch,uuid=()=>crypto.randomUUID()}){
 if(!habilitado||origem!==HOST_TESTE||documento.getElementById('pn-emergencia'))return;
 const topo=documento.querySelector('.pn-topo__direita');if(!topo)return;
 const botao=documento.createElement('button');botao.type='button';botao.id='pn-emergencia';botao.textContent='Emergência — teste';
 botao.title='Manutenção do site paralelo e cópia dos cadastros e fotos do Supabase';topo.append(botao);
 botao.addEventListener('click',()=>{
  if(documento.getElementById('pn-emergencia-dialogo'))return;
  const dialogo=documento.createElement('dialog');dialogo.id='pn-emergencia-dialogo';
  const titulo=documento.createElement('h2');titulo.textContent='Emergência do ambiente paralelo';
  const aviso=documento.createElement('p');aviso.textContent='Esta ação coloca SOMENTE o site paralelo em manutenção e tenta copiar os cadastros reais, incluindo rascunhos, para o D1. Depois dos cadastros, esta aba tenta copiar automaticamente as fotos do Supabase. Mantenha a aba aberta até terminar. Não inclui imagens fixas do repositório: preserve o ZIP completo. Se interromper, retome com o mesmo ID no controle protegido. Não bloqueia o GitHub Pages nem o acesso direto ao Supabase. Exige sessão administrativa com segundo fator.';
  const status=documento.createElement('p');status.setAttribute('role','status');
  const confirmar=documento.createElement('button');confirmar.type='button';confirmar.textContent='Ativar manutenção do paralelo e copiar cadastros';
  const fechar=documento.createElement('button');fechar.type='button';fechar.textContent='Cancelar';
  const painel=documento.createElement('a');painel.href='/login-teste';painel.textContent='Abrir controle protegido para conferir cópia ou reabrir';
  dialogo.append(titulo,aviso,confirmar,fechar,documento.createElement('br'),painel,status);documento.body.append(dialogo);
  let iniciou=false,ocupado=false;
  fechar.onclick=()=>{if(!ocupado){dialogo.close();dialogo.remove();}};
  dialogo.addEventListener('cancel',e=>{if(ocupado)e.preventDefault();});
  dialogo.addEventListener('close',()=>dialogo.remove());
  confirmar.onclick=async()=>{
   if(iniciou||ocupado)return;
   ocupado=true;confirmar.disabled=true;fechar.disabled=true;botao.disabled=true;
   status.textContent='Validando sessão e aguardando confirmação. Não feche esta janela.';
   try{
    const sessao=await obterSessao();if(!sessao?.access_token)throw Error('Sessão indisponível. Entre novamente antes de iniciar.');
    // Sem repetição automática em resultado incerto e sem token em URL/storage.
    const id=uuid();iniciou=true;
    const r=await fetchImpl('/api/emergencia-real',{method:'POST',headers:{Authorization:'Bearer '+sessao.access_token,'X-Teste-Id':id},credentials:'omit',cache:'no-store',redirect:'error'});
    const mensagem=await r.text();
    if(r.ok){
     try{const fotos=await copiarFotosAutomaticas({id,token:sessao.access_token,fetchImpl,progresso:texto=>{status.textContent=texto;}});status.textContent=mensagem+' '+fotos+' Confira e baixe a cópia pelo controle protegido antes de reabrir.';}
     catch{status.textContent=mensagem+' Fotos NÃO confirmadas. A manutenção permanece ativa. Retome as fotos pelo controle protegido com o ID '+id+'. Não repita a emergência para criar outra cópia.';}
     return;
    }
    status.textContent=mensagem+' Identificador desta tentativa: '+id+'. '+(r.ok?'Confira a cópia pelo controle protegido antes de reabrir.':'Não presuma que o site continua aberto ou que a cópia falhou. Confira o controle protegido antes de repetir.');
   }catch(e){status.textContent=iniciou?'Resultado sem confirmação. O paralelo pode estar em manutenção e a cópia pode ter ocorrido. Confira o controle protegido; não repita automaticamente.':e.message;}
   finally{ocupado=false;confirmar.disabled=iniciou;fechar.disabled=false;fechar.textContent='Fechar';botao.disabled=iniciou;}
  };
  dialogo.showModal();
 });
}
