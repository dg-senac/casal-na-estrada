# Casal na Estrada

Site de recordações de **Cieri e Milla** — casal de Recife que roda o Brasil de moto desde 2013.
Diário de viagem, galeria de fotos e vídeos, sala de troféus e agenda de encontros.

Feito com **Astro 5**, publicado como site estático no GitHub Pages. O conteúdo
(diário, galeria, troféus, encontros) mora no **Supabase** e é editado pelo painel
**`/admin`**; ao salvar, o painel dispara o build e o site entra no ar em cerca de 1 minuto.

---

## Rodando na sua máquina

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # gera o site final em dist/
npm run preview  # confere o resultado do build
```

O build conversa com o Supabase, então precisa das duas variáveis abaixo (crie um
`.env` na raiz — ele não vai para o repositório):

```env
PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...   # chave anon/publishable do projeto
```

A chave é a pública do projeto (a **anon** legada ou a **publishable**): é a mesma que
qualquer visitante vê no navegador — ela só lê conteúdo publicado e só grava com alguém
logado. A `service_role` nunca entra aqui.

### Rodar sem acesso ao banco

Para mexer no layout sem internet, use os dados de exemplo:

```bash
DADOS_FIXTURE=scripts/dados-exemplo.json npm run dev
```

---

## O painel — `/admin`

Não existe link para o painel em nenhum menu: ele é acessado digitando
`https://dg-senac.github.io/casal-na-estrada/admin`.

- **Uma conta só, compartilhada pelos três.** Não há perfis nem permissões diferentes:
  quem entra pode publicar, editar e excluir tudo.
- Na primeira vez, use **“Primeiro acesso: criar a conta do casal”**, escolha o e-mail e
  a senha combinados — e avise para que o cadastro público seja desligado no Supabase
  (depois disso, `signUp` fica bloqueado e só essa conta entra).
- Depois de logado, o painel abre em Diário / Galeria / Troféus / Encontros, com lista e
  formulário para criar, editar e excluir. Fora do painel, o site ganha uma **faixa preta
  no topo** com atalhos — ela só aparece no navegador que já entrou.
- **Fotos são comprimidas no próprio navegador** (1600 px no maior lado, JPEG ~82%) antes
  de subir para o bucket `midia`. Não precisa reduzir nada na mão.
- **Vídeo é opcional**: no diário e nos álbuns dá para colar um link do YouTube.
- Quem está logado vê o site normal; o painel é só o lugar de editar.
- **Ao salvar, o site publica sozinho** — em cerca de 1 minuto. O painel dispara o
  build por uma função no servidor (`publicar`), sem ninguém precisar ir ao GitHub.

### Fotos: sem corte e na cor original

- **Nenhuma foto é cortada.** Quando a imagem carrega, o script em
  `src/layouts/Base.astro` entrega à moldura a proporção real dela — foto tirada
  em pé aparece em pé, inteira; foto deitada aparece deitada. As proporções fixas
  do CSS (16/9, 4/3, 4/5…) valem só como reserva de espaço enquanto a foto não
  chegou (e como fallback se o JavaScript estiver desligado).
- **Cor original, sem filtro.** O site nasceu em preto e branco no layout; as
  fotos agora saem como vieram da câmera. A única exceção é o emblema do rodapé,
  que é logo (filtro faz parte do desenho).
- Exceções propositais: as capas em mosaico da home (com texto por cima) e a
  moldura do emblema continuam recortadas de propósito, para a composição fechar.

### Publicação na hora (o gatilho no banco)

O GitHub só roda `schedule` "quando dá": em repositório de pouco movimento ele pode
levar **horas** entre uma execução e outra. Por isso o site não depende disso.

1. Ao salvar (ou excluir) no painel, um **gatilho do Postgres** percebe a mudança em
   `posts`, `albuns`, `album_fotos`, `album_videos`, `trofeus`, `trofeu_fotos` ou
   `encontros`.
