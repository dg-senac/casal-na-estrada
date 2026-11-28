/** Leitura server-side de conteúdo publicado. Nunca envia chave do Supabase. */
export const URL_CONTEUDO_BUILD='https://casal-na-estrada.douglasmarista02.workers.dev/conteudo-build.json';
export function validarConteudoPublicado(valor){
 if(!valor||typeof valor!=='object'||Array.isArray(valor)||valor.versao!==1||Object.keys(valor).sort().join('|')!=='albuns|encontros|posts|trofeus|versao')throw Error('Formato de conteúdo publicado incompatível');
 for(const t of ['posts','albuns','trofeus','encontros']){
  if(!Array.isArray(valor[t])||valor[t].length>5000)throw Error('Lista publicada inválida');
  for(const r of valor[t])if(!r||typeof r!=='object'||Array.isArray(r)||r.publicado!==true)throw Error('Registro não publicado recebido');
 }
 return valor;
}
export async function lerRespostaConteudo(r){
 let reader;
 try{
  if(r.status!==200||!r.body)throw Error('Conteúdo de build indisponível; nenhum fallback público foi usado');
  if((r.headers.get('Content-Type')||'').split(';')[0].trim()!=='application/json')throw Error('Tipo de build inválido');
  reader=r.body.getReader();const partes=[];let total=0;
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>2097152)throw Error('Conteúdo de build acima do limite');partes.push(value);}
  const bytes=new Uint8Array(total);let pos=0;for(const p of partes){bytes.set(p,pos);pos+=p.length;}
  return validarConteudoPublicado(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
 }finally{try{if(reader){await reader.cancel();reader.releaseLock();}else await r.body?.cancel();}catch{}}
}
export async function lerConteudoBuild(endereco,buscar=fetch){
 if(endereco!==URL_CONTEUDO_BUILD)throw Error('Origem de build não permitida');
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),30000);
 try{
  const r=await buscar(endereco,{method:'GET',headers:{Accept:'application/json'},redirect:'error',cache:'no-store',signal:ac.signal});
  return await lerRespostaConteudo(r);
 }finally{clearTimeout(timer);}
}
