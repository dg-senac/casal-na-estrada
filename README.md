# Casal na Estrada

Site de recordações de **Cieri e Milla** — casal de Recife que roda o Brasil de moto desde 2013.
Diário de viagem, galeria de fotos e vídeos, sala de troféus e agenda de encontros.

Feito com **Astro 5** (site estático) + CSS escrito à mão. Sem banco de dados, sem painel,
sem login: **todo o conteúdo são arquivos de texto** dentro de `src/content`. Isso significa
que o site é barato de hospedar (Netlify, Vercel, Cloudflare Pages, GitHub Pages), rápido e
praticamente impossível de sair do ar.

---

## Rodando na sua máquina

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # gera o site final em dist/
npm run preview  # confere o resultado do build
```

---

## Onde mexer em cada coisa

| O que você quer mudar | Arquivo |
| --- | --- |
| Nome, WhatsApp, Instagram, e-mail, números da home | `src/data/site.ts` |
| Cores, fontes, espaçamentos (tudo) | `src/styles/global.css` |
| Menu e rodapé | `src/components/Header.astro`, `src/components/Footer.astro` |
| Textos da página "O Casal" | `src/pages/sobre.astro` |
| Textos da home | `src/pages/index.astro` |
| Links e caminhos de imagem no código | `src/lib/url.ts` (função `url()`) |

### Publicar uma notícia / crônica no Diário

Crie um arquivo em `src/content/diario/`, por exemplo `07-volta-a-caruaru.md`:

```md
---
titulo: 'Voltamos a Caruaru e o café acabou na serra'
data: 2026-11-28
local: 'Caruaru'
uf: 'PE'
resumo: 'Uma frase de resumo, até 260 caracteres, que aparece nos cartões.'
capa: '/media/minha-foto.jpg'        # coloque o arquivo em public/media/
capaAlt: 'Descrição da foto para quem usa leitor de tela'
tipo: 'crônica'                       # crônica | notícia | relato | aviso
distancia: '340 km'                   # opcional
tags: ['Pernambuco', 'encontro']
destaque: false                       # true = aparece maior na home
rascunho: false                       # true = não aparece no site
---

Texto do post em Markdown normal. Use `##` para subtítulos, `>` para citações
e `**negrito**` quando precisar.
```

O post entra automaticamente na home, no diário, no arquivo por ano e no sitemap.

### Criar um álbum de fotos

`src/content/albuns/04-nome-do-album.md`:

```md
---
titulo: 'Encontro de Verão — Salvador'
data: 2026-12-14
local: 'Salvador — BA'
capa: '/media/salvador-capa.jpg'
capaAlt: 'Descrição da capa'
descricao: 'Um parágrafo sobre o álbum.'
ordem: 4                     # ordem na página da galeria
fotos:
  - src: '/media/salvador-01.jpg'
    legenda: 'Chegada na orla.'
  - src: '/media/salvador-02.jpg'
    legenda: 'Foto do grupo.'
    vertical: true           # opcional
videos:
  - titulo: 'Chegada no comboio'
    youtube: 'https://www.youtube.com/watch?v=SEU_ID'
    credito: 'filmado por um amigo'
#    arquivo: '/media/meu-video.mp4'   # alternativa ao YouTube (vídeo próprio)
---

Texto opcional de apresentação do álbum.
```

As fotos ficam em `public/media/`. Para o site ficar leve, exporte as imagens com
**1600 px no lado maior** e qualidade ~80 — não precisa mais que isso.

### Adicionar uma peça na Sala de Troféus

Cada peça da prateleira é **um arquivo** em `src/content/trofeus/`. O nome do arquivo
vira o endereço da página dela (ex.: `2026-11-estradeiros-do-rei.md` →
`/trofeus/2026-11-estradeiros-do-rei`), então use nomes curtos, sem acento e sem espaço.

```md
---
evento: 'Encontro de Motos de Caruaru'
ano: 2025                    # opcional: sem ano, a peça vai para o grupo "Sem data"
data: 2025-11-15             # opcional: data exata do encontro (ordena a prateleira)
edicao: '12ª edição'         # opcional
categoria: 'Casal mais distante'
cidade: 'Caruaru — PE'       # opcional
colocacao: '1º lugar'
nivel: 'ouro'                # ouro | prata | bronze | laco (participação)
tipo: 'trofeu'               # trofeu | placa | lembranca | construcao
historia: 'Duas a quatro frases contando como a peça foi conquistada na viagem.'
nota: 'Uma frase de efeito, que aparece em destaque na página da peça.'   # opcional
foto: '/media/trofeus/caruaru-2025.jpg'
fotoAlt: 'Descrição da foto para quem usa leitor de tela'
fotos:                       # opcional: outras fotos da mesma peça
  - src: '/media/trofeus/caruaru-2025-detalhe.jpg'
    legenda: 'Detalhe da gravação na base.'
