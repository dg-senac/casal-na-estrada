/**
 * Painel do casal (/admin).
 *
 * Script único, sem framework: tela de entrada (e-mail + senha), lista de
 * publicações por seção e formulário de criação/edição com envio de fotos
 * comprimidas no próprio navegador para o Storage do Supabase.
 *
 * A chave usada aqui é a "publishable" (pública). Quem manda no que pode ser
 * escrito são as políticas RLS do banco: só usuário autenticado grava.
 */
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------- configuração

const app = document.getElementById('pn-app');
const cfg = document.getElementById('pn-config');

const ENDERECO = import.meta.env.PUBLIC_SUPABASE_URL || cfg?.dataset.url || '';
const CHAVE = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || cfg?.dataset.chave || '';
const BASE = cfg?.dataset.base || '/';

const supabase =
  ENDERECO && CHAVE
    ? createClient(ENDERECO, CHAVE, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      })
    : null;

// ---------------------------------------------------------------- utilidades

const esc = (valor) =>
  String(valor ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

const hoje = () => new Date().toISOString().slice(0, 10);

const dataBR = (valor) => {
  if (!valor) return '';
  const s = String(valor).slice(0, 10);
  const [a, m, d] = s.split('-');
  return a && m && d ? `${d}/${m}/${a}` : s;
};

const slugDe = (texto, reserva = 'registro') =>
  (texto || reserva)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || reserva;

let toastTimer = null;
function avisar(mensagem, tom = 'ok') {
  document.querySelector('.pn-toast')?.remove();
  const el = document.createElement('div');
  el.className = 'pn-toast';
  el.dataset.tom = tom;
  el.textContent = mensagem;
  document.body.appendChild(el);
  requestAnimationFrame(() => (el.dataset.aberto = 'true'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), tom === 'erro' ? 7000 : 5000);
}

// ---------------------------------------------------------------- publicação

let publicacaoLigada = null; // null = ainda não conferi

/** Passos para ligar o token — aparecem no aviso do topo do painel. */
const PASSOS_TOKEN = `
  <ol>
    <li>
      Abra
      <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">
        github.com/settings/personal-access-tokens/new
      </a>
      — é o "Fine-grained token" do GitHub.
    </li>
    <li><b>Token name</b>: site casal &nbsp;·&nbsp; <b>Expiration</b>: 1 ano (ou sem expirar).</li>
    <li><b>Repository access</b> → <b>Only select repositories</b> → escolha <b>casal-na-estrada</b>.</li>
    <li>
      <b>Repository permissions</b> → <b>Actions</b>: <b>Read and write</b>.
      Não precisa marcar mais nada.
    </li>
    <li>Clique em <b>Generate token</b>, copie o código e cole no campo abaixo.</li>
  </ol>
`;

/** Chama a função de servidor que dispara o build do site. */
/**
 * Chama uma função do banco (RPC) e devolve a resposta já normalizada.
 * Vai pelo mesmo caminho que já salva as publicações — sem CORS, sem porta
 * extra: é o PostgREST respondendo.
 */
async function chamarRpc(nome, args = {}) {
  const { data, error } = await supabase.rpc(nome, args);

  if (error) {
    return {
      ok: false,
      erro: 'rpc',
      mensagem: 'Não consegui falar com o servidor. Confira a internet e tente de novo.',
    };
  }
  if (!data) {
    return { ok: false, erro: 'vazio', mensagem: 'O servidor respondeu vazio.' };
  }

  // A função devolve { ok, ... } como jsonb.
  return data;
}

/** Aviso no topo do painel quando a publicação na hora ainda não está ligada. */
function desenharBanner() {
  const caixa = document.getElementById('pn-faixa');
  if (!caixa) return;

  if (publicacaoLigada !== false) {
    caixa.innerHTML = '';
    return;
  }

  caixa.innerHTML = `
    <div class="pn-aviso pn-aviso--faixa">
      <p>
        <strong>Falta ligar a publicação na hora.</strong> Do jeito que está, o site só
        atualiza quando o relógio do GitHub resolve rodar — e ele atrasa. Ligando aqui,
        cada publicação entra no ar em cerca de 1 minuto, sem você fazer mais nada.
      </p>
      <details>
        <summary>Como ligar (uma vez só, uns 2 minutos)</summary>
        ${PASSOS_TOKEN}
      </details>
      <div class="pn-acoes" style="margin-top:0.8rem">
        <input type="text" id="pn-token" placeholder="github_pat_…" autocomplete="off"
               spellcheck="false" style="flex:1;min-width:220px" />
        <button class="pn-btn" type="button" id="pn-salvar-token">Ligar publicação</button>
      </div>
    </div>
  `;

  document.getElementById('pn-salvar-token').addEventListener('click', async (ev) => {
    const botao = ev.currentTarget;
    const campo = document.getElementById('pn-token');
    const token = campo.value.trim();
    if (!token) {
      avisar('Cole o token do GitHub no campo.', 'erro');
      return;
    }
    botao.disabled = true;
    botao.textContent = 'Ligando…';
    const r = await chamarRpc('definir_token_github', { novo_token: token });
    botao.disabled = false;
    botao.textContent = 'Ligar publicação';
    if (!r.ok) {
      avisar(r.mensagem || 'Não consegui salvar o token.', 'erro');
      return;
    }
    publicacaoLigada = true;
    desenharBanner();
    campo.value = '';
    avisar('Publicação na hora ligada!');
    publicarSite();
  });
}

/** Confere no servidor se a publicação na hora está configurada. */
async function conferirPublicacao() {
  const r = await chamarRpc('status_publicacao');
  publicacaoLigada = Boolean(r.ok && r.configurada);
  desenharBanner();
}

/** Dispara o build e conta o resultado. Devolve true se o build saiu. */
async function publicarSite(prefixo = '') {
  const r = await chamarRpc('publicar_agora');

  if (r.ok) {
    avisar(`${prefixo}Site sendo publicado — em cerca de 1 minuto está no ar.`);
    return true;
  }

  if (r.erro === 'sem_token') {
    publicacaoLigada = false;
    desenharBanner();
    avisar(`${prefixo}Ligue a publicação na hora no aviso do topo do painel.`, 'erro');
    return false;
  }

  avisar(`${prefixo}${r.mensagem ?? 'Não consegui publicar agora.'}`, 'erro');
  return false;
}

// ---------------------------------------------------------------- seções

/**
 * Cada seção descreve a tabela, os campos do formulário e como o item aparece
 * na lista. `filhos` são as tabelas ligadas (fotos extras, vídeos).
 */
const SECOES = {
  diario: {
    tabela: 'posts',
    singular: 'publicação',
    plural: 'publicações',
    aba: 'Diário',
    ordem: { coluna: 'data', asc: false },
    campos: [
      { n: 'titulo', r: 'Título', t: 'texto', req: true },
      { n: 'data', r: 'Data', t: 'data', req: true, col: 3 },
      { n: 'tipo', r: 'Tipo', t: 'select', col: 3, opcoes: [
        ['relato', 'Relato de viagem'],
        ['crônica', 'Crônica'],
        ['notícia', 'Notícia'],
        ['aviso', 'Aviso'],
      ] },
      { n: 'local', r: 'Onde foi', t: 'texto', req: true, col: 4, dica: 'Cidade ou trecho. Ex.: Gravatá' },
      { n: 'uf', r: 'UF', t: 'texto', col: 2, max: 2 },
      { n: 'distancia', r: 'Distância', t: 'texto', col: 3, dica: 'Opcional. Ex.: 186 km' },
      { n: 'tags', r: 'Marcadores', t: 'tags', col: 3, dica: 'Separe por vírgula' },
      { n: 'resumo', r: 'Resumo', t: 'area', req: true, dica: 'Duas frases que aparecem no cartão e na home.' },
      { n: 'capa_url', r: 'Foto de capa', t: 'foto', req: true },
      { n: 'capa_alt', r: 'Descrição da foto', t: 'texto', dica: 'Para quem não enxerga a imagem.' },
      { n: 'corpo', r: 'Texto da publicação', t: 'grande', dica: 'Aceita Markdown: **negrito**, ## subtítulo, - lista. Linha em branco separa parágrafos.' },
      { n: 'video_youtube', r: 'Vídeo do YouTube', t: 'youtube', dica: 'Opcional. Cole o link do vídeo.' },
      { n: 'destaque', r: 'Destacar na home', t: 'sim' },
      { n: 'publicado', r: 'Publicado no site', t: 'sim', padrao: true },
    ],
    resumo: (r) => ({
      titulo: r.titulo,
      meta: `${dataBR(r.data)}${r.local ? ' · ' + r.local : ''}${r.uf ? '/' + r.uf : ''}`,
      foto: r.capa_url,
      link: r.publicado ? `${BASE}diario/${r.slug}/` : null,
    }),
  },

  galeria: {
    tabela: 'albuns',
    singular: 'álbum',
    plural: 'álbuns',
    aba: 'Galeria',
    ordem: { coluna: 'ordem', asc: true },
    campos: [
      { n: 'titulo', r: 'Nome do álbum', t: 'texto', req: true },
      { n: 'data', r: 'Data', t: 'data', req: true, col: 3 },
      { n: 'ordem', r: 'Ordem na galeria', t: 'numero', col: 3, dica: 'Menor aparece primeiro' },
      { n: 'local', r: 'Onde foi', t: 'texto', col: 4 },
      { n: 'capa_url', r: 'Foto de capa', t: 'foto', req: true },
      { n: 'capa_alt', r: 'Descrição da capa', t: 'texto' },
      { n: 'descricao', r: 'Descrição do álbum', t: 'area' },
      { n: 'fotos', r: 'Fotos do álbum', t: 'fotos' },
      { n: 'videos', r: 'Vídeos do álbum', t: 'videos' },
      { n: 'publicado', r: 'Publicado no site', t: 'sim', padrao: true },
    ],
    filhos: {
      fotos: { tabela: 'album_fotos', fk: 'album_id', campos: ['url', 'legenda', 'vertical'] },
      videos: { tabela: 'album_videos', fk: 'album_id', campos: ['titulo', 'youtube', 'credito'] },
    },
    resumo: (r) => ({
      titulo: r.titulo,
      meta: `${dataBR(r.data)}${r.local ? ' · ' + r.local : ''}`,
      foto: r.capa_url,
      link: r.publicado ? `${BASE}galeria/${r.slug}/` : null,
    }),
  },

  trofeus: {
    tabela: 'trofeus',
    singular: 'peça',
    plural: 'peças',
    aba: 'Troféus',
    ordem: { coluna: 'criado_em', asc: false },
    campos: [
      { n: 'evento', r: 'Nome do evento ou da peça', t: 'texto', req: true },
      { n: 'ano', r: 'Ano', t: 'numero', col: 2, dica: 'Deixe vazio se não lembrar' },
      { n: 'data', r: 'Data exata', t: 'data', col: 2 },
      { n: 'edicao', r: 'Edição', t: 'texto', col: 2, dica: 'Ex.: 5ª edição' },
      { n: 'cidade', r: 'Cidade / região', t: 'texto', col: 3 },
      { n: 'categoria', r: 'Categoria', t: 'texto', col: 3 },
      { n: 'nivel', r: 'Colocação', t: 'select', col: 3, opcoes: [
        ['laco', 'Participação'],
        ['ouro', '1º lugar'],
        ['prata', '2º lugar'],
        ['bronze', '3º lugar'],
      ] },
      { n: 'tipo', r: 'Tipo de peça', t: 'select', col: 3, opcoes: [
        ['trofeu', 'Troféu de encontro'],
        ['placa', 'Placa de participação'],
        ['lembranca', 'Lembrança de viagem'],
        ['construcao', 'Feito em casa'],
      ] },
      { n: 'foto_url', r: 'Foto da peça', t: 'foto', req: true },
      { n: 'foto_alt', r: 'Descrição da foto', t: 'texto' },
      { n: 'historia', r: 'A história da peça', t: 'area', req: true, dica: 'Duas a quatro frases: como ela chegou na prateleira.' },
      { n: 'nota', r: 'Frase de destaque', t: 'texto', dica: 'Opcional. Aparece em itálico na página da peça.' },
      { n: 'fotos', r: 'Fotos de detalhe', t: 'fotos' },
      { n: 'destaque', r: 'Destacar na home', t: 'sim' },
      { n: 'publicado', r: 'Publicado no site', t: 'sim', padrao: true },
    ],
    filhos: {
      fotos: { tabela: 'trofeu_fotos', fk: 'trofeu_id', campos: ['url', 'legenda'] },
    },
    slugFonte: 'evento',
    resumo: (r) => ({
      titulo: r.evento,
      meta: `${r.ano || 'sem ano'}${r.cidade ? ' · ' + r.cidade : ''}${r.edicao ? ' · ' + r.edicao : ''}`,
      foto: r.foto_url,
      link: r.publicado ? `${BASE}trofeus/${r.slug}/` : null,
    }),
  },

  encontros: {
    tabela: 'encontros',
    singular: 'encontro',
    plural: 'encontros',
    aba: 'Encontros',
    semSlug: true,
    ordem: { coluna: 'inicio', asc: true },
    campos: [
      { n: 'nome', r: 'Nome do encontro', t: 'texto', req: true },
      { n: 'inicio', r: 'Começa em', t: 'data', req: true, col: 3 },
      { n: 'fim', r: 'Termina em', t: 'data', col: 3 },
      { n: 'cidade', r: 'Cidade', t: 'texto', req: true, col: 4 },
      { n: 'uf', r: 'UF', t: 'texto', col: 2, max: 2 },
      { n: 'local', r: 'Local', t: 'texto', dica: 'Opcional. Ex.: Pátio de Eventos' },
      { n: 'observacao', r: 'Observação', t: 'area', dica: 'Opcional. Aparece embaixo do encontro.' },
      { n: 'confirmado', r: 'Data confirmada', t: 'sim', padrao: true },
      { n: 'publicado', r: 'Publicado no site', t: 'sim', padrao: true },
    ],
    resumo: (r) => ({
      titulo: r.nome,
      meta: `${dataBR(r.inicio)}${r.fim ? ' a ' + dataBR(r.fim) : ''} · ${r.cidade || ''}${r.uf ? '/' + r.uf : ''}`,
      foto: null,
      link: r.publicado ? `${BASE}encontros/` : null,
    }),
  },
};

const ABAS = ['diario', 'galeria', 'trofeus', 'encontros'];

let usuario = null;
let secaoAtual = 'diario';
let editando = null; // registro em edição (ou null para novo)

// ---------------------------------------------------------------- entrada

function telaEntrada(mensagem = '') {
  app.innerHTML = `
    <div class="pn-entrada">
      <div class="pn-entrada__caixa">
        <p class="pn-marca">Casal na Estrada<span>Painel do casal</span></p>
        <p class="pn-sub">Entre com o e-mail e a senha de vocês para publicar no site.</p>
        ${mensagem ? `<p class="pn-aviso">${mensagem}</p>` : ''}
        <form id="pn-login">
          <label class="pn-campo">
            <span>E-mail</span>
            <input type="email" name="email" autocomplete="username" required />
          </label>
          <label class="pn-campo">
            <span>Senha</span>
            <input type="password" name="senha" autocomplete="current-password" required />
          </label>
          <div class="pn-acoes">
            <button class="pn-btn" type="submit">Entrar</button>
            <a class="pn-btn pn-btn--claro" href="${BASE}">Ver o site</a>
          </div>
        </form>
        <p class="pn-esqueci">
          Esqueceu a senha? Fale com quem cuida do site que a gente reabre o acesso.
        </p>
      </div>
    </div>
  `;

  const form = document.getElementById('pn-login');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const botao = form.querySelector('button[type="submit"]');
    botao.disabled = true;
    botao.textContent = 'Entrando…';
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.value.trim(),
      password: form.senha.value,
    });
    botao.disabled = false;
    botao.textContent = 'Entrar';
    if (error) {
      avisar(traduzErro(error.message), 'erro');
    }
  });

}

