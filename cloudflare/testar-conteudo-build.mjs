import {autorizar} from '../experiments/emergencia/autorizacao.mjs';
import {servirConteudoBuildCandidato} from './conteudo-build-candidato.mjs';
const BASE='https://pjglrlullnchqazxpvyn.supabase.co';
const resposta=(t,s)=>new Response(t,{status:s,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});
export async function testarConteudoBuild(request,env,buscar=fetch){
 const u=new URL(request.url);if(request.method!=='POST')return resposta('Método não permitido.',405);
 if(request.headers.get('Origin')!==u.origin)return resposta('Origem não permitida.',403);
 if(env.SUPABASE_URL?.replace(/\/$/,'')!==BASE||!env.SUPABASE_ANON_KEY?.startsWith('sb_publishable_'))return resposta('Configuração indisponível.',503);
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),30000);
 const rede=(url,o)=>buscar(url,{...o,signal:ac.signal,redirect:'manual',cache:'no-store'});
 try{
  const acesso=await autorizar(request,{supabaseUrl:BASE,chavePublica:env.SUPABASE_ANON_KEY},rede);
  if(!acesso?.autorizado)return resposta('Acesso negado ou validação indisponível.',403);
  const r=await servirConteudoBuildCandidato(new Request(new URL('/conteudo-build.json',u.origin)),env,rede);
  if(r.status!==200)throw Error('Canal indisponível');
  const doc=await r.json();
  const semAssinatura=await rede(BASE+'/functions/v1/midia-worker/conteudo',{method:'GET'});
  const negou=semAssinatura.status===403;try{await semAssinatura.body?.cancel();}catch{}
  if(!negou)throw Error('Negativa não confirmada');
  return resposta('Canal de conteúdo validado: '+doc.posts.length+' posts, '+doc.albuns.length+' álbuns, '+doc.trofeus.length+' troféus e '+doc.encontros.length+' encontros publicados. Pedido sem assinatura recusado com HTTP 403. Nenhum backup criado, conteúdo editado ou manutenção alterada. O build ainda não foi trocado nesta publicação.',200);
 }catch{return resposta('Canal de conteúdo NÃO validado. Confira se o paralelo está aberto e se a nova versão de midia-worker está ativa. Nenhuma alteração em conteúdo, backup ou manutenção foi feita pelo teste. Não envie segredos ao chat.',503);}
 finally{clearTimeout(timer);}
}
