/** Preparação modular, NÃO instalada no Worker. */
import { autorizar } from './autorizacao.mjs';
import { criarPacote, TABELAS } from './pacote-editorial.mjs';
const ORIGEM = 'https://pjglrlullnchqazxpvyn.supabase.co';
const MAX_CAPTURA = 1572864;
function resposta(texto,status) {
 return new Response(texto,{status,headers:{'Content-Type':'text/plain; charset=utf-8',
 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow',
 'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"}});
}
async function lerLimitado(r) {
 if(!r.body)throw Error('Resposta vazia');
 const reader=r.body.getReader(),partes=[];let total=0;
 try{
   while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>MAX_CAPTURA)throw Error('Limite excedido');partes.push(value);}
 }catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
 const bytes=new Uint8Array(total);let pos=0;for(const p of partes){bytes.set(p,pos);pos+=p.byteLength;}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true,ignoreBOM:false}).decode(bytes));
}
function exatas(v,chaves){return v && typeof v==='object' && !Array.isArray(v) && Object.keys(v).sort().join('|')===[...chaves].sort().join('|');}
export async function downloadEditorial(request, config, fetchImpl=fetch) {
 const url=new URL(request.url);
 if(url.pathname!=='/api/exportar-editorial')return resposta('Não encontrado.',404);
 if(request.method!=='POST')return resposta('Método não permitido.',405);
 if(request.headers.get('Origin')!==url.origin)return resposta('Origem não permitida.',403);
 // Não ativar automaticamente. Esta fase usa somente mocks em testes locais.
 if(config?.habilitado!==true)return resposta('Exportação ainda não ativada.',503);
 if(config.supabaseUrl!==ORIGEM || typeof config.chavePublica!=='string' || !config.chavePublica.startsWith('sb_publishable_') || config.chavePublica!==config.chavePublica.trim())return resposta('Configuração indisponível.',503);
 const controlador=new AbortController();const timer=setTimeout(()=>controlador.abort(),10000);
 // Timeout compatível com Workers: AbortController, sem AbortSignal.timeout().
 const requisitar=(u,opcoes)=>fetchImpl(u,{...opcoes,signal:controlador.signal});
 try{
   const acesso=await autorizar(request,config,requisitar);
   if(!acesso.autorizado)return resposta('Acesso negado ou validação indisponível.',403);
   const r=await requisitar(ORIGEM+'/rest/v1/rpc/capturar_editorial_emergencia',{
     method:'POST',headers:{apikey:config.chavePublica,Authorization:request.headers.get('Authorization'),'Content-Type':'application/json'},
     body:'{}',redirect:'manual',cache:'no-store',
   });
   if(!r.ok || !(r.headers.get('Content-Type')||'').toLowerCase().includes('application/json'))throw Error('Captura indisponível');
   const captura=await lerLimitado(r);
   if(!exatas(captura,['versaoCaptura','capturadoEm','contagens','dados']) || captura.versaoCaptura!==1 || !exatas(captura.contagens,TABELAS) || !exatas(captura.dados,TABELAS))throw Error('Envelope inválido');
   for(const t of TABELAS)if(!Array.isArray(captura.dados[t]) || captura.contagens[t]!==captura.dados[t].length)throw Error('Contagem divergente');
   const pacote=await criarPacote(captura.dados,captura.capturadoEm);
   return new Response(pacote,{headers:{
     'Content-Type':'application/json; charset=utf-8',
     'Content-Disposition':'attachment; filename="snapshot-editorial-incidente.json"',
     'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow',
     'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",
   }});
 }catch{return resposta('Não foi possível gerar um pacote completo. Nenhum download foi confirmado.',503);}
 finally{clearTimeout(timer);}
}
