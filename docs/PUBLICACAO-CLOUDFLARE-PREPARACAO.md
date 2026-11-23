# Preparação de publicação pelo admin na Cloudflare

Usuário autorizou PREPARAÇÃO da Cloudflare como hospedagem definitiva, mantendo Pages ativo até validação final. Isso NÃO autoriza desligamento Pages, merge, fechar REST/Storage ou DNS. Build647bfc9 Ready confirmado: leitura pelo canal assinado comprovada. Não repetir backup/emergência ou configurar HMAC de novo.

## Integração implementada

No build paralelo e host exato atual, admin passa a usar status/solicitar em /api/publicacao-cloudflare, em vez de publicar_agora/status_publicacao do GitHub. Depois de salvar/excluir, solicita publicação Cloudflare; botão Publicar agora também. Branch/host fora do paralelo conserva comportamento anterior. Os triggers Supabase de publicação Pages ainda existem e não foram alterados — edição real ainda pode provocar Pages enquanto esses gatilhos estiverem ativos. Não usar edição destrutiva como teste.

Novo banner do paralelo não pede token GitHub. Se hook ausente, explica configuração do servidor; dados salvos no Supabase não são perdidos. Mensagens do paralelo não prometem publicação pronta em1min; hook aceito só significa solicitação/início, Ready deve ser conferido no painel. Sem consulta de status detalhado de build/API token novo.

## Segurança e limites

- Backend exige Origin exata, admin/MFA confirmados no Supabase, configuração do projeto conhecida. Chave de admin não é passada ao hook.
- CLOUDFLARE_DEPLOY_HOOK_URL exclusivamente Secret de runtime. Validação rígida de https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/UUID; sem query/fragment/host alternativo/redirect, sem URL arbitrária no navegador. Não registrar ou devolver URL do hook.
- status somente diz configurada true/false, sem acionar build. solicitar só quando manutenção=0.
- Na primeira solicitação autenticada cria automaticamente pequena tabela publicacao_cloudflare no D1 existente e linha única, para cooldown global de60s. Não requer outro banco/SQL manual; criação só ocorre ao clicar/solicitar após salvar. Nenhuma tabela remota foi criada pelo agente nesta etapa.
- UPDATE condicional atômico impede solicitações concorrentes próximas. Falha/timeout conserva cooldown; não tenta novamente automaticamente porque o build pode ter iniciado.
- Alterações feitas dentro do intervalo continuam salvas, mas podem não estar no build já iniciado. UI informa aguardar60s e Publicar agora para novas edições. Não prometer fila infalível/atualização automática eventual sem isso. Nenhum cron extra foi instalado: evitar consumir minutos de build gratuito continuamente.
- Sucesso só com API success=true e status queued/initializing/running. already_exists exposto como mensagem de build pendente, não prova de que últimas edições foram capturadas. Erros sem detalhes internos/segredos.

## Fontes oficiais consultadas

https://developers.cloudflare.com/changelog/post/2026-04-01-deploy-hooks/index.md documenta suporte de Workers Builds a Deploy Hooks por branch e menu Workers & Pages -> Worker -> Settings -> Builds -> Deploy Hooks.
https://developers.cloudflare.com/api/resources/workers_builds/subresources/deploy_hooks/methods/trigger/ documenta POST e que UUID do hook é segredo; result/success/estado/duplicação. Não equivale a capacidade ilimitada gratuita; confirmar plano/cotas no painel, parar se exigir upgrade/cartão. Não contratar serviço.

## Testes

Node22.23.4 tests/publicacao-cloudflare.mjs em D1 emulado: URL permitida, SSRF/query negados, auth/Origin, manutenção, cooldown/transação concorrente, status sem POST ao hook, falha sem retry/sem segredo, cliente restrito ao paralelo. Nenhum hook/build real chamado. test:seguranca completo, Astrocheck23 sem erros/avisos/hints e test:cloudflare:local aprovados. Teste incluído em test:emergencia. Dist local fixture não publicável.

## Próxima configuração do usuário (um passo por vez)

1. No NOVO Worker casal-na-estrada-site-teste -> Settings -> Builds -> Deploy Hooks, criar hook Publicar pelo admin, branch EXATA arena/bb30d53b-casal-na-estrada. Não selecionar main porque ela ainda não contém implementação. Não mudar branch ativa da sessão. Se painel não oferecer recurso ou pedir pagamento, parar e avisar; não inventar menu/contratar.
2. Copiar URL só dentro do painel para Secret runtime CLOUDFLARE_DEPLOY_HOOK_URL no mesmo Worker e salvar/deploy. Nunca enviar URL/UUID/chat ou screenshot com valor. Não criar API token adicional nem substituir segredos existentes. HMAC/Supabase vars preservados.
3. Depois Ready do commit desta integração, autenticar admin com MFA, clicar Publicar agora sem editar dados. Observar solicitação e novo build da branch correta Ready. Só então testar publicação de edição não destrutiva autorizada e concluir esse marco.

## Pendências para migração final

Conexão definitiva de branch/main depende de aprovação de merge; futuro hook terá de apontar à branch que realmente contém código. Autoatualização/cron deve ter estratégia de mudanças agendadas e retenção de cotas; não declarar resolvida por hook manual. Desativar antigos triggers/Pages e fechar origens exige plano e autorização específica. Endereço final/SEO/noindex atual são de teste e precisam revisão antes de migração. Recuperação completa e limites dos backups continuam documentados separadamente.