2. O gatilho chama `public.envia_build()`, que lê o token do GitHub da tabela `config`
   (RLS ligada, **sem** política — nada disso é legível pelo site) e faz o POST em
   `workflow_dispatch` usando **pg_net**, de dentro do banco.
3. O build roda, o Pages publica, e em ~1 minuto a publicação está no ar.

Nada disso passa pelo navegador: o mesmo caminho que salva a publicação (o PostgREST)
já basta. O gatilho tem um freio de 20 segundos para não disparar vários builds quando
um formulário grava em mais de uma tabela, e nunca falha o salvamento se o GitHub
estiver fora do ar.

O painel guarda e confere o token por funções RPC (`definir_token_github`,
`status_publicacao`) e o botão **"Publicar agora"** chama `publicar_agora()`.

**Ligar isso é uma vez só.** No topo do painel aparece um aviso com o passo a passo:
criar um *fine-grained token* no GitHub (só o repositório `casal-na-estrada`, permissão
**Actions: read and write**) e colar no campo. O token fica no banco, nunca no código
nem no navegador de quem visita o site. Para apagar: `public.definir_token_github('')`.

Sem o token configurado, o painel continua funcionando: só avisa que a publicação vai
depender do relógio do GitHub (o `schedule` de 10 em 10 minutos).

Também existe o botão **"Publicar agora"** no topo do painel, para forçar um build
(fora do fluxo de salvar).

---

## Onde mexer em cada coisa

| O que você quer mudar | Onde |
| --- | --- |
| Conteúdo (posts, álbuns, troféus, encontros) | painel `/admin` |
| Nome, WhatsApp, Instagram, e-mail, ano de início | `src/data/site.ts` |
| Cores, fontes, espaçamentos (tudo) | `src/styles/global.css` |
| Menu e rodapé | `src/components/Header.astro`, `src/components/Footer.astro` |
| Textos da página "O Casal" | `src/pages/sobre.astro` |
| Textos da home | `src/pages/index.astro` |
| Links e caminhos de imagem no código | `src/lib/url.ts` (função `url()`) |
| Tabelas, formulários e regras do painel | `src/scripts/admin.js` |
| Gatilho que dispara o build | funções `envia_build` / `disparar_publicacao` no banco |

---

## Como o site é montado

O site continua **estático** — nada de servidor. No build:

1. `src/lib/supabase.ts` consulta a API REST do Supabase com a chave publishable;
2. `src/lib/dados.ts` transforma as linhas em objetos (`Post`, `Album`, `Trofeu`, `Encontro`)
   e guarda o resultado em cache, uma consulta por tabela por build;
3. as páginas de `src/pages/` montam o HTML, e o `deploy.yml` publica em `dist/`.

Se as variáveis de ambiente faltarem ou o banco não responder, **o build falha de
propósito**: é melhor não publicar nada do que publicar um site vazio por cima do que já
está no ar.

**Tabelas:** `posts`, `albuns` (+ `album_fotos`, `album_videos`), `trofeus` (+ `trofeu_fotos`),
`encontros`. O que tem `publicado = true` aparece no site; o resto fica salvo fora do ar.
Todas as imagens ficam no bucket público `midia` (10 MB por arquivo, jpg/png/webp/avif).

### Sala de troféus

A página monta tudo sozinha a partir do banco:

- agrupa as peças **por ano**, da mais recente para a mais antiga ("Sem data" no fim);
- monta o índice de anos no topo e a contagem de troféus, placas e lembranças;
- troca a etiqueta de cada peça conforme a `colocação` e o `tipo`
  (troféu · placa · lembrança · feito em casa);
- atualiza o número de "peças na sala" no painel da home.

O texto de **história** aparece no cartão e na página da peça; quem quiser contar mais
escreve em Markdown num campo separado (aparece como "A história completa").

---

## Segurança

- **RLS ligado em todas as tabelas:** visitante anônimo lê só o que está publicado;
  escrever exige login.
