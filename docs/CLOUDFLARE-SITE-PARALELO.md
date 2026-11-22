# Site completo em paralelo — preparação, não migração

## Implementado/testado localmente

`cloudflare/site-worker.mjs` usa o controle atual e serve o build Astro via ASSETS somente após consultar estado_site no D1. `run_worker_first: true` no Wrangler impede servir assets diretamente antes do Worker. Bloqueio inclui HTML, JS/CSS, imagens, RSS e /admin. O controlador independente /login-teste continua acessível para reabertura. O admin original não funciona durante manutenção nesta versão: isto deve ser resolvido/revisado antes de migração final, não escondido como recurso completo.

Respostas do endereço paralelo usam noindex e no-store para não competir com Pages ou permitir cache do browser contornar mudança de estado. Sem proxy/redirect de conteúdo para Pages. Falha do D1/ASSETS fecha acesso. Caminhos API desconhecidos são 404. Não existe rota pública de recuperação de trava.

Config `wrangler.jsonc`: NOVO Worker casal-na-estrada-site-teste, raiz /, ASSETS de dist, D1 já criado pelo usuário (mesmo banco do teste de controle), sem preview URLs extras e observabilidade desativada por padrão para evitar logs com conteúdo/headers privados. Nenhuma configuração externa aplicada. Mesma manutenção D1 afeta ambos os Workers que usem esse banco: não testar em paralelo com outro operador.

`npm run test:cloudflare:local`: gera controller, build Astro com fixture, dry-run do Wrangler (sem publicar) e integração workerd/Miniflare local com D1 emulado. Auth/REST inteiramente simulados, sem rede Supabase. Assets servidos no runtime; duas requisições sobrepostas: backup segura a trava e reabertura recebe 409, depois snapshot fictício é salvo, páginas/arquivo bloqueados, login disponível, reabertura/auditoria de início/fim funcionam. Não é teste na conta Cloudflare real. Emulador Miniflare 5 beta é dependência de desenvolvimento fixada, usada com adaptador v4 e entrada direta do Worker; não comprova todos os detalhes de roteamento externo/cotas. Teste Node separado cobre rotas e config run_worker_first requer inspeção hospedada.

Wrangler 4.166.0 e Miniflare 5.20261119.0-beta fixados. npm audit: zero vulnerabilidades na execução desta rodada. Astro check: 23 arquivos sem erro/aviso. Suíte test:emergencia passou.

## Build/publicação separados

- `npm run build:cloudflare:teste`: exige PUBLIC_SUPABASE_URL e PUBLIC_SUPABASE_ANON_KEY e recusa DADOS_FIXTURE. SITE_BASE=/ e SITE_URL de endereço paralelo; sem alterar workflow de Pages.
- `node scripts/publicar-cloudflare-teste.mjs --confirmar-teste-paralelo`: comando manual que exige marca de build não-fixture; não executado. Usa login OAuth do Wrangler ou conexão segura do provedor, NUNCA tokens no chat. Corrigir/verificar identidade da conta antes de publicar.
- `npm run test:cloudflare:local` deixa dist com fixtures e marca fixture=true: NÃO PUBLICAR. Refaça build real. Comando Wrangler direto pode contornar o guard: não executar deploy de dist manualmente sem checar origem. Config não faz publicação automática.
- Vars de runtime SUPABASE_URL e SUPABASE_ANON_KEY precisam existir no NOVO Worker (não são herdadas do teste anterior). São distintas dos nomes PUBLIC_* usados no build. Somente Publishable no runtime.

## Intervenção futura do usuário

Precisamos autenticar/conectar Cloudflare para publicar ASSETS + código: colar somente worker.js no editor não envia o site completo. Método proposto é integração GitHub com acesso somente ao repositório, branch ativa de teste e build/config corretos; alternativa Wrangler OAuth numa máquina controlada pelo usuário. O agente não deve pedir token/senha no chat. Não criar integração com deploy automático da main nem substituir Worker atual inadvertidamente. Preparar revisão/branch remota antes da conexão.

## Ainda não concluído

Não foi publicado site completo na Cloudflare. Não foi feito backup dos binários, restauração completa do esquema real, rate limit/retentiva/histórico completo nem revogação de origem alternativa. Não desativar Pages, mexer em DNS ou alegar contenção do site real. URL de origem Supabase/media pública continua acessível. Não ativar plano pago. A preparação não significa garantia de finalizar produção hoje.
