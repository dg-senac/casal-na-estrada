# Configuração de publicação paralela — sem merge

A preparação não publica nada automaticamente nem modifica o workflow de Pages.

## Cloudflare Workers Builds

- Repositório: dg-senac/casal-na-estrada (somente ele autorizado à integração).
- Branch de publicação: arena/bb30d53b-casal-na-estrada. NÃO main.
- Nome: casal-na-estrada-site-teste (novo Worker, não substituir casal-na-estrada-teste).
- Diretório raiz: raiz do repositório (/).
- Versão Node: 22.23.4 (.node-version e variável NODE_VERSION se a UI precisar).
- Comando de build: npm run build:cloudflare:teste
- Comando de deploy: node scripts/publicar-cloudflare-teste.mjs --confirmar-teste-paralelo
- Config detectável: wrangler.jsonc na raiz, com ASSETS e o D1 de teste existente.
- Se houver comando de versão/preview para branches não principais, desativar builds dessas branches neste aplicativo. Não publicar variantes que ignorem o guard de deploy.
- Instalação usa npm ci/package-lock. Nenhuma mudança de plano ou cobrança deve ser ativada.

## Variáveis para BUILD

PUBLIC_SUPABASE_URL = https://pjglrlullnchqazxpvyn.supabase.co
PUBLIC_SUPABASE_ANON_KEY = chave pública Publishable do projeto (copiar privadamente no painel, nunca postar no chat).
NODE_VERSION = 22.23.4 se necessário.

NÃO configurar DADOS_FIXTURE. Não incluir service_role, sb_secret_ ou senhas. O build falha deliberadamente sem as variáveis. SITE_BASE e SITE_URL são definidos pelo script para o endereço paralelo na raiz.

## Variáveis de RUNTIME no NOVO Worker

SUPABASE_URL = mesmo endereço acima.
SUPABASE_ANON_KEY = chave pública Publishable, como no Worker de teste anterior.

Build vars não necessariamente viram runtime vars; confirmar os dois contextos. DB vem do wrangler.jsonc apontando ao D1 casal-emergencia-teste. Não criar outro banco pago. A manutenção será compartilhada com o Worker de controle existente enquanto ambos usam estado_site.

## Antes de clicar Deploy

1. Branch de teste já deve estar no GitHub e selecionada.
2. Configurar/confirmar nome NOVO, comandos e variáveis nas telas disponíveis.
3. Se a UI oculta opções, não aceitar deploy de main por padrão: voltar ou criar sem publicar e ajustar Settings/Builds. Pode ser necessário fornecer captura ao agente.
4. Nunca clicar em merge para disponibilizar esses arquivos: a branch basta.

## Teste após deploy, em etapa posterior

Verificar layout colorido/fontes, fotos/zoom, Diário, mapa por estado, encontros, troféus e admin normal. No controlador /login-teste, confirmar autorização/MFA, manutenção, bloqueio de HTML/JS/assets com requests frescas (sem depender só de aba já aberta), reabertura e histórico. Admin normal fica bloqueado durante manutenção nesta versão; controlador separado permite reabrir. Não considerar migração final pronta enquanto esse comportamento e os demais requisitos não forem resolvidos/aprovados.

## O que NÃO fazer

Não desligar GitHub Pages, alterar DNS, substituir domínio público ou executar SQL adicional no Supabase por esta configuração. Não publicar fixture: guard de deploy recusa a marca fixture=true. Não usar npx wrangler deploy direto para contornar o guard. Sem backups de fotos ou restauração integral validados ainda.