function traduzErro(mensagem = '') {
  const m = mensagem.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha não conferem.';
  if (m.includes('email not confirmed')) return 'O e-mail ainda não foi confirmado.';
  if (m.includes('signups not allowed') || m.includes('signup is disabled'))
    return 'O cadastro já foi fechado. Use o e-mail e a senha combinados.';
  if (m.includes('user already registered')) return 'Esse e-mail já tem conta. Use "Entrar".';
  if (m.includes('password should be at least')) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (m.includes('failed to fetch') || m.includes('networkerror'))
    return 'Sem conexão com o servidor. Confira a internet e tente de novo.';
  return mensagem;
}

// ---------------------------------------------------------------- painel

function telaPainel() {
  app.innerHTML = `
    <header class="pn-topo">
      <p class="pn-topo__marca">Casal na Estrada <b>Painel</b></p>
      <div class="pn-topo__direita">
        <span class="pn-quem">${esc(usuario?.email ?? '')}</span>
        <button id="pn-publicar" type="button" title="Manda o site para o ar agora">Publicar agora</button>
        <a href="${BASE}">Ver o site</a>
        <button id="pn-sair" type="button">Sair</button>
      </div>
    </header>
    <nav class="pn-abas" id="pn-abas">
      ${ABAS.map(
        (s) =>
          `<button class="pn-aba" type="button" data-aba="${s}" aria-current="${
            s === secaoAtual
          }">${SECOES[s].aba}</button>`
      ).join('')}
    </nav>
    <div class="pn-faixa" id="pn-faixa"></div>
    <main class="pn-area" id="pn-area"></main>
  `;

  document.getElementById('pn-publicar').addEventListener('click', (ev) => {
    const botao = ev.currentTarget;
    botao.disabled = true;
    publicarSite().finally(() => {
      botao.disabled = false;
    });
  });

  document.getElementById('pn-sair').addEventListener('click', async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('cne-admin');
  });

  document.getElementById('pn-abas').addEventListener('click', (ev) => {
    const botao = ev.target.closest('[data-aba]');
    if (!botao) return;
    secaoAtual = botao.dataset.aba;
    editando = null;
    document.querySelectorAll('.pn-aba').forEach((b) => {
      b.setAttribute('aria-current', String(b.dataset.aba === secaoAtual));
    });
    lista();
  });

  lista();
  conferirPublicacao();
}

const area = () => document.getElementById('pn-area');

function carregando(texto = 'Carregando…') {
  area().innerHTML = `<p class="pn-carregando">${esc(texto)}</p>`;
}

// ---------------------------------------------------------------- listagem

async function lista() {
  const cfgSecao = SECOES[secaoAtual];
  carregando();

  const consulta = supabase
    .from(cfgSecao.tabela)
    .select('*')
    .order(cfgSecao.ordem.coluna, { ascending: cfgSecao.ordem.asc });

  const { data, error } = await consulta;
  if (error) {
    area().innerHTML = `<p class="pn-aviso">Não consegui carregar a lista: ${esc(
      error.message
    )}</p>`;
    return;
  }

  const itens = data ?? [];
  area().innerHTML = `
    <div class="pn-cabeca">
      <div>
        <h2>${cfgSecao.aba}</h2>
        <p>${itens.length} ${itens.length === 1 ? cfgSecao.singular : cfgSecao.plural} cadastrad${
          itens.length === 1 ? 'a' : 'as'
        }</p>
      </div>
      <button class="pn-btn" id="pn-novo" type="button">+ Nova ${cfgSecao.singular}</button>
    </div>
    <p class="pn-aviso">
      Salve e o site publica sozinho: em cerca de <strong>1 minuto</strong> já está no ar.
    </p>
    ${
      itens.length === 0
        ? `<p class="pn-vazio">Nada cadastrado ainda. Comece pela primeira ${cfgSecao.singular}.</p>`
        : `<div class="pn-lista">${itens.map((r) => itemHTML(r)).join('')}</div>`
    }
  `;

  document.getElementById('pn-novo').addEventListener('click', () => formulario(null));

  area()
    .querySelectorAll('[data-editar]')
    .forEach((botao) => {
      botao.addEventListener('click', () => {
        const registro = itens.find((r) => String(r.id) === botao.dataset.editar);
        if (registro) formulario(registro);
      });
    });

  area()
    .querySelectorAll('[data-excluir]')
    .forEach((botao) => {
      botao.addEventListener('click', () => excluir(botao.dataset.excluir, botao.dataset.nome));
    });
}

function itemHTML(registro) {
  const cfgSecao = SECOES[secaoAtual];
  const info = cfgSecao.resumo(registro);
  const selo = registro.publicado
    ? ''
    : '<span class="pn-selo pn-selo--rascunho">Fora do ar</span>';
  const link = info.link
    ? `<a class="pn-btn--texto" href="${esc(info.link)}" target="_blank" rel="noopener">ver no site ↗</a>`
    : '';

  return `
    <article class="pn-item">
      ${
        info.foto
          ? `<img class="pn-item__foto" src="${esc(info.foto)}" alt="" loading="lazy" />`
          : `<span class="pn-item__foto"></span>`
      }
      <div class="pn-item__texto">
        <h3>${esc(info.titulo)}${selo}</h3>
        <p>${esc(info.meta)} ${link}</p>
      </div>
      <div class="pn-item__acoes">
        <button class="pn-btn pn-btn--claro" type="button" data-editar="${esc(registro.id)}">Editar</button>
        <button class="pn-btn pn-btn--claro pn-btn--perigo" type="button"
          data-excluir="${esc(registro.id)}" data-nome="${esc(info.titulo)}">Excluir</button>
      </div>
    </article>
  `;
}

async function excluir(id, nome) {
  if (!confirm(`Excluir "${nome}"? Isso não dá para desfazer.`)) return;
  const { error } = await supabase.from(SECOES[secaoAtual].tabela).delete().eq('id', id);
  if (error) {
    avisar(`Não consegui excluir: ${error.message}`, 'erro');
    return;
  }
  lista();
  avisar(
    publicacaoLigada === false
      ? 'Excluído! Ligue a publicação na hora no aviso do topo.'
      : 'Excluído! O site publica sozinho em cerca de 1 minuto.'
  );
}

// ---------------------------------------------------------------- formulário

function campoHTML(campo, valor) {
  const span = campo.col ? ` style="grid-column: span ${campo.col}"` : '';
  const obrigatorio = campo.req ? ' <em>*</em>' : '';
  const dica = campo.dica ? `<small class="pn-dica">${esc(campo.dica)}</small>` : '';
  const v = valor ?? '';

  if (campo.t === 'sim') {
    return `<label class="pn-check"${span}>
      <input type="checkbox" name="${campo.n}" ${valor ? 'checked' : ''} />
      ${esc(campo.r)}
    </label>`;
  }

  let controle = '';
  switch (campo.t) {
    case 'area':
      controle = `<textarea name="${campo.n}" ${campo.req ? 'required' : ''}>${esc(v)}</textarea>`;
      break;
    case 'grande':
      controle = `<textarea class="pn-grande" name="${campo.n}">${esc(v)}</textarea>`;
      break;
    case 'select':
      controle = `<select name="${campo.n}">${campo.opcoes
        .map(
          ([valor2, rotulo]) =>
            `<option value="${valor2}" ${String(v) === valor2 ? 'selected' : ''}>${esc(
              rotulo
            )}</option>`
        )
        .join('')}</select>`;
      break;
    case 'data':
      controle = `<input type="date" name="${campo.n}" value="${esc(
        String(v).slice(0, 10)
      )}" ${campo.req ? 'required' : ''} />`;
      break;
    case 'numero':
      controle = `<input type="number" name="${campo.n}" value="${esc(v)}" ${
        campo.req ? 'required' : ''
      } />`;
      break;
    case 'tags':
      controle = `<input type="text" name="${campo.n}" value="${esc(
        Array.isArray(v) ? v.join(', ') : v
      )}" />`;
      break;
    case 'youtube':
      controle = `<input type="text" name="${campo.n}" value="${esc(v)}" placeholder="https://youtu.be/..." />`;
      break;
    case 'foto':
      return `<div class="pn-campo"${span}>
        <span>${esc(campo.r)}${obrigatorio}</span>
        <div class="pn-upload" data-upload="${campo.n}" data-obrigatorio="${campo.req ? '1' : ''}">
          <div class="pn-upload__previa" data-previa>
            ${
              v
                ? `<img src="${esc(v)}" alt="" />`
                : 'Nenhuma foto escolhida'
            }
          </div>
          <input type="hidden" name="${campo.n}" value="${esc(v)}" />
          <div class="pn-upload__barra" data-barra><i></i></div>
          <div class="pn-acoes">
            <label class="pn-btn pn-btn--claro" style="cursor:pointer">
              ${v ? 'Trocar foto' : 'Escolher foto'}
              <input type="file" accept="image/*" data-arquivo hidden />
            </label>
            <button class="pn-btn--texto" type="button" data-remover-foto ${
              v ? '' : 'hidden'
            }>remover</button>
          </div>
          ${dica}
        </div>
      </div>`;
    case 'fotos':
      return `<div class="pn-secao" data-fotos="${campo.n}">
        <h3>${esc(campo.r)}</h3>
        <div class="pn-fotos" data-lista></div>
        <label class="pn-btn pn-btn--claro" style="cursor:pointer;margin-top:0.6rem">
          + Adicionar fotos
          <input type="file" accept="image/*" multiple data-arquivo hidden />
        </label>
        <div class="pn-upload__barra" data-barra style="margin-top:0.6rem"><i></i></div>
        ${dica}
      </div>`;
    case 'videos':
      return `<div class="pn-secao" data-videos="${campo.n}">
        <h3>${esc(campo.r)}</h3>
        <div class="pn-fotos" data-lista></div>
        <button class="pn-btn pn-btn--claro" type="button" data-add-video style="margin-top:0.6rem">
          + Adicionar vídeo
        </button>
        ${dica}
      </div>`;
    default:
      controle = `<input type="text" name="${campo.n}" value="${esc(v)}" ${
        campo.max ? `maxlength="${campo.max}"` : ''
      } ${campo.req ? 'required' : ''} />`;
  }

  return `<label class="pn-campo"${span}>
    <span>${esc(campo.r)}${obrigatorio}</span>
    ${controle}
    ${dica}
  </label>`;
}