- O painel usa a chave pública do projeto — ela é pública por definição. Quem protege os dados
  são as políticas do banco, não o segredo da chave.
- **Cadastro desligado** no Supabase depois da criação da primeira conta
  (Authentication → Providers → Email → *Allow new users to sign up* = off).
- A conta é compartilhada de propósito: os três usam o mesmo e-mail e senha. Se trocarem
  a senha, é por ali também (Authentication → Users).

---

## O que ainda vale preencher com dados reais

- [ ] WhatsApp, e-mail e Instagram em `src/data/site.ts` (hoje estão com valores de exemplo)
- [ ] Texto novo da página "O Casal" (o atual é rascunho)
- [ ] Foto real do casal na home (hoje é o emblema)
- [ ] Revisar as histórias dos troféus: as primeiras foram escritas a partir da data e do
      nome gravado em cada peça — ajustem com o que lembram da viagem
- [ ] Cidade de algumas peças que só têm o estado (Coletamento dos Estradeiros do Rei,
      Moto Culto, aniversários das Estradeiras)
- [ ] Domínio final em `astro.config.mjs` (`site:`) — usado no sitemap e nos links absolutos

---

## Deploy

### GitHub Pages (é o que está em uso)

O workflow `.github/workflows/deploy.yml` publica o site:

- a cada push na `main`;
- **de 10 em 10 minutos**, só como rede de segurança (veja abaixo por quê);
- na mão, em **Actions → Publicar no GitHub Pages → Run workflow**.

Passos, se um dia precisar refazer: **Settings → Pages → Source: GitHub Actions**; o
endereço sai como `https://SEU-USUARIO.github.io/casal-na-estrada/`.

O workflow descobre o endereço sozinho e passa `SITE_BASE=/casal-na-estrada/` no build,
para que links, imagens e CSS funcionem dentro da subpasta.

As credenciais do Supabase vão no passo **Build** como
`vars.PUBLIC_SUPABASE_URL` e `vars.PUBLIC_SUPABASE_ANON_KEY` (Settings → Secrets and
variables → Actions → **Variables**), com os valores do projeto atual como padrão no
próprio arquivo — a chave publishable não é segredo. Para apontar para outro projeto,
basta criar essas duas variáveis.

**Domínio próprio** (ex.: `casalnaestrada.com.br`): crie `public/CNAME` com uma linha
contendo o domínio, aponte no DNS um `CNAME` para `SEU-USUARIO.github.io` e preencha em
Settings → Pages → Custom domain (marque *Enforce HTTPS*). Com domínio próprio o site fica
na raiz: troque o passo "Descobrir o endereço do site" por `echo "base=/"`.

### Outra hospedagem estática

- **Netlify**: build `npm run build`, pasta `dist`
- **Vercel**: framework detectado automaticamente
- **Cloudflare Pages**: build `npm run build`, saída `dist`

Em qualquer uma delas, defina `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` e
`SITE_URL` nas variáveis do projeto. Sem build automático, o painel não publica sozinho:
seria preciso agendar um build a cada X minutos.

---

## Acessibilidade e detalhes de acabamento

- Contraste alto, foco visível, link "pular para o conteúdo", `alt` em todas as fotos.
- `prefers-reduced-motion` respeitado (as animações de entrada somem).
- Fotos em preto e branco por CSS (`filter: grayscale`) — se um dia quiserem cor,
  é só remover a regra `.photo img { filter: ... }` em `global.css`.
- A textura de papel é um SVG gerado em CSS: nenhuma imagem extra para carregar.
- O painel não aparece no menu, não entra no `sitemap` e responde `noindex`.

O emblema original enviado pelo casal está em `src/assets/marca/emblema-original.png`
(arquivo grande, fora do site). As versões leves usadas no site são
`public/media/logo-144.png` (rodapé e ícone de app) e `logo-640.png` (reserva para uso
grande, ex. impressão ou og:image); o emblema grande da home é `public/media/emblema.jpg`.
