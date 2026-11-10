/**
 * Função de servidor: "publicar o site agora".
 *
 * O site é estático, então cada publicação precisa de um build. O relógio do
 * GitHub Actions (a cada 10 minutos) atrasa muito — às vezes horas — em
 * repositório de pouco movimento. Esta função resolve isso: o painel chama
 * esta rota depois de salvar e o build começa em segundos.
 *
 * Ela guarda o token do GitHub na tabela `config` (inacessível pelo site) e
 * só responde a quem estiver logado no painel — a sessão é conferida aqui
 * dentro (`getUser(jwt)`), então a função roda com verify_jwt desligado no
 * gateway: quem não tiver sessão recebe 401 daqui, sem passar do portão.
 *
 * Ações (POST, corpo JSON):
 *   { "acao": "status" }                 → { configurado: true|false }
 *   { "acao": "publicar" }               → dispara o build
 *   { "acao": "configurar", "token": … } → salva/atualiza o token
 *   { "acao": "desligar" }               → apaga o token
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const REPO = 'dg-senac/casal-na-estrada';
const WORKFLOW = 'deploy.yml';
const REF = 'main';

// Cabeçalhos de CORS bem abertos: esta função é chamada do site (outro domínio)
// e só responde a quem estiver logado (a checagem é feita aqui dentro, com o
// token da sessão). A lista explícita de cabeçalhos quebrava o preflight quando
// a biblioteca do Supabase mandava algum cabeçalho novo — por isso o "*".
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const responder = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

/** Aceita apenas formatos de token do GitHub (clássico ou fino). */
const pareceToken = (valor: string) =>
  /^(github_pat_|ghp_|gho_|ghu_|ghs_)[A-Za-z0-9_]{10,}$/.test(valor);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return responder({ erro: 'Use POST.' }, 405);

  const autorizacao = req.headers.get('Authorization') ?? '';
  if (!autorizacao.toLowerCase().startsWith('bearer ')) {
    return responder({ erro: 'sem_sessao', mensagem: 'Entre no painel primeiro.' }, 401);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !servico) {
    return responder({ erro: 'servidor', mensagem: 'Função sem as variáveis do projeto.' }, 500);
  }

  // 1) Quem está chamando? (só usuário logado pode publicar)
  //    O token vai explícito: getUser(jwt) confere a assinatura e devolve o dono.
  const jwt = autorizacao.replace(/^bearer\s+/i, '').trim();
  const auth = createClient(url, anon, { auth: { persistSession: false } });

  const {
    data: { user },
    error: erroSessao,
  } = await auth.getUser(jwt);

  if (erroSessao || !user) {
    return responder({ erro: 'sem_sessao', mensagem: 'Sessão expirada. Entre de novo.' }, 401);
  }

  // Cliente com visão de servidor: única porta para a tabela de ajustes.
  const admin = createClient(url, servico, { auth: { persistSession: false } });

  let acao = 'publicar';
  let tokenRecebido = '';
  try {
    const corpo = await req.json();
    if (corpo?.acao) acao = String(corpo.acao);
    if (corpo?.token) tokenRecebido = String(corpo.token).trim();
  } catch {
    // corpo vazio = "publicar"
  }

  const tokenSalvo = async () => {
    const { data } = await admin
      .from('config')
      .select('valor')
      .eq('chave', 'github_token')
      .maybeSingle();
    return data?.valor || Deno.env.get('GITHUB_TOKEN') || '';
  };

  // ---------------------------------------------------------------- status
  if (acao === 'status') {
    return responder({ configurado: Boolean(await tokenSalvo()) });
  }

  // ---------------------------------------------------------------- configurar
  if (acao === 'configurar') {
    if (!pareceToken(tokenRecebido)) {
      return responder(
        {
          erro: 'token_invalido',
          mensagem: 'Esse texto não parece um token do GitHub (começa com github_pat_ ou ghp_).',
        },
        400
      );
    }
    const { error } = await admin
      .from('config')
      .upsert({ chave: 'github_token', valor: tokenRecebido, atualizado_em: new Date().toISOString() });
    if (error) return responder({ erro: 'banco', mensagem: error.message }, 500);
    return responder({ ok: true, configurado: true });
  }

  // ---------------------------------------------------------------- desligar
  if (acao === 'desligar') {
    await admin.from('config').delete().eq('chave', 'github_token');
    return responder({ ok: true, configurado: false });
  }

  // ---------------------------------------------------------------- publicar
  if (acao !== 'publicar') return responder({ erro: 'acao_desconhecida' }, 400);

  const token = await tokenSalvo();
  if (!token) {
    return responder(
      {
        erro: 'sem_token',
        mensagem:
          'A publicação automática ainda não está ligada. Configure o token do GitHub no próprio painel.',
      },
      409
    );
  }

  const resposta = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'casal-na-estrada-admin',
      },
      body: JSON.stringify({ ref: REF }),
    }
  );

  if (resposta.status === 204) {
    return responder({ ok: true, mensagem: 'Build disparado. O site entra no ar em cerca de 1 minuto.' });
  }

  const detalhe = (await resposta.text()).slice(0, 300);
  return responder(
    {
      erro: 'github',
      status: resposta.status,
      mensagem:
        resposta.status === 401 || resposta.status === 403
          ? 'O token do GitHub foi recusado. Confira se ele tem permissão de Actions: read and write neste repositório.'
          : 'O GitHub não aceitou o pedido de build.',
      detalhe,
    },
    502
  );
});