function formulario(registro) {
  const cfgSecao = SECOES[secaoAtual];
  editando = registro;
  const valores = {};
  for (const campo of cfgSecao.campos) {
    if (campo.t === 'sim') {
      valores[campo.n] = registro ? Boolean(registro[campo.n]) : Boolean(campo.padrao);
    } else if (campo.t === 'select') {
      valores[campo.n] = registro?.[campo.n] ?? campo.opcoes[0][0];
    } else if (campo.t === 'numero') {
      valores[campo.n] = registro?.[campo.n] ?? '';
    } else if (campo.t === 'tags') {
      valores[campo.n] = registro?.[campo.n] ?? [];
    } else if (campo.t === 'fotos' || campo.t === 'videos') {
      valores[campo.n] = [];
    } else if (campo.n === 'ordem') {
      valores[campo.n] = registro?.ordem ?? 99;
    } else if (campo.t === 'data') {
      valores[campo.n] = registro?.[campo.n]
        ? String(registro[campo.n]).slice(0, 10)
        : campo.req
          ? hoje()
          : '';
    } else {
      valores[campo.n] = registro?.[campo.n] ?? '';
    }
  }

  area().innerHTML = `
    <div class="pn-cabeca">
      <div>
        <h2>${registro ? 'Editar' : 'Nova'} ${cfgSecao.singular}</h2>
        <p>${registro ? 'Alterações entram no site na próxima atualização.' : 'Preencha os campos e salve.'}</p>
      </div>
      <button class="pn-btn pn-btn--claro" id="pn-voltar" type="button">← Voltar</button>
    </div>
    <form class="pn-form" id="pn-form">
      <div class="pn-grade">
        ${cfgSecao.campos.map((c) => campoHTML(c, valores[c.n])).join('')}
      </div>
      <div class="pn-rodape-form">
        <button class="pn-btn" type="submit">Salvar</button>
        <button class="pn-btn pn-btn--claro" type="button" id="pn-cancelar">Cancelar</button>
        <span class="pn-nota">Ao salvar, o site publica sozinho em cerca de 1 minuto.</span>
      </div>
    </form>
  `;

  document.getElementById('pn-voltar').addEventListener('click', lista);
  document.getElementById('pn-cancelar').addEventListener('click', lista);

  prepararUploads();
  prepararFilhos(registro);

  document.getElementById('pn-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    salvar(ev.currentTarget);
  });
}

