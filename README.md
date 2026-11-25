# Casal na Estrada 🏍️

Site de Cieri e Milla sobre viagens de moto, encontros, lugares visitados, fotos e a coleção de troféus do casal. Inclui painel editorial e controle protegido de emergência.

**Site:** https://casal-na-estrada-site-teste.douglasmarista02.workers.dev/  
**Instagram:** [@casal_naestrada2.4](https://instagram.com/casal_naestrada2.4)

O nome técnico do Worker ainda contém `site-teste`, mas este é o endereço adotado como oficial. A hospedagem anterior no GitHub Pages foi retirada; não reative seus antigos workflows.

## Tecnologias e identidade

- **Astro 7 + TypeScript e JavaScript:** geração de páginas estáticas, SEO e componentes.
- **Cloudflare Workers + Static Assets + D1:** hospedagem, manutenção, controle de operações e cópias de emergência.
- **Supabase:** PostgreSQL com RLS, Auth com segundo fator, Storage privado e Edge Functions.
- **Leaflet:** mapa; **Marked, sanitize-html e DOMPurify:** Markdown e sanitização.
- **Bodoni Moda, Barlow Condensed e Inter:** tipografia local; visual de estrada/motoclube.
- **GitHub Actions:** verificações; **Cloudflare Workers Builds:** compilação e publicação.
- **PGlite, Miniflare e JSDOM:** testes de banco, Worker e DOM com dados fictícios.

### Feito com assistência de IA

O projeto foi desenvolvido e aprimorado com assistência de inteligência artificial no código, testes, documentação e recursos visuais. Conteúdo e decisões são orientados pelos responsáveis pelo site. Há imagens ilustrativas; o uso de IA não comprova a autenticidade de cenas nem dispensa revisão humana. Não inventar histórias, datas ou premiações a partir de imagens.

## Desenvolvimento

Use **Node.js 22.23.4 ou superior** e npm.

```sh
npm ci
DADOS_FIXTURE=scripts/dados-exemplo.json npm run dev
```

O fixture contém exemplos locais, não é cópia de produção. Para compilar e testar o fluxo Cloudflare sem rede real:

```sh
npm run test:seguranca
npm run test:emergencia
npm run test:cloudflare:local
npx astro check
```

**O último comando de teste Cloudflare gera `dist/` com fixture: NÃO publicar esse diretório.** O CI não precisa de tokens ou acesso ao conteúdo real. A aparência final, segundo fator real e integrações hospedadas exigem validação no ambiente publicado; emulação não os substitui.

## Estrutura — o que não apagar

| Pasta | Uso |
| --- | --- |
| `src/` | Páginas, componentes, estilos, regras editoriais e admin. |
| `public/` | Fotos, ilustrações, fontes de mídia, favicon e manifesto. Referências também vêm do banco, portanto ausência de import não significa arquivo sem uso. |
| `cloudflare/` | Router, manutenção, mídia assinada, publicação e agendamento. |
| `supabase/` | Histórico de migrações e fontes das Edge Functions. Migrações já aplicadas não devem ser reaplicadas automaticamente. |
| `experiments/` | Apesar do nome histórico, contém módulos **usados em produção**, geradores, SQL de recuperação e modelos usados em testes. Não é uma pasta descartável. |
| `scripts/` | Build, publicador com guardas, fixtures e manifests/SQL usados nas verificações. |
| `tests/` | Regressões de segurança, conteúdo, banco e recuperação. |
| `.github/workflows/` | CI e monitoramento do endereço oficial; não publica no Pages. |

Os testes mantêm alguns SQLs/manifests históricos como casos de regressão. O Git guarda a documentação e entregas antigas removidas na limpeza. Arquivos de licença e atribuição não são lixo.

## Publicação

O projeto usa **Cloudflare Workers Builds**, ligado ao repositório. Comandos configurados:

```sh
npm run build:cloudflare:teste
node scripts/publicar-cloudflare-teste.mjs --confirmar-teste-paralelo
```

Os nomes com `teste` são históricos e permanecem por compatibilidade com o painel da Cloudflare. O build real lê somente a projeção publicada do Worker, via `CONTEUDO_BUILD_URL` fixada pelo script; gera snapshot temporário e manifesto de revisão. **Falha do canal ou manutenção interrompe o build, sem fallback para REST público.** Isso não substitui nem reabre a versão publicada.

`wrangler.jsonc` define ASSETS/D1, `keep_vars` e cron `17 * * * *`. Não usar deploy direto para contornar os guardas de fixture/manifesto. Não subir anexos de e-mail, backups ou arquivos de credencial ao Git.

### Runtime (configuração existente)

- `SUPABASE_URL` e `SUPABASE_ANON_KEY` (Publishable); aliases `PUBLIC_SUPABASE_URL`/`PUBLIC_SUPABASE_ANON_KEY` aceitos pelo router.
- `MIDIA_WORKER_HMAC`: segredo compartilhado somente com a Edge `midia-worker`.
- `CLOUDFLARE_DEPLOY_HOOK_URL`: segredo do runtime para solicitar Builds, nunca no cliente/Git/log/chat.
- `AGENDAMENTO_PUBLICACAO=1`: habilita o verificador periódico.

Não gerar outras chaves nem trocar os segredos existentes para fazer um teste. `service_role` pertence somente ao servidor Supabase, nunca ao build ou navegador. Na Cloudflare, configurações de Build e Runtime são distintas.

**Merge não muda a branch configurada no painel Cloudflare nem no Deploy Hook.** Se passar a publicar de `main`, reconfigurar ambos de forma coordenada; não apagar a branch fonte ainda conectada. Não contratar plano pago como solução automática.

## Admin, manutenção e recuperação

- **`/admin/`:** editar conteúdo, solicitar publicação e acionar **Emergência**.
- **`/login-teste`:** controle separado, com login administrativo e segundo fator. Permanece disponível quando o admin e o site são bloqueados. O nome da rota é histórico, não uma proteção por obscuridade.
- A emergência bloqueia novas entregas pelo Worker e tenta copiar cadastros; a aba então tenta copiar fotos. **Manter a aba aberta**, guardar o ID e conferir o resultado. Em erro/timeout, não repetir cegamente: retomar com o mesmo ID no controle.
- **Reabrir site** exige confirmação no controle. Limpar a sessão da página remove memória local, não revoga outras sessões Supabase.
- Conteúdo editorial REST e leitura pública antiga de Storage foram restringidos; bucket `midia` é privado. Canais assinados verificam publicação e manutenção. Não restaurar policies públicas como atalho para uma falha de imagem.

### Limites importantes

Cópias editoriais: até 5 de 1 MiB; fotos no D1: até 3 conjuntos, 100 arquivos, 1 MiB por arquivo e 8 MiB por conjunto. O ZIP manual tem limites próprios exibidos no controle. Não há captura atômica nem restauração integral automática comprovada. Cópia no mesmo D1 não substitui backup independente; preserve downloads privados e os arquivos fixos do repositório.

Manutenção não apaga arquivos já baixados, caches de terceiros ou mídias existentes no GitHub público. Código e fotos deste repositório público não podem ser tratados como segredos. Não confundir teste do layout com uma ação que realmente bloqueia visitantes.

### Agendamento e custos

Uma verificação por hora compara conteúdo e dia Recife com o manifesto **efetivamente publicado**. Só diferença pode solicitar build, com intervalo mínimo de uma hora e até 4 tentativas automáticas por dia. Há cooldown compartilhado com publicação manual; falha não marca revisão como publicada. O dia também invalida HTML temporal, mesmo sem edição. Limite diário esgotado pode adiar atualização; publicações manuais e por push consomem cota à parte.

Consulte **Consultar agendamento automático** no controle: runtime habilitado não prova execução; verificar horário/resultado recente. Pedido ao hook não significa build Ready. A rotina pausa na manutenção. Para interromper solicitações automáticas, definir `AGENDAMENTO_PUBLICACAO=0` no Runtime e salvar/deploy. Não há autorização de contratação automática; plano Free tem limites e o saldo real não está no código.

### Reversão de permissões

`experiments/corte-producao/reabrir-origens.sql` é um recurso excepcional: **reabre acessos públicos e desfaz a contenção**. Não executar como manutenção normal. Antes de eventual retorno ao Pages, coordenar políticas, workflow e hospedagem; nenhuma reversão é automática. Nunca apagar bucket, banco ou fotos para reverter.

Para conferir backups offline, gere ferramentas descartáveis:

```sh
node scripts/gerar-conferencia-offline.mjs
node scripts/gerar-ensaio-local.mjs
```

Os HTMLs saem em `entregas/` (ignorado no Git). Não transmitem os arquivos escolhidos para a rede e não restauram produção.

## Dados e créditos

Coordenadas municipais: [kelvins/municipios-brasileiros](https://github.com/kelvins/municipios-brasileiros), revisão `503e2f70bbf1b4b7ec0b1f68b09086ccc38fe861`, `csv/municipios.csv`. Licença MIT preservada em `src/data/municipios-LICENSE.txt`. Os pontos indicam sedes municipais, não coordenadas exatas de eventos ou rotas; não inventar localização para nomes ambíguos.

Fotos e histórias pertencem aos respectivos responsáveis. Preservar originais e distinguir peças/edições de troféus antes de substituir imagens. O destaque de Cieri e Milla é editorial e não declara uma vitória de competição.
