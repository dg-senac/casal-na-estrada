import {protegerResposta} from './cabecalhos-seguranca.mjs';
import paginaManutencao from './manutencao-template.mjs';
import {statusAgendamento} from './status-agendamento.mjs';
import {verificarPublicacaoAgendada} from './agendamento-publicacao.mjs';
import {publicacaoCloudflare} from './publicacao-cloudflare.mjs';
import {servirConteudoBuildCandidato} from './conteudo-build-candidato.mjs';
import {testarConteudoBuild} from './testar-conteudo-build.mjs';
import {servirMidiaProtegida} from './midia-protegida.mjs';
import {testarOrigemAssinada} from './testar-origem-assinada.mjs';
import {fotosGuardadas} from './fotos-guardadas.mjs';
/** Teste paralelo do site completo. Não é migração do GitHub Pages. */
import painel from '../experiments/emergencia/worker-fotos-teste.mjs';
import {tratarMidiaBackup} from './midia-backup.mjs';
const rotasPainel=new Set(['/login-teste','/api/verificar','/api/emergencia-real','/api/emergencia-teste','/api/reabrir-teste','/api/exportar-editorial','/api/conferir-backup','/api/baixar-backup']);
function manutencao(){const nonce=crypto.randomUUID().replaceAll('-','');return new Response(paginaManutencao.replaceAll('__NONCE__',nonce),{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Retry-After':'300','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':`default-src 'none'; style-src 'nonce-${nonce}'; font-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});}

const worker = {
 async scheduled(event,env,ctx){ctx.waitUntil(verificarPublicacaoAgendada(env));},
 async fetch(request,env){
  // Aceita os nomes já cadastrados pelo usuário no runtime do Worker novo.
  // O painel continua exigindo chave Publishable e sessão administrativa/MFA.
  env={...env,SUPABASE_URL:env.SUPABASE_URL ?? env.PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY:env.SUPABASE_ANON_KEY ?? env.PUBLIC_SUPABASE_ANON_KEY};
  const url=new URL(request.url);
  if(url.pathname==='/api/status-agendamento')return statusAgendamento(request,env);
  if(url.pathname.startsWith('/api/publicacao-cloudflare/'))return publicacaoCloudflare(request,env);
  if(url.pathname==='/api/testar-conteudo-build')return testarConteudoBuild(request,env);
  if(url.pathname==='/api/testar-origem-assinada')return testarOrigemAssinada(request,env);
  if(url.pathname.startsWith('/api/fotos-guardadas/'))return fotosGuardadas(request,env);
  if(['/api/midia-inventario','/api/midia-arquivo'].includes(url.pathname))return tratarMidiaBackup(request,env);
  if(['/_backup-assets.json','/_revisao-publicada.json'].includes(url.pathname))return new Response('Não encontrado.',{status:404,headers:{'Cache-Control':'no-store'}});
  // Rotas mínimas do controle continuam disponíveis mesmo com páginas bloqueadas.
  // /admin original também é bloqueado na manutenção; /login-teste permite reabrir.
  if(rotasPainel.has(url.pathname))return painel.fetch(request,env);
  if(url.pathname.startsWith('/api/'))return new Response('Não encontrado.',{status:404,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
  if(!['GET','HEAD'].includes(request.method))return new Response('Método não permitido.',{status:405,headers:{Allow:'GET, HEAD','Cache-Control':'no-store'}});
  let estado;
  try{estado=await env.DB.prepare('SELECT manutencao FROM estado_site WHERE id = 1').first();}catch{return manutencao();}
  if(estado?.manutencao!==0)return manutencao();
  if(url.pathname==='/conteudo-build.json')return servirConteudoBuildCandidato(request,env);
  if(url.pathname.startsWith('/midia-protegida/'))return servirMidiaProtegida(request,env);
  if(!env.ASSETS)return manutencao();
  try{
   // Consulta vem antes de TODOS os assets. Nunca redireciona/proxy para Pages.
   const resposta=await env.ASSETS.fetch(request);
   const headers=new Headers(resposta.headers);
   headers.set('Cache-Control','no-store');
   if(url.pathname==='/admin'||url.pathname.startsWith('/admin/'))headers.set('X-Robots-Tag','noindex, nofollow');
   else headers.delete('X-Robots-Tag'); // Host adotado como oficial pelo proprietário.
   headers.set('X-Content-Type-Options','nosniff');
   headers.set('Referrer-Policy','strict-origin-when-cross-origin');
   return protegerResposta(new Response(resposta.body,{status:resposta.status,statusText:resposta.statusText,headers}),request,env,true);
  }catch{return manutencao();}
 }
};

export default {
 scheduled: worker.scheduled,
 async fetch(request,env){return protegerResposta(await worker.fetch(request,env),request,env);}
};
