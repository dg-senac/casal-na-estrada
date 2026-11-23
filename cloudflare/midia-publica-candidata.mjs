/** CANDIDATO LOCAL: não conectado ao router público, não muda URLs existentes.
 * Só busca fontes já públicas; nunca usa service_role ou token de administrador.
 */
const ORIGEM='https://pjglrlullnchqazxpvyn.supabase.co';
const PREFIXO='/midia-protegida/';
export function destinoMidiaCandidata(request){
 const u=new URL(request.url);
 if(u.search||!u.pathname.startsWith(PREFIXO))return null;
 const resto=u.pathname.slice(PREFIXO.length),partes=resto.split('/');
 let decodificadas;try{decodificadas=partes.map(p=>decodeURIComponent(p));}catch{return null;}
 if(decodificadas.some(p=>!p||p==='.'||p==='..'||/[\\/\x00-\x1f\x7f?#%]/.test(p)))return null;
 const [tipo,...caminho]=decodificadas;
 if(tipo==='privada'){
  if(!/^v1\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(webp|jpg)$/.test(caminho.join('/')))return null;
  return ORIGEM+'/functions/v1/foto-publicada/'+caminho.join('/');
 }
 if(tipo!=='publica'||caminho.join('/').length>1024||!caminho.length||!/^.+\.(jpg|jpeg|png|webp)$/i.test(caminho.at(-1)))return null;
 return ORIGEM+'/storage/v1/object/public/midia/'+caminho.map(encodeURIComponent).join('/');
}
function negar(status){return new Response(null,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});}
async function aberto(env){try{return (await env.DB.prepare('SELECT manutencao FROM estado_site WHERE id=1').first())?.manutencao===0;}catch{return false;}}
export async function servirMidiaCandidata(request,env,fetchImpl=fetch){
 if(!['GET','HEAD'].includes(request.method))return negar(405);
 if(!await aberto(env))return negar(503);
 const destino=destinoMidiaCandidata(request);if(!destino)return negar(404);
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),15000);
 let reader,respostaOrigem;
 try{
  // Sem cookies, Bearer do visitante, headers Range/Referer ou URL arbitrária.
  const r=respostaOrigem=await fetchImpl(destino,{method:'GET',redirect:'manual',cache:'no-store',signal:ac.signal,headers:{Accept:'image/jpeg, image/png, image/webp'}});
  if(!r.ok||r.status!==200||!r.body)return negar(404);
  const tipo=(r.headers.get('Content-Type')||'').split(';')[0].trim().toLowerCase();
  if(!['image/jpeg','image/png','image/webp'].includes(tipo))return negar(404);
  const limite=10*1024*1024,comprimento=r.headers.get('Content-Length');
  if(comprimento!==null&&(!/^\d+$/.test(comprimento)||Number(comprimento)>limite))return negar(502);
  reader=r.body.getReader();const partes=[];let total=0;
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>limite)throw Error('Excesso');partes.push(value);}
  // Se manutenção começou durante a leitura, não entregar o arquivo.
  if(!await aberto(env))return negar(503);
  const bytes=new Uint8Array(total);let pos=0;for(const p of partes){bytes.set(p,pos);pos+=p.length;}
  return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':tipo,'Content-Length':String(total),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex','Content-Security-Policy':"default-src 'none'; sandbox",'Referrer-Policy':'no-referrer'}});
 }catch{return negar(502);}
 finally{if(reader){try{await reader.cancel();}catch{}reader.releaseLock();}else if(respostaOrigem?.body){try{await respostaOrigem.body.cancel();}catch{}}clearTimeout(timer);}
}
