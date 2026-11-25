import {autorizar} from '../experiments/emergencia/autorizacao.mjs';
import {RESULTADOS_AGENDAMENTO} from './agendamento-publicacao.mjs';
import {diaRecife} from './revisao-publicada.mjs';
const BASE='https://pjglrlullnchqazxpvyn.supabase.co';
const responder=(doc,status=200)=>Response.json(doc,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});
export async function statusAgendamento(request,env,buscar=fetch,agora=Date.now()){
 if(request.method!=='POST')return responder({ok:false},405);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return responder({ok:false},403);
 if(env.SUPABASE_URL?.replace(/\/$/,'')!==BASE||!env.SUPABASE_ANON_KEY?.startsWith('sb_publishable_'))return responder({ok:false},503);
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),15000);
 try{
  const acesso=await autorizar(request,{supabaseUrl:BASE,chavePublica:env.SUPABASE_ANON_KEY},(url,o)=>buscar(url,{...o,signal:ac.signal,redirect:'manual',cache:'no-store'}));
  if(!acesso?.autorizado)return responder({ok:false},403);
  const existe=async nome=>Boolean(await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").bind(nome).first());
  const ultimo=await existe('status_agendamento')?await env.DB.prepare('SELECT verificado_em,resultado FROM status_agendamento WHERE id=1').first():null;
  const tentativas=await existe('agendamento_publicacao')?await env.DB.prepare('SELECT dia,tentativas FROM agendamento_publicacao WHERE id=1').first():null;
  if(ultimo&&(!Number.isSafeInteger(ultimo.verificado_em)||!RESULTADOS_AGENDAMENTO.has(ultimo.resultado)))throw Error('Estado inválido');
  const contagem=tentativas?.dia===diaRecife(agora)?tentativas.tentativas:0;
  if(!Number.isSafeInteger(contagem)||contagem<0||contagem>4)throw Error('Contagem inválida');
  return responder({ok:true,habilitado:env.AGENDAMENTO_PUBLICACAO==='1',ultimaVerificacao:ultimo?new Date(ultimo.verificado_em*1000).toISOString():null,resultado:ultimo?.resultado??null,diaRecife:diaRecife(agora),tentativasHoje:contagem,limiteDiario:4});
 }catch{return responder({ok:false,mensagem:'Consulta indisponível. Nenhum build solicitado.'},503);}
 finally{clearTimeout(timer);}
}
