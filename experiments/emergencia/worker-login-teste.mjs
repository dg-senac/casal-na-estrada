/** Prova isolada: somente configuração de servidor; nunca recebe URL do cliente. */
async function autorizar(request, config, fetchImpl = fetch) {
  const negado = { autorizado: false };
  if (!config?.supabaseUrl || !config?.chavePublica) return negado;
  const token = request.headers.get('authorization');
  if (!token || !/^Bearer [A-Za-z0-9._~-]+$/.test(token) || token.length > 8192) return negado;
  try {
    const url = new URL(config.supabaseUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return negado;
    const headers = { apikey: config.chavePublica, Authorization: token };
    // Validação remota da sessão; não confia em payload JWT decodificado no cliente.
    const usuario = await fetchImpl(`${url.origin}/auth/v1/user`, {
      headers, redirect: 'manual',
    });
    if (!usuario.ok) return negado;
    const dados = await usuario.json();
    if (typeof dados.id !== 'string' || !dados.id) return negado;
    // RPC existente consulta lista privada e política de MFA no banco.
    const acesso = await fetchImpl(`${url.origin}/rest/v1/rpc/estado_acesso_painel`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: '{}', redirect: 'manual',
    });
    if (!acesso.ok) return negado;
    const estado = await acesso.json();
    if (estado?.autorizado !== true || estado?.mfa_necessario !== false) return negado;
    // Exige AAL2 também no servidor, mesmo que a política atual aceite conta sem fator.
    const partes = token.slice(7).split('.');
    if (partes.length !== 3) return negado;
    const claims = JSON.parse(atob(partes[1].replace(/-/g,'+').replace(/_/g,'/')));
    if (claims.aal !== 'aal2' || claims.sub !== dados.id) return negado;
    return { autorizado: true, usuarioId: dados.id };
  } catch { return negado; }
}

const SUPABASE = 'https://pjglrlullnchqazxpvyn.supabase.co';
function resposta(texto, status = 200, extras = {}) {
  return new Response(texto, {status, headers: {
    'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff', ...extras,
  }});
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Apenas chave publicável aqui: nunca disponibilizar service_role/secret.
    const chave = env.SUPABASE_ANON_KEY;
    if (env.SUPABASE_URL?.replace(/\/$/,'') !== SUPABASE ||
        typeof chave !== 'string' || !chave.startsWith('sb_publishable_') || chave !== chave.trim()) {
      return resposta('Este teste exige a chave pública Publishable sb_publishable_... e a URL configurada.',503);
    }
    if (url.pathname === '/api/verificar') {
      if (request.method !== 'POST') return resposta('Método não permitido.',405);
      if (request.headers.get('Origin') !== url.origin) return resposta('Origem não permitida.',403);
      const acesso = await autorizar(request,{supabaseUrl:SUPABASE,chavePublica:chave});
      return resposta(acesso.autorizado
        ? 'Sucesso: sessão validada, conta administradora autorizada e segundo fator confirmado. Nenhuma alteração foi feita.'
        : 'Acesso negado ou validação indisponível. É necessária uma conta administradora com segundo fator.',acesso.autorizado?200:403);
    }
    if (url.pathname === '/login-teste') {
      const nonce = crypto.randomUUID().replaceAll('-','');
      const config = JSON.stringify({url:SUPABASE,key:chave}).replaceAll('<','\\u003c');
      return resposta(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Login isolado de teste</title>
<h1>Teste de acesso administrativo</h1><p>Não aciona manutenção nem backup. Não altera o site original.</p>
<form id="login"><p><label>E-mail <input id="email" type="email" autocomplete="username" required maxlength="254"></label></p>
<p><label>Senha <input id="senha" type="password" autocomplete="current-password" required maxlength="1024"></label></p><button>Entrar</button></form>
<form id="mfa" hidden><p><label>Código do aplicativo autenticador <input id="codigo" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label></p><button>Validar segundo fator</button></form>
<p id="status" role="status" aria-live="polite"></p><button id="limpar" type="button">Limpar sessão deste teste</button>
<script nonce="${nonce}">
const config=${config};
let token=null, fator=null;
const login=document.getElementById('login'), mfa=document.getElementById('mfa'), status=document.getElementById('status');
function limpar(){token=null;fator=null;login.reset();mfa.reset();login.hidden=false;mfa.hidden=true;}
async function auth(path,body){
 const r=await fetch(config.url+'/auth/v1/'+path,{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),credentials:'omit',cache:'no-store',redirect:'error'});
 if(!r.ok)throw Error('Login ou código recusado, limite de tentativas atingido ou serviço indisponível.');
 return r.json();
}
async function ocupado(form,acao){const b=form.querySelector('button');b.disabled=true;try{await acao();}catch(e){status.textContent=e.message; }finally{b.disabled=false;}}
login.addEventListener('submit',e=>{e.preventDefault();ocupado(login,async()=>{
 const email=document.getElementById('email').value.trim(), password=document.getElementById('senha').value;
 token=null;fator=null;status.textContent='Validando login…';
 try {
 const dados=await auth('token?grant_type=password',{email,password});
 token=dados.access_token;
 if(typeof token!=='string')throw Error('Sessão não recebida.');
 const fatores=(dados.user?.factors||[]).filter(f=>f.status==='verified'&&f.factor_type==='totp');
 if(!fatores.length){token=null;throw Error('Este teste exige segundo fator TOTP já confirmado no admin original.');}
 fator=fatores[0].id;login.hidden=true;mfa.hidden=false;status.textContent='Informe o código do autenticador nesta página. Não envie o código pelo chat.';
 } finally {document.getElementById('senha').value='';}
});});
mfa.addEventListener('submit',e=>{e.preventDefault();ocupado(mfa,async()=>{
 if(!token||!fator)throw Error('Entre novamente.');
 status.textContent='Validando segundo fator…';
 try {
 const desafio=await auth('factors/'+encodeURIComponent(fator)+'/challenge',{});
 const verificado=await auth('factors/'+encodeURIComponent(fator)+'/verify',{challenge_id:desafio.id,code:document.getElementById('codigo').value});
 token=verificado.access_token;
 if(typeof token!=='string')throw Error('Sessão MFA não recebida.');
 const r=await fetch('/api/verificar',{method:'POST',headers:{Authorization:'Bearer '+token},credentials:'omit',cache:'no-store',redirect:'error'});
 status.textContent=await r.text();
 } finally {limpar();}
});});
document.getElementById('limpar').addEventListener('click',()=>{limpar();status.textContent='Credenciais em memória removidas deste teste. Isso não revoga sessões no Supabase.';});
</script></html>`,200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'self' ${SUPABASE}; form-action 'none'; base-uri 'none'; frame-ancestors 'none'`});
    }
    let aberto=false;
    try { const estado=await env.DB.prepare('SELECT manutencao FROM estado_site WHERE id = 1').first(); aberto=estado?.manutencao===0; } catch {}
    return resposta(aberto?'O site de teste está funcionando normalmente.':'O site de teste está em manutenção.',aberto?200:503,aberto?{}:{'Retry-After':'300'});
  }
};
