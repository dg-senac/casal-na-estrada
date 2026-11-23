import {autorizar} from '../experiments/emergencia/autorizacao.mjs';
const BASE='https://pjglrlullnchqazxpvyn.supabase.co';
export const SQL_PUBLICACAO_CF=`CREATE TABLE IF NOT EXISTS publicacao_cloudflare (
 id INTEGER PRIMARY KEY CHECK(id=1), solicitado_em INTEGER NOT NULL DEFAULT 0
); INSERT OR IGNORE INTO publicacao_cloudflare(id) VALUES(1);`;
export function hookPermitido(valor){
 if(typeof valor!=='string')return false;
 return /^https:\/\/api\.cloudflare\.com\/client\/v4\/workers\/builds\/deploy_hooks\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(valor);
}
const responder=(doc,status=200)=>Response.json(doc,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});
export async function publicacaoCloudflare(request,env,buscar=fetch){
 const u=new URL(request.url),acao=u.pathname.split('/').at(-1);
 if(!['status','solicitar'].includes(acao))return responder({ok:false,mensagem:'Não encontrado.'},404);
 if(request.method!=='POST')return responder({ok:false,mensagem:'Método não permitido.'},405);
 if(request.headers.get('Origin')!==u.origin)return responder({ok:false,mensagem:'Origem não permitida.'},403);
 if(env.SUPABASE_URL?.replace(/\/$/,'')!==BASE||!env.SUPABASE_ANON_KEY?.startsWith('sb_publishable_'))return responder({ok:false,mensagem:'Configuração indisponível.'},503);
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),15000);
 const rede=(url,o)=>buscar(url,{...o,signal:ac.signal,redirect:'manual',cache:'no-store'});
 try{
  const acesso=await autorizar(request,{supabaseUrl:BASE,chavePublica:env.SUPABASE_ANON_KEY},rede);
  if(!acesso?.autorizado)return responder({ok:false,mensagem:'Acesso negado ou validação indisponível.'},403);
  const configurada=hookPermitido(env.CLOUDFLARE_DEPLOY_HOOK_URL);
  if(acao==='status')return responder({ok:true,configurada});
  if(!configurada)return responder({ok:false,mensagem:'Falta configurar o Deploy Hook da Cloudflare no servidor. Não cole segredos no admin.'},503);
  const estado=await env.DB.prepare('SELECT manutencao FROM estado_site WHERE id = 1').first();
  if(estado?.manutencao!==0)return responder({ok:false,mensagem:'Manutenção ativa. Nenhum build solicitado; reabra pelo controle protegido quando for seguro.'},409);
  // Só cria o controle ao solicitar explicitamente publicação autenticada.
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS publicacao_cloudflare (id INTEGER PRIMARY KEY CHECK(id=1), solicitado_em INTEGER NOT NULL DEFAULT 0)').run();
  await env.DB.prepare('INSERT OR IGNORE INTO publicacao_cloudflare(id) VALUES(1)').run();
  const trava=await env.DB.prepare('UPDATE publicacao_cloudflare SET solicitado_em=unixepoch() WHERE id=1 AND solicitado_em<=unixepoch()-60').run();
  if(trava.meta?.changes!==1)return responder({ok:false,mensagem:'Há uma solicitação recente. Alterações continuam salvas; aguarde 60 segundos e use Publicar agora se fez novas edições.'},429);
  const r=await rede(env.CLOUDFLARE_DEPLOY_HOOK_URL,{method:'POST'});
  if(r.status<200||r.status>=300){try{await r.body?.cancel();}catch{}throw Error('Hook recusado');}
  const reader=r.body?.getReader();if(!reader)throw Error('Sem confirmação');const partes=[];let n=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>65536)throw Error('Resposta excessiva');partes.push(value);}}finally{try{await reader.cancel();}catch{}reader.releaseLock();}
  const bytes=new Uint8Array(n);let pos=0;for(const p of partes){bytes.set(p,pos);pos+=p.length;}
  const doc=JSON.parse(new TextDecoder().decode(bytes));
  if(doc.success!==true||!doc.result||!['queued','initializing','running'].includes(doc.result.status))throw Error('Build não confirmado');
  return responder({ok:true,mensagem:doc.result.already_exists?'Já existe um build pendente para esta branch. Confira o resultado e publique novamente se houver edições posteriores.':'Publicação solicitada à Cloudflare. Aguarde o build ficar Ready; isto ainda não confirma o site atualizado.'},202);
 }catch{return responder({ok:false,mensagem:'Publicação sem confirmação. O pedido pode ter sido recebido; confira Builds na Cloudflare antes de repetir. Conteúdo salvo não foi apagado.'},503);}
 finally{clearTimeout(timer);}
}