// ---------------------------------------------------------------- uploads

/** Reduz a foto no navegador antes de enviar: 1600 px no maior lado, JPEG 82%. */
async function comprimir(arquivo, maxLado = 1600, qualidade = 0.82) {
  if (!arquivo.type.startsWith('image/')) {
    throw new Error('O arquivo precisa ser uma foto (JPG, PNG, WEBP).');
  }
  let bitmap;
  try {
    bitmap = await createImageBitmap(arquivo);
  } catch {
    throw new Error(
      'Não consegui abrir essa foto. Se veio do iPhone em HEIC, exporte como JPG e tente de novo.'
    );
  }
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const largura = Math.max(1, Math.round(bitmap.width * escala));
  const altura = Math.max(1, Math.round(bitmap.height * escala));
  const tela = document.createElement('canvas');
  tela.width = largura;
  tela.height = altura;
  tela.getContext('2d').drawImage(bitmap, 0, 0, largura, altura);
  const blob = await new Promise((ok) => tela.toBlob(ok, 'image/jpeg', qualidade));
  if (!blob) throw new Error('Não consegui preparar a imagem para envio.');
  return blob;
}

async function enviarFoto(arquivo, pasta) {
  const blob = await comprimir(arquivo);
  const nome = `${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
  const { error } = await supabase.storage.from('midia').upload(nome, blob, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw new Error(`Falha ao enviar a foto: ${error.message}`);
  const { data } = supabase.storage.from('midia').getPublicUrl(nome);
  return data.publicUrl;
}

const nomeDaPasta = () => {
  const campo = SECOES[secaoAtual].slugFonte || 'titulo';
  const titulo = document.querySelector(`[name="${campo}"]`)?.value || '';
  return `${secaoAtual}/${slugDe(titulo, 'sem-nome')}`;
};

function progresso(barra, fracao) {
  if (!barra) return;
  barra.dataset.ativo = 'true';
  barra.querySelector('i').style.width = `${Math.round(fracao * 100)}%`;
}

function prepararUploads() {
  document.querySelectorAll('[data-upload]').forEach((bloco) => {
    const input = bloco.querySelector('[data-arquivo]');
    const oculto = bloco.querySelector('input[type="hidden"]');
    const previa = bloco.querySelector('[data-previa]');
    const barra = bloco.querySelector('[data-barra]');
    const remover = bloco.querySelector('[data-remover-foto]');

    input.addEventListener('change', async () => {
      const arquivo = input.files?.[0];
      if (!arquivo) return;
      try {
        progresso(barra, 0.15);
        const url = await enviarFoto(arquivo, nomeDaPasta());
        progresso(barra, 1);
        oculto.value = url;
        previa.innerHTML = `<img src="${esc(url)}" alt="" />`;
        if (remover) remover.hidden = false;
        avisar('Foto enviada.');
      } catch (erro) {
        avisar(erro.message, 'erro');
      } finally {
        setTimeout(() => {
          barra.dataset.ativo = 'false';
          progresso(barra, 0);
        }, 600);
        input.value = '';
      }
    });

    remover?.addEventListener('click', () => {
      oculto.value = '';
      previa.textContent = 'Nenhuma foto escolhida';
      remover.hidden = true;
    });
  });
}

/** Fotos extras e vídeos: listas dinâmicas. */
function prepararFilhos(registro) {
  const cfgSecao = SECOES[secaoAtual];

  const blocoFotos = document.querySelector('[data-fotos]');
  if (blocoFotos) {
    const listaFotos = blocoFotos.querySelector('[data-lista]');
    const input = blocoFotos.querySelector('[data-arquivo]');
    const barra = blocoFotos.querySelector('[data-barra]');

    const adicionarLinha = (url, legenda = '', vertical = false) => {
      const linha = document.createElement('div');
      linha.className = 'pn-foto-item';
      linha.dataset.url = url;
      linha.dataset.vertical = vertical ? '1' : '';
      linha.innerHTML = `
        <img src="${esc(url)}" alt="" />
        <div>
          <input type="text" data-legenda placeholder="Legenda (opcional)" value="${esc(legenda)}" />
          ${
            cfgSecao.filhos?.fotos?.campos?.includes('vertical')
              ? `<label class="pn-check" style="margin:0.35rem 0 0">
                   <input type="checkbox" data-eh-vertical ${vertical ? 'checked' : ''} /> foto em pé
                 </label>`
              : ''
          }
          <small>${esc(url.split('/').pop())}</small>
        </div>
        <button class="pn-btn--texto" type="button" data-tirar>remover</button>
      `;
      linha.querySelector('[data-tirar]').addEventListener('click', () => linha.remove());
      listaFotos.appendChild(linha);
    };

    if (registro && cfgSecao.filhos?.fotos) {
      supabase
        .from(cfgSecao.filhos.fotos.tabela)
        .select('*')
        .eq(cfgSecao.filhos.fotos.fk, registro.id)
        .order('ordem')
        .then(({ data: linhas }) => {
          (linhas ?? []).forEach((l) => adicionarLinha(l.url, l.legenda ?? '', l.vertical));
        });
    }

    input.addEventListener('change', async () => {
      const arquivos = [...(input.files ?? [])];
      if (!arquivos.length) return;
      let feitas = 0;
      for (const arquivo of arquivos) {
        try {
          progresso(barra, feitas / arquivos.length);
          const url = await enviarFoto(arquivo, nomeDaPasta());
          adicionarLinha(url);
        } catch (erro) {
          avisar(erro.message, 'erro');
        }
        feitas += 1;
        progresso(barra, feitas / arquivos.length);
      }
      setTimeout(() => {
        barra.dataset.ativo = 'false';
        progresso(barra, 0);
      }, 600);
      input.value = '';
    });
  }

  const blocoVideos = document.querySelector('[data-videos]');
  if (blocoVideos) {
    const listaVideos = blocoVideos.querySelector('[data-lista]');

    const adicionarVideo = (titulo = '', youtube = '', credito = '') => {
      const linha = document.createElement('div');
      linha.className = 'pn-video-item';
      linha.innerHTML = `
        <input type="text" data-v-titulo placeholder="Título do vídeo" value="${esc(titulo)}" />
        <input type="text" data-v-youtube placeholder="Link do YouTube" value="${esc(youtube)}" />
        <button class="pn-btn--texto" type="button" data-tirar>remover</button>
        <input type="text" data-v-credito placeholder="Quem gravou (opcional)" value="${esc(credito)}" />
      `;
      linha.querySelector('[data-tirar]').addEventListener('click', () => linha.remove());
      listaVideos.appendChild(linha);
    };

    if (registro && cfgSecao.filhos?.videos) {
      supabase
        .from(cfgSecao.filhos.videos.tabela)
        .select('*')
        .eq(cfgSecao.filhos.videos.fk, registro.id)
        .order('ordem')
        .then(({ data: linhas }) => {
          (linhas ?? []).forEach((l) => adicionarVideo(l.titulo, l.youtube ?? '', l.credito ?? ''));
        });
    }

    blocoVideos.querySelector('[data-add-video]').addEventListener('click', () => adicionarVideo());
  }
}

// ---------------------------------------------------------------- salvar

async function salvar(form) {
  const cfgSecao = SECOES[secaoAtual];
  const botao = form.querySelector('button[type="submit"]');
  const dados = {};

  for (const campo of cfgSecao.campos) {
    if (campo.t === 'fotos' || campo.t === 'videos') continue;

    if (campo.t === 'sim') {
      dados[campo.n] = form.querySelector(`[name="${campo.n}"]`).checked;
      continue;
    }

    const entrada = form.querySelector(`[name="${campo.n}"]`);
    let valor = entrada?.value?.trim?.() ?? '';

    if (campo.req && !valor) {
      avisar(`Falta preencher: ${campo.r}`, 'erro');
      entrada?.focus();
      return;
    }

    if (campo.t === 'tags') {
      dados[campo.n] = valor
        ? valor.split(',').map((t) => t.trim()).filter(Boolean)
        : [];
      continue;
    }
    if (campo.t === 'numero') {
      // "ordem" é NOT NULL no banco: vazio volta para o padrão (fim da lista).
      if (valor === '' && campo.n === 'ordem') dados[campo.n] = 99;
      else dados[campo.n] = valor === '' ? null : Number(valor);
      continue;
    }
    dados[campo.n] = valor === '' ? null : valor;
  }

  if (!cfgSecao.semSlug) {
    const fonte = cfgSecao.slugFonte || 'titulo';
    dados.slug = editando?.slug || slugDe(dados[fonte], 'registro');
  }

  // campos obrigatórios que aceitam nulo no banco
  if (dados.uf) dados.uf = dados.uf.toUpperCase().slice(0, 2);

  botao.disabled = true;
  botao.textContent = 'Salvando…';

  let id = editando?.id ?? null;
  let erro = null;

  if (editando) {
    const resposta = await supabase
      .from(cfgSecao.tabela)
      .update(dados)
      .eq('id', editando.id);
    erro = resposta.error;
  } else {
    const resposta = await supabase.from(cfgSecao.tabela).insert(dados).select('id').single();
    erro = resposta.error;
    id = resposta.data?.id ?? null;
  }

  if (erro) {
    botao.disabled = false;
    botao.textContent = 'Salvar';
    avisar(
      erro.code === '23505'
        ? 'Já existe um item com esse endereço (slug). Mude o título.'
        : `Não consegui salvar: ${erro.message}`,
      'erro'
    );
    return;
  }

  // filhos: apaga e grava de novo (mais simples de manter do que sincronizar)
  for (const [chave, def] of Object.entries(cfgSecao.filhos ?? {})) {
    const container =
      chave === 'fotos' ? document.querySelector('[data-fotos] [data-lista]') : null;
    const containerVideos =
      chave === 'videos' ? document.querySelector('[data-videos] [data-lista]') : null;

    if (chave === 'fotos' && container) {
      const linhas = [...container.querySelectorAll('.pn-foto-item')].map((linha, i) => ({
        [def.fk]: id,
        url: linha.dataset.url,
        legenda: linha.querySelector('[data-legenda]').value.trim() || null,
        vertical: Boolean(linha.querySelector('[data-eh-vertical]')?.checked),
        ordem: i + 1,
      }));
      await supabase.from(def.tabela).delete().eq(def.fk, id);
      if (linhas.length) {
        const { error } = await supabase.from(def.tabela).insert(linhas);
        if (error) avisar(`Salvei o álbum, mas as fotos falharam: ${error.message}`, 'erro');
      }
    }

    if (chave === 'videos' && containerVideos) {
      const linhas = [...containerVideos.querySelectorAll('.pn-video-item')]
        .map((linha, i) => ({
          [def.fk]: id,
          titulo: linha.querySelector('[data-v-titulo]').value.trim(),
          youtube: linha.querySelector('[data-v-youtube]').value.trim() || null,
          credito: linha.querySelector('[data-v-credito]').value.trim() || null,
          ordem: i + 1,
        }))
        .filter((l) => l.titulo);
      await supabase.from(def.tabela).delete().eq(def.fk, id);
      if (linhas.length) {
        const { error } = await supabase.from(def.tabela).insert(linhas);
        if (error) avisar(`Salvei o álbum, mas os vídeos falharam: ${error.message}`, 'erro');
      }
    }
  }

  botao.disabled = false;
  botao.textContent = 'Salvar';
  lista();
  avisar(
    publicacaoLigada === false
      ? 'Salvo! Ligue a publicação na hora no aviso do topo para o site atualizar agora.'
      : 'Salvo! O site publica sozinho em cerca de 1 minuto.'
  );
}

// ---------------------------------------------------------------- início

if (!supabase) {
  app.innerHTML = `<div class="pn-entrada"><div class="pn-entrada__caixa">
    <p class="pn-marca">Casal na Estrada<span>Painel do casal</span></p>
    <p class="pn-aviso">O painel está fora do ar no momento. Avise quem cuida do site
    que a gente resolve.</p>
    <a class="pn-btn" href="${BASE}">Voltar para o site</a>
  </div></div>`;
} else {
  supabase.auth.getSession().then(({ data }) => {
    usuario = data.session?.user ?? null;
    if (usuario) {
      localStorage.setItem('cne-admin', '1');
      telaPainel();
    } else {
      localStorage.removeItem('cne-admin');
      telaEntrada();
    }
  });

  supabase.auth.onAuthStateChange((_evento, sessao) => {
    const antes = Boolean(usuario);
    usuario = sessao?.user ?? null;
    if (usuario) {
      localStorage.setItem('cne-admin', '1');
      if (!document.querySelector('.pn-topo')) telaPainel();
    } else {
      localStorage.removeItem('cne-admin');
      if (antes) telaEntrada('Você saiu do painel.');
      else if (!document.querySelector('.pn-entrada')) telaEntrada();
    }
  });
}
