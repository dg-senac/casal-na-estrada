import {autorizar} from '../experiments/emergencia/autorizacao.mjs';
import {iniciarSnapshotFotos,guardarObjetoSnapshot,lerObjetoSnapshot,verificarObjetoSnapshot,concluirSnapshotFotos} from '../experiments/emergencia/snapshot-fotos.mjs';
import {tratarMidiaBackup} from './midia-backup.mjs';
const projeto='https://pjglrlullnchqazxpvyn.supabase.co';
function resposta(v,status=200){return new Response(typeof v==='string'?v:JSON.stringify(v),{status,headers:{'Content-Type':typeof v==='string'?'text/plain; charset=utf-8':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});}
export async function fotosGuardadas(request,env,fetchImpl=fetch){
 const url=new URL(request.url),acao=url.pathname.split('/').at(-1);
 if(!['iniciar','copiar','concluir','inventario','arquivo'].includes(acao))return resposta('Não encontrado.',404);
 if(request.method!=='POST')return resposta('Método não permitido.',405);
 if(request.headers.get('Origin')!==url.origin)return resposta('Origem não permitida.',403);
 if(env.SUPABASE_URL?.replace(/\/$/,'')!==projeto||!env.SUPABASE_ANON_KEY?.startsWith('sb_publishable_'))return resposta('Configuração indisponível.',503);
 const id=request.headers.get('X-Teste-Id');if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id||''))return resposta('ID inválido.',400);
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),20000);
 const rede=(u,o)=>fetchImpl(u,{...o,signal:ac.signal,redirect:'manual',cache:'no-store'});
 try{
  const acesso=await autorizar(request,{supabaseUrl:projeto,chavePublica:env.SUPABASE_ANON_KEY},rede);
  if(!acesso?.autorizado)return resposta('Acesso negado ou validação indisponível.',403);
  const usuario=acesso.usuarioId,db=env.DB;
  // Não aceitar usuário, manifesto, URL ou bytes vindos do navegador.
  const obter=()=>db.prepare('SELECT manifesto,estado FROM snapshots_fotos WHERE id=? AND usuario_id=?').bind(id,usuario).first();
  const interna=(path,extras={})=>{const u=new URL(path,url.origin);return new Request(u,{method:'POST',headers:{Origin:url.origin,Authorization:request.headers.get('Authorization'),...extras}});};
  if(acao==='iniciar'){
   const anterior=await obter();if(anterior)return resposta({arquivos:JSON.parse(anterior.manifesto),estado:anterior.estado});
   const estado=await db.prepare('SELECT manutencao FROM estado_site WHERE id=1').first();
   if(estado?.manutencao!==1)return resposta('Ative manutenção e copie os cadastros antes das fotos.',409);
   const r=await tratarMidiaBackup(interna('/api/midia-inventario'),env,rede);
   if(!r.ok)throw Error('Inventário indisponível');
   const inventario=await r.json();const arquivos=inventario.arquivos.filter(a=>a.bucket!=='repositorio').map(a=>({nome:a.bucket+'/'+a.caminho,tamanho:a.tamanho}));
   await iniciarSnapshotFotos(db,{id,usuario,arquivos});return resposta({arquivos,estado:'incompleto'});
  }
  const snapshot=await obter();if(!snapshot)return resposta('Cópia de fotos não encontrada para esta conta.',404);
  const arquivos=JSON.parse(snapshot.manifesto);
  if(acao==='concluir')return resposta(await concluirSnapshotFotos(db,{id,usuario}));
  if(acao==='inventario'){
   if(snapshot.estado!=='concluido')return resposta('Cópia incompleta: retome antes de baixar.',409);
   const hashes=await db.prepare('SELECT nome,tamanho,sha256 FROM objetos_snapshot_fotos WHERE snapshot_id=? ORDER BY nome').bind(id).all();
   return resposta({versao:1,estado:snapshot.estado,arquivos:hashes.results});
  }
  let nome;try{nome=decodeURIComponent(request.headers.get('X-Foto-Nome')||'');}catch{return resposta('Nome inválido.',400);}
  if(!arquivos.some(a=>a.nome===nome))return resposta('Arquivo fora do manifesto.',400);
  if(acao==='copiar'){
   // Retomada lê primeiro a cópia independente; não depende da origem se já existe.
   const existe=await db.prepare('SELECT 1 AS sim FROM objetos_snapshot_fotos WHERE snapshot_id=? AND nome=?').bind(id,nome).first();
   if(existe){await verificarObjetoSnapshot(db,{id,usuario,nome});return resposta({verificado:true});}
   const indice=nome.indexOf('/'),bucket=nome.slice(0,indice),caminho=nome.slice(indice+1);
   const r=await tratarMidiaBackup(interna('/api/midia-arquivo',{'X-Midia-Bucket':bucket,'X-Midia-Caminho':encodeURIComponent(caminho)}),env,rede);
   if(!r.ok)throw Error('Origem indisponível');
   const bytes=new Uint8Array(await r.arrayBuffer());await guardarObjetoSnapshot(db,{id,usuario,nome,bytes});
   return resposta({verificado:true});
  }
  if(snapshot.estado!=='concluido')return resposta('Cópia incompleta.',409);
  const objeto=await lerObjetoSnapshot(db,{id,usuario,nome});
  return new Response(objeto.bytes,{headers:{'Content-Type':'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Conteudo-Sha256':objeto.sha256}});
 }catch{return resposta('Cópia das fotos não confirmada. Cadastros e manutenção não foram alterados por esta etapa. Confira tabelas D1, capacidade (3 cópias), limite de 1 MiB por foto/8 MiB por conjunto, sessão ou conectividade. Preserve o ID e retome pelo controle protegido.',503);}
 finally{clearTimeout(timer);}
}
