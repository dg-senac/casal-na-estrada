import {downloadEditorial} from './download-editorial.mjs';
import {autorizar} from './autorizacao.mjs';
import {abrirPacote} from './pacote-editorial.mjs';
function retorno(texto,status=200){return new Response(texto,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}});}
export async function emergenciaReal(request,config,db,fetchImpl=fetch){
 const url=new URL(request.url);
 if(url.pathname!=='/api/emergencia-real')return retorno('Não encontrado.',404);
 if(request.method!=='POST')return retorno('Método não permitido.',405);
 if(request.headers.get('Origin')!==url.origin)return retorno('Origem não permitida.',403);
 if(config?.habilitado!==true)return retorno('Recurso ainda não ativado.',503);
 if(config.supabaseUrl!=='https://pjglrlullnchqazxpvyn.supabase.co' || !config.chavePublica?.startsWith('sb_publishable_'))return retorno('Configuração indisponível.',503);
 const id=request.headers.get('X-Teste-Id');
 if(!id || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id))return retorno('Identificador inválido.',400);
 const ac=new AbortController();const timer=setTimeout(()=>ac.abort(),10000);
 let acesso;
 try{acesso=await autorizar(request,config,(u,o)=>fetchImpl(u,{...o,signal:ac.signal}));}finally{clearTimeout(timer);}
 if(!acesso?.autorizado)return retorno('Acesso negado ou validação indisponível.',403);
 try{
   const r=await db.prepare('UPDATE estado_site SET manutencao = 1, atualizado_em = CURRENT_TIMESTAMP WHERE id = 1').run();
   if(r.meta?.changes!==1)throw Error('Estado ausente');
 }catch{return retorno('Não foi possível confirmar a manutenção. Confira o estado no D1. Backup não iniciado.',503);}
 // A partir daqui nenhuma falha reabre o ambiente.
 try{
   const anterior=await db.prepare('SELECT id, sha256 FROM backups_editoriais_reais WHERE id = ?').bind(id).first();
   if(anterior)return retorno('Manutenção do TESTE ativa. Cópia editorial real já armazenada para esta tentativa. ID: '+id);
   const capacidade=await db.prepare('SELECT count(*) AS total FROM backups_editoriais_reais').first();
   if(!capacidade || Number(capacidade.total)>=5)throw Error('Limite de cópias');
   const endpoint=new URL('/api/exportar-editorial',url.origin);
   const captura=await downloadEditorial(new Request(endpoint,{method:'POST',headers:{Origin:url.origin,Authorization:request.headers.get('Authorization')}}),config,fetchImpl);
   if(!captura.ok)throw Error('Captura indisponível');
   const texto=await captura.text();
   if(new TextEncoder().encode(texto).length>1048576)throw Error('Limite de tamanho');
   await abrirPacote(texto);
   const hash=JSON.parse(texto).sha256;
   // Uma instrução condicional mantém o teto mesmo entre requisições concorrentes.
   // Não sobrescreve nem remove cópias anteriores.
   await db.prepare(`INSERT OR IGNORE INTO backups_editoriais_reais (id, usuario_id, pacote, sha256)
     SELECT ?, ?, ?, ? WHERE (SELECT count(*) FROM backups_editoriais_reais) < 5`).bind(id,acesso.usuarioId,texto,hash).run();
   const salvo=await db.prepare('SELECT id, sha256 FROM backups_editoriais_reais WHERE id = ?').bind(id).first();
   if(!salvo)throw Error('Gravação não confirmada');
   return retorno('Manutenção do TESTE ativa. Pacote dos cadastros REAIS armazenado no D1. Não inclui fotos. ID: '+id);
 }catch{return retorno('Manutenção do TESTE ativa, mas o backup editorial real NÃO foi confirmado. O teste continua bloqueado. Verifique captura, tabela, limite de 5 cópias ou espaço. ID: '+id,503);}
}
