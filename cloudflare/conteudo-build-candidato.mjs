import {assinarConteudo} from '../experiments/origem-protegida/assinatura-conteudo.mjs';
import {lerRespostaConteudo} from '../src/lib/conteudo-build.js';
const BASE='https://pjglrlullnchqazxpvyn.supabase.co';
const negar=s=>new Response(null,{status:s,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const aberto=async env=>{try{return (await env.DB.prepare('SELECT manutencao FROM estado_site WHERE id = 1').first())?.manutencao===0;}catch{return false;}};
/** Origem aditiva instalada. Rota pública só entrega conteúdo publicado e passa pela manutenção. */
export async function servirConteudoBuildCandidato(request,env,buscar=fetch){
 const u=new URL(request.url);if(u.pathname!=='/conteudo-build.json'||u.search)return negar(404);
 if(!['GET','HEAD'].includes(request.method))return negar(405);
 if(!await aberto(env))return negar(503);
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),20000);
 try{
  const headers=await assinarConteudo(env.MIDIA_WORKER_HMAC);
  const r=await buscar(BASE+'/functions/v1/midia-worker/conteudo',{method:'GET',headers,redirect:'manual',cache:'no-store',signal:ac.signal});
  const publicado=await lerRespostaConteudo(r);
  if(!await aberto(env))return negar(503);
  const texto=JSON.stringify(publicado);
  return new Response(request.method==='HEAD'?null:texto,{headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});
 }catch{return negar(503);}finally{clearTimeout(timer);}
}
