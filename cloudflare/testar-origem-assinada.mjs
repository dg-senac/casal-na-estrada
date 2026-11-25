import {autorizar} from '../experiments/emergencia/autorizacao.mjs';
import {caminhoAssinadoDaUrl,buscarOrigemAssinada} from './origem-assinada.mjs';
const BASE='https://pjglrlullnchqazxpvyn.supabase.co';
const resposta=(texto,status)=>new Response(texto,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});
export async function testarOrigemAssinada(request,env,buscar=fetch){
 const u=new URL(request.url);
 if(request.method!=='POST')return resposta('Método não permitido.',405);
 if(request.headers.get('Origin')!==u.origin)return resposta('Origem não permitida.',403);
 if(env.SUPABASE_URL?.replace(/\/$/,'')!==BASE||!env.SUPABASE_ANON_KEY?.startsWith('sb_publishable_'))return resposta('Configuração indisponível.',503);
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),30000);
 const rede=(url,o)=>buscar(url,{...o,signal:ac.signal,redirect:'manual',cache:'no-store'});
 try{
  const acesso=await autorizar(request,{supabaseUrl:BASE,chavePublica:env.SUPABASE_ANON_KEY},rede);
  if(!acesso?.autorizado)return resposta('Acesso negado ou validação indisponível.',403);
  if(typeof env.MIDIA_WORKER_HMAC!=='string'||new TextEncoder().encode(env.MIDIA_WORKER_HMAC).length<32)return resposta('Segredo de assinatura não configurado no runtime do Worker.',503);
  const estado=await env.DB.prepare('SELECT manutencao FROM estado_site WHERE id = 1').first();
  if(estado?.manutencao!==0)return resposta('O teste exige o paralelo aberto. Não alterou a manutenção.',409);
  // Escolha pelo servidor, sem aceitar URL/nome arbitrário do navegador.
  const data=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Recife',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
  const hoje=data.year+'-'+data.month+'-'+data.day;
  const r=await rede(BASE+'/rest/v1/posts?select=capa_url,capa_mini&publicado=eq.true&data=lte.'+hoje+'&order=data.asc&limit=20',{headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:'Bearer '+env.SUPABASE_ANON_KEY}});
  if(r.status!==200)throw Error('Seleção indisponível');
  // Limite de leitura inclusive se origem não informar Content-Length.
  const reader=r.body?.getReader();if(!reader)throw Error('Seleção vazia');let total=0;const partes=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>65536)throw Error('Seleção excessiva');partes.push(value);}}finally{try{await reader.cancel();}catch{}reader.releaseLock();}
  const bytes=new Uint8Array(total);let pos=0;for(const p of partes){bytes.set(p,pos);pos+=p.length;}
  const lista=JSON.parse(new TextDecoder().decode(bytes));if(!Array.isArray(lista)||lista.length>20)throw Error('Seleção inválida');
  const caminho=lista.flatMap(p=>[p.capa_url,p.capa_mini]).map(caminhoAssinadoDaUrl).find(Boolean);
  if(!caminho)return resposta('Nenhuma capa publicada compatível para testar. Nenhuma alteração feita.',409);
  const imagem=await buscarOrigemAssinada(caminho,env,rede);
  const semAssinatura=await rede(BASE+'/functions/v1'+caminho,{method:'GET'});
  const negada=semAssinatura.status===403;try{await semAssinatura.body?.cancel();}catch{}
  if(!negada)throw Error('Negativa sem assinatura não confirmada');
  return resposta('Canal isolado validado: imagem publicada recebida com assinatura ('+imagem.bytes.length+' bytes, '+imagem.tipo+'); pedido sem assinatura recusado com HTTP 403. Nenhum backup criado e nenhuma manutenção alterada. As origens antigas continuam disponíveis.',200);
 }catch{return resposta('Canal isolado NÃO validado. Confira se o mesmo segredo foi salvo nos dois servidores, se midia-worker está ativa e se o paralelo está aberto. Nenhuma alteração de conteúdo, backup ou manutenção foi feita por este teste. Não envie o segredo ao chat.',503);}
 finally{clearTimeout(timer);}
}
