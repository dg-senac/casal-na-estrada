import {autorizar} from './autorizacao.mjs';
const ACOES=Object.freeze({'/api/emergencia-real':'emergencia_real','/api/emergencia-teste':'emergencia_teste','/api/reabrir-teste':'reabrir_teste'});
function respostaControle(texto,status){return new Response(texto,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'}});}
export async function controlarOperacao(request,env,executar,fetchImpl=fetch){
 const url=new URL(request.url),acao=ACOES[url.pathname];
 if(!acao)return executar();
 if(request.method!=='POST')return respostaControle('Método não permitido.',405);
 if(request.headers.get('Origin')!==url.origin)return respostaControle('Origem não permitida.',403);
 if(env.SUPABASE_URL?.replace(/\/$/,'')!=='https://pjglrlullnchqazxpvyn.supabase.co' || !env.SUPABASE_ANON_KEY?.startsWith('sb_publishable_'))return respostaControle('Configuração indisponível.',503);
 const idCliente=request.headers.get('X-Teste-Id');
 if(!idCliente || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(idCliente))return respostaControle('Identificador inválido.',400);
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),10000);let acesso;
 try{acesso=await autorizar(request,{supabaseUrl:'https://pjglrlullnchqazxpvyn.supabase.co',chavePublica:env.SUPABASE_ANON_KEY},(u,o)=>fetchImpl(u,{...o,signal:ac.signal}));}finally{clearTimeout(timer);}
 if(!acesso?.autorizado)return respostaControle('Acesso negado ou validação indisponível.',403);
 const db=env.DB,operacao=crypto.randomUUID();
 try{
  const r=await db.prepare(`UPDATE controle_operacoes SET operacao_id = ?, usuario_id = ?, expira_em = unixepoch() + 120
    WHERE id = 1 AND operacao_id IS NULL`).bind(operacao,acesso.usuarioId).run();
  if(r.meta?.changes!==1)return respostaControle('Outra operação está em andamento ou a trava precisa de conferência. Nenhuma nova ação foi iniciada.',409);
 }catch{return respostaControle('Controle de operações indisponível. Nenhuma ação iniciada; confira a trava no D1.',503);}
 try{
  const r=await db.prepare(`INSERT INTO historico_operacoes (id, operacao_id, usuario_id, acao, resultado)
   SELECT ?, ?, ?, ?, 'iniciada' WHERE (SELECT count(*) FROM historico_operacoes) < 998`).bind(crypto.randomUUID(),operacao,acesso.usuarioId,acao).run();
  if(r.meta?.changes!==1)throw Error('Histórico sem capacidade');
 }catch{
  // Não libera automaticamente se o resultado da gravação for incerto.
  return respostaControle('Histórico indisponível ou cheio. Nenhuma ação iniciada. Trava preservada para conferência no D1.',503);
 }
 let resultado;
 try{resultado=await executar();if(!(resultado instanceof Response))throw Error('Resposta inválida');}
 catch{resultado=respostaControle('A operação terminou sem confirmação. Confira o estado do teste e o histórico antes de repetir.',503);}
 try{
  // D1 batch é transacional: conclusão e liberação devem ocorrer juntas.
  const lote=await db.batch([
   db.prepare(`INSERT INTO historico_operacoes (id, operacao_id, usuario_id, acao, resultado)
    VALUES (?, ?, ?, ?, ?)`).bind(crypto.randomUUID(),operacao,acesso.usuarioId,acao,resultado.ok?'concluida':'falhou'),
   db.prepare('UPDATE controle_operacoes SET operacao_id = NULL, usuario_id = NULL, expira_em = 0 WHERE id = 1 AND operacao_id = ?').bind(operacao),
  ]);
  if(lote.length!==2 || lote.some(r=>!r.success) || lote[1].meta?.changes!==1)throw Error('Conclusão não confirmada');
 }catch{return respostaControle('Resultado da operação ou do histórico sem confirmação. A ação pode ter ocorrido. Confira estado, cópias e trava no D1; não libere a trava sem verificar.',503);}
 return resultado;
}
