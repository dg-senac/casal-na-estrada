import {verificarConteudo} from './assinatura-conteudo.mjs';
import {lerRespostaConteudo} from '../../src/lib/conteudo-build.js';
const BASE='https://pjglrlullnchqazxpvyn.supabase.co';
const negar=s=>new Response(null,{status:s,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
/** Ainda não conectada à Edge real. Credencial interna somente nesta origem. */
export async function responderConteudoCandidato(request,{segredo,chaveServidor,buscar=fetch}){
 const u=new URL(request.url);if(u.search||!['/functions/v1/midia-worker/conteudo','/midia-worker/conteudo'].includes(u.pathname))return negar(404);
 if(request.method!=='GET')return negar(405);
 if(typeof chaveServidor!=='string'||chaveServidor.length<32||chaveServidor.startsWith('sb_publishable_'))return negar(503);
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),15000);
 const rpc=(nome,body)=>buscar(BASE+'/rest/v1/rpc/'+nome,{method:'POST',body:JSON.stringify(body),headers:{apikey:chaveServidor,Authorization:'Bearer '+chaveServidor,'Content-Type':'application/json'},redirect:'manual',cache:'no-store',signal:ac.signal});
 try{
  const canonico=new Request(BASE+'/midia-worker/conteudo',{method:'GET',headers:request.headers});
  const consumir=async(valor,expira)=>{const r=await rpc('origem_worker_consumir_nonce',{valor,expira});try{if(r.status!==200||!r.body)return false;const reader=r.body.getReader();let n=0,texto='';try{while(true){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>16)throw Error('Resposta excessiva');texto+=new TextDecoder().decode(value);}}finally{await reader.cancel();reader.releaseLock();}return texto==='true';}finally{try{await r.body?.cancel();}catch{}}};
  if(!await verificarConteudo(canonico,segredo,consumir))return negar(403);
  const publicado=await lerRespostaConteudo(await rpc('origem_worker_conteudo_publicado',{}));
  return Response.json(publicado,{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});
 }catch{return negar(503);}finally{clearTimeout(timer);}
}