destaque: false              # true = aparece na home, na seção da sala de troféus
rascunho: false              # true = não aparece no site
---
```

Se quiser contar a história inteira, é só escrever em Markdown abaixo do `---` — o texto
aparece como "A história completa" na página da peça. É opcional: a `historia:` do
cabeçalho já basta para o cartão da galeria.

**O que a página faz sozinha:**

- agrupa as peças **por ano**, da mais recente para a mais antiga ("Sem data" no fim);
- monta o índice de anos no topo e a contagem de troféus, placas e lembranças;
- troca a etiqueta de cada peça conforme o `nivel` e o `tipo`;
- atualiza o número de "peças na galeria" no painel da home.

**Fotos:** ficam em `public/media/trofeus/`. Exporte com **1600 px no lado maior** e
qualidade ~80 (as que estão lá hoje foram reduzidas na importação). Fotos na vertical
funcionam melhor — a galeria recorta em 4:5.

Em `src/content/trofeus/_modelos/` ficaram seis fichas de exemplo (marcadas com
`rascunho: true`, ou seja, fora do site) para servir de referência de formato.

### Agenda de encontros

`src/content/encontros/05-nome.md`:

```md
---
nome: 'Encontro de Moto Casais de Aracaju'
inicio: 2027-03-13
fim: 2027-03-15            # opcional
cidade: 'Aracaju'
uf: 'SE'
local: 'Praça de Eventos'   # opcional
confirmado: false            # mostra o selo "a confirmar"
observacao: 'Saímos do Recife na sexta de manhã.'
---
```

Encontros com data passada migram sozinhos para a seção "Já passou".

---

## Trocar as fotos de exemplo

As imagens em `public/media/placeholder-estrada-*.jpg` são **fotos de demonstração**
geradas para montar o layout. Substitua por fotos reais do casal mantendo os nomes dos
arquivos — ou troque os caminhos nos arquivos de conteúdo acima.

O emblema original enviado pelo casal está em `src/assets/marca/emblema-original.png`
(arquivo grande, fora do site). As versões leves usadas no site são
`public/media/logo-144.png` (rodapé e ícone de app) e `logo-640.png` (reserva para uso
grande, ex. impressão ou og:image).

## O que ainda vale preencher com dados reais

- [ ] WhatsApp, e-mail e Instagram em `src/data/site.ts` (hoje estão com valores de exemplo)
- [ ] Os números da home (anos de estrada, encontros, troféus, estados)
- [ ] Revisar as histórias dos troféus: as primeiras foram escritas a partir da data e do
      nome gravado em cada peça — ajustem com o que lembram da viagem
- [ ] Cidade de algumas peças que só têm o estado (Coletamento dos Estradeiros do Rei,
      Moto Culto, aniversários das Estradeiras)
- [ ] Nomes reais das cidades/eventos nas publicações de exemplo
- [ ] Domínio final em `astro.config.mjs` (`site:`) — usado no sitemap e nos links absolutos

## Deploy

### Opção 1 — GitHub Pages (grátis, direto do repositório)

O projeto já vem com o workflow `.github/workflows/deploy.yml`: **cada push na `main`
publica o site sozinho**.

1. No GitHub, abra **Settings → Pages** e em *Source* escolha **GitHub Actions**.
2. Faça o merge do pull request na `main` (ou dê push nela).
3. Acompanhe em **Actions** — o job "Publicar no GitHub Pages" roda o build e publica.
4. O endereço sai como `https://SEU-USUARIO.github.io/casal-na-estrada/`.

O workflow descobre esse endereço sozinho e passa `SITE_BASE=/casal-na-estrada/` no build,
para que links, imagens e CSS funcionem dentro da subpasta. Não precisa editar nada.

> O primeiro deploy pode falhar com "Get Pages site failed": é só confirmar
> **Settings → Pages → Source: GitHub Actions** e rodar o workflow de novo
> (aba Actions → Publicar no GitHub Pages → Re-run all jobs).

**Domínio próprio** (ex.: `casalnaestrada.com.br`): crie o arquivo `public/CNAME` com uma
linha contendo o domínio, aponte no seu provedor de DNS um registro `CNAME` para
`SEU-USUARIO.github.io` e preencha o campo em Settings → Pages → Custom domain
(marque *Enforce HTTPS*). Com domínio próprio o site passa a ficar na raiz, então defina no
workflow `SITE_BASE: /` — ou simplesmente troque o passo "Descobrir o endereço do site" por
`echo "base=/"`.

### Opção 2 — hospedagem estática comum

- **Netlify**: build `npm run build`, pasta `dist`
- **Vercel**: framework detectado automaticamente
- **Cloudflare Pages**: build `npm run build`, saída `dist`

Nesses casos o site fica na raiz e nenhuma variável é necessária. Depois de apontar o
domínio, ajuste `SITE_URL` (ou a chave `site` em `astro.config.mjs`) para o endereço
definitivo, senão o sitemap aponta para o lugar errado.

## Acessibilidade e detalhes de acabamento

- Contraste alto, foco visível, link "pular para o conteúdo", `alt` em todas as fotos.
- `prefers-reduced-motion` respeitado (as animações de entrada somem).
- Fotos em preto e branco por CSS (`filter: grayscale`) — se um dia quiserem cor,
  é só remover a regra `.photo img { filter: ... }` em `global.css`.
- A textura de papel é um SVG gerado em CSS: nenhuma imagem extra para carregar.
