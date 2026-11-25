/** Sem sessão persistida. A aba conduz etapas curtas; fechamento exige retomada. */
export async function copiarFotosAutomaticas({id,token,progresso=()=>{},fetchImpl=fetch}){
 const chamar=async(acao,nome)=>{
  const r=await fetchImpl('/api/fotos-guardadas/'+acao,{method:'POST',headers:{Authorization:'Bearer '+token,'X-Teste-Id':id,...(nome?{'X-Foto-Nome':encodeURIComponent(nome)}:{})},credentials:'omit',cache:'no-store',redirect:'error'});
  if(!r.ok)throw Error(await r.text());return r.json();
 };
 progresso('Inventariando fotos do Supabase. Mantenha esta aba aberta.');
 const inventario=await chamar('iniciar');
 if(!Array.isArray(inventario.arquivos)||inventario.arquivos.length>100)throw Error('Inventário de fotos incompatível.');
 for(const [i,a] of inventario.arquivos.entries()){
  progresso('Copiando e conferindo foto '+(i+1)+' de '+inventario.arquivos.length+'. Mantenha a aba aberta.');await chamar('copiar',a.nome);
 }
 const resultado=await chamar('concluir');
 return 'Fotos do Supabase guardadas e conferidas no D1: '+resultado.arquivos+' arquivos, '+resultado.totalBytes+' bytes. Não inclui imagens fixas do repositório; preserve o ZIP completo. ID: '+id;
}
