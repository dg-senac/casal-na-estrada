/** Candidata NÃO publicada. Credencial privilegiada somente dentro da Edge,
 * nunca no Worker/site/build. Usada após assinatura + guarda de publicação.
 */
import {verificarOrigem,caminhoOrigemAssinada} from '../emergencia/assinatura-origem.mjs';
const PROJETO='https://pjglrlullnchqazxpvyn.supabase.co';
function negar(status){return new Response(null,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});}
async function bytesLimitados(r,limite){
 if(!r.body)throw Error('Sem corpo');
 const reader=r.body.getReader(),partes=[];let total=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>limite)throw Error('Excesso');partes.push(value);}}
 finally{try{await reader.cancel();}catch{}reader.releaseLock();}
 const bytes=new Uint8Array(total);let pos=0;for(const p of partes){bytes.set(p,pos);pos+=p.length;}return bytes;
}
export async function responderOrigemCandidata(request,{segredo,urlSupabase,chaveServidor,buscar=fetch,agora=Date.now()}){
 if(!['GET','HEAD'].includes(request.method))return negar(405);
 const u=new URL(request.url),prefixo='/functions/v1';
 if(u.origin!==PROJETO||u.search||!u.pathname.startsWith(prefixo+'/midia-worker/'))return negar(404);
 const caminho=u.pathname.slice(prefixo.length);
 if(!caminhoOrigemAssinada(caminho))return negar(404);
 // Verificação estrutural não autentica chave; o Supabase é quem a valida.
 if(urlSupabase?.replace(/\/$/,'')!==PROJETO||typeof segredo!=='string'||new TextEncoder().encode(segredo).length<32||typeof chaveServidor!=='string'||chaveServidor.length<32||chaveServidor.startsWith('sb_publishable_'))return negar(503);
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),15000);
 const headers={apikey:chaveServidor,Authorization:'Bearer '+chaveServidor};
 const rede=(url,o)=>buscar(url,{...o,signal:ac.signal,redirect:'manual',cache:'no-store'});
 const rpc=async(nome,body)=>{
  const r=await rede(PROJETO+'/rest/v1/rpc/'+nome,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(r.status!==200){try{await r.body?.cancel();}catch{}throw Error('RPC indisponível');}
  const bytes=await bytesLimitados(r,1024);const texto=new TextDecoder().decode(bytes);
  if(texto!=='true'&&texto!=='false')throw Error('RPC incompatível');return texto==='true';
 };
 let imagem;
 try{
  // URL normalizada só para a mensagem canônica; não inclui token do visitante.
  const canonico=new Request(PROJETO+caminho,{method:request.method,headers:request.headers});
  const permitido=await verificarOrigem({request:canonico,segredo,agora,consumirNonce:(valor,expira)=>rpc('origem_worker_consumir_nonce',{valor,expira})});
  if(!permitido)return negar(403);
  const [bucket,...objeto]=caminho.slice('/midia-worker/'.length).split('/').map(p=>decodeURIComponent(p));
  const parametros={bucket,caminho:objeto.join('/')};
  const publicada=()=>rpc('origem_worker_foto_publicada',parametros);
  if(!await publicada())return negar(404);
  imagem=await rede(PROJETO+'/storage/v1/object/authenticated/'+[bucket,...objeto].map(encodeURIComponent).join('/'),{method:'GET',headers});
  if(imagem.status!==200)return negar(404);
  const tipo=(imagem.headers.get('Content-Type')||'').split(';')[0].trim().toLowerCase();
  if(!['image/jpeg','image/webp','image/png'].includes(tipo))return negar(404);
  const tamanho=imagem.headers.get('Content-Length');
  if(tamanho!==null&&(!/^\d+$/.test(tamanho)||Number(tamanho)>10*1024*1024))return negar(502);
  const bytes=await bytesLimitados(imagem,10*1024*1024);
  if(!await publicada())return negar(404);
  return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':tipo,'Content-Length':String(bytes.length),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex','Content-Security-Policy':"default-src 'none'; sandbox",'Referrer-Policy':'no-referrer'}});
 }catch{return negar(503);}
 finally{try{await imagem?.body?.cancel();}catch{}clearTimeout(timer);}
}
