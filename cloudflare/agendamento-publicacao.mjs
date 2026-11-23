import {servirConteudoBuildCandidato} from './conteudo-build-candidato.mjs';
import {lerRespostaConteudo} from '../src/lib/conteudo-build.js';
import {revisaoPublicada,diaRecife} from './revisao-publicada.mjs';
import {hookPermitido} from './publicacao-cloudflare.mjs';
const aberto=async env=>(await env.DB.prepare('SELECT manutencao FROM estado_site WHERE id=1').first())?.manutencao===0;
/** Sem rota HTTP. Disabled por padrão, mesmo se scheduled for invocado. */
async function executarVerificacao(env,{buscar=fetch,agora=Date.now()}={}){
 if(env.AGENDAMENTO_PUBLICACAO!=='1')return 'desativado';
 try{
  if(!hookPermitido(env.CLOUDFLARE_DEPLOY_HOOK_URL))return 'sem-configuracao';
  if(!await aberto(env))return 'manutencao';
  const ref=await env.ASSETS.fetch(new Request('https://interno.invalid/_revisao-publicada.json'));
  if(ref.status!==200)return 'sem-referencia';
  const texto=await ref.text();if(texto.length>1024)return 'referencia-invalida';
  const manifesto=JSON.parse(texto);
  if(manifesto.versao!==1||!/^[a-f0-9]{64}$/.test(manifesto.hash))return 'referencia-invalida';
  const conteudo=await lerRespostaConteudo(await servirConteudoBuildCandidato(new Request('https://interno.invalid/conteudo-build.json'),env,buscar));
  const atual=await revisaoPublicada(conteudo,agora);
  if(atual.hash===manifesto.hash)return 'atualizado';
  if(!await aberto(env))return 'manutencao';
  // Tentativa não é confirmação. O único baseline é o manifesto do ASSETS atual.
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS publicacao_cloudflare (id INTEGER PRIMARY KEY CHECK(id=1), solicitado_em INTEGER NOT NULL DEFAULT 0)').run();
  await env.DB.prepare('INSERT OR IGNORE INTO publicacao_cloudflare(id) VALUES(1)').run();
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS agendamento_publicacao (id INTEGER PRIMARY KEY CHECK(id=1), dia TEXT NOT NULL, tentativas INTEGER NOT NULL DEFAULT 0, ultima INTEGER NOT NULL DEFAULT 0)').run();
  await env.DB.prepare("INSERT OR IGNORE INTO agendamento_publicacao(id,dia) VALUES(1,'')").run();
  const segundos=Math.floor(agora/1000),dia=diaRecife(agora);
  const reserva=await env.DB.prepare(`UPDATE agendamento_publicacao SET dia=?,tentativas=CASE WHEN dia=? THEN tentativas+1 ELSE 1 END,ultima=? WHERE id=1 AND ultima<=?-3600 AND (dia<>? OR tentativas<4)`).bind(dia,dia,segundos,segundos,dia).run();
  if(reserva.meta?.changes!==1)return 'limite-ou-espera';
  const trava=await env.DB.prepare('UPDATE publicacao_cloudflare SET solicitado_em=unixepoch() WHERE id=1 AND solicitado_em<=unixepoch()-60').run();
  if(trava.meta?.changes!==1)return 'solicitacao-recente';
  if(!await aberto(env))return 'manutencao';
  const r=await buscar(env.CLOUDFLARE_DEPLOY_HOOK_URL,{method:'POST',redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000)});
  // Não confiar em resposta para atualizar baseline. Próxima execução confere ASSETS.
  try{await r.body?.cancel();}catch{}
  return r.status>=200&&r.status<300?'tentativa-enviada':'tentativa-sem-confirmacao';
 }catch{return 'indisponivel';}
}

export const RESULTADOS_AGENDAMENTO=new Set(['desativado','sem-configuracao','manutencao','sem-referencia','referencia-invalida','atualizado','limite-ou-espera','solicitacao-recente','tentativa-enviada','tentativa-sem-confirmacao','indisponivel']);
export async function verificarPublicacaoAgendada(env,opcoes={}){
 const resultado=await executarVerificacao(env,opcoes);
 // Só último resultado, sem conteúdo, URL, sessão ou histórico crescente.
 try{
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS status_agendamento (id INTEGER PRIMARY KEY CHECK(id=1), verificado_em INTEGER NOT NULL, resultado TEXT NOT NULL)').run();
  await env.DB.prepare('INSERT INTO status_agendamento(id,verificado_em,resultado) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET verificado_em=excluded.verificado_em,resultado=excluded.resultado WHERE excluded.verificado_em>=status_agendamento.verificado_em').bind(Math.floor((opcoes.agora??Date.now())/1000),resultado).run();
 }catch{ /* Falha D1 não pode produzir sucesso de gravação fictício. Consulta mostrará registro antigo/ausente. */ }
 return resultado;
}
