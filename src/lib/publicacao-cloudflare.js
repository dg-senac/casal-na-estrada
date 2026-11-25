const HOST='https://casal-na-estrada-site-teste.douglasmarista02.workers.dev';
export function criarPublicacaoCloudflare({habilitado,origem,obterSessao,fetchImpl=fetch}){
 if(habilitado!==true||origem!==HOST)return null;
 const chamar=async acao=>{
  try{
   const sessao=await obterSessao();if(!sessao?.access_token)return {ok:false,mensagem:'Entre novamente para solicitar publicação.'};
   const r=await fetchImpl('/api/publicacao-cloudflare/'+acao,{method:'POST',headers:{Authorization:'Bearer '+sessao.access_token},credentials:'omit',cache:'no-store',redirect:'error'});
   const doc=await r.json();return {...doc,ok:r.ok&&doc.ok===true};
  }catch{return {ok:false,mensagem:'Publicação sem confirmação. Confira Builds na Cloudflare antes de repetir.'};}
 };
 return {status:()=>chamar('status'),solicitar:()=>chamar('solicitar')};
}
