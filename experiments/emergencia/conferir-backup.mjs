import {autorizar} from './autorizacao.mjs';
import {abrirPacote} from './pacote-editorial.mjs';
function respostaConferencia(texto,status=200){return new Response(texto,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}});}
export async function conferirBackup(request,config,db,fetchImpl=fetch){
 const url=new URL(request.url);
 if(!['/api/conferir-backup','/api/baixar-backup'].includes(url.pathname))return respostaConferencia('Não encontrado.',404);
 if(request.method!=='POST')return respostaConferencia('Método não permitido.',405);
 if(request.headers.get('Origin')!==url.origin)return respostaConferencia('Origem não permitida.',403);
 if(config?.habilitado!==true || config.supabaseUrl!=='https://pjglrlullnchqazxpvyn.supabase.co' || !config.chavePublica?.startsWith('sb_publishable_'))return respostaConferencia('Recurso indisponível.',503);
 const id=request.headers.get('X-Teste-Id');
 if(!id || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id))return respostaConferencia('ID inválido.',400);
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),10000);
 let acesso;
 try{acesso=await autorizar(request,config,(u,o)=>fetchImpl(u,{...o,signal:ac.signal}));}finally{clearTimeout(timer);}
 if(!acesso?.autorizado)return respostaConferencia('Acesso negado ou validação indisponível.',403);
 try{
  const linha=await db.prepare('SELECT pacote, sha256 FROM backups_editoriais_reais WHERE id = ?').bind(id).first();
  if(!linha)return respostaConferencia('Cópia não encontrada.',404);
  if(typeof linha.pacote!=='string' || new TextEncoder().encode(linha.pacote).length>1048576)throw Error('Tamanho inválido');
  const carga=await abrirPacote(linha.pacote); // Recalcula SHA-256 e valida relações/contagens.
  if(JSON.parse(linha.pacote).sha256!==linha.sha256)throw Error('Hash de armazenamento divergente');
  if(url.pathname==='/api/baixar-backup')return new Response(linha.pacote,{headers:{
    'Content-Type':'application/json; charset=utf-8',
    'Content-Disposition':'attachment; filename="snapshot-editorial-d1-'+id+'.json"',
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow',
    'Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",
  }});
  const total=Object.values(carga.contagens).reduce((a,b)=>a+b,0);
  return respostaConferencia('Cópia conferida no D1. Checksum recalculado válido; sete tabelas e relações consistentes. Total: '+total+' registros. ID: '+id+'. Isso não comprova autenticidade contra invasor nem restauração de produção. Não inclui fotos.');
 }catch{return respostaConferencia('Não foi possível validar a cópia armazenada. Não a considere íntegra até investigar. Nenhum dado foi alterado.',503);}
}
