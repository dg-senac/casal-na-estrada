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

## Build sem variáveis no painel

A configuração pública de leitura já usada pelo workflow GitHub Pages está em cloudflare/supabase-publico.json. O script usa esse fallback quando PUBLIC_SUPABASE_URL/PUBLIC_SUPABASE_ANON_KEY não estão disponíveis no ambiente de build. Não é service_role nem chave secreta. Overrides continuam permitidos somente para endereço do projeto e chave pública. .node-version define 22.23.4; NODE_VERSION no runtime não controla o build.

Não é mais necessário procurar campos de build vars nessa UI. NÃO configurar DADOS_FIXTURE. Não enviar chaves no chat.

## Runtime no NOVO Worker

Os nomes PUBLIC_SUPABASE_URL e PUBLIC_SUPABASE_ANON_KEY que o usuário já cadastrou em Runtime são aceitos como aliases pelo Worker do site. Alternativamente SUPABASE_URL/SUPABASE_ANON_KEY também funcionam e têm precedência. Runtime do controlador ainda exige Publishable sb_publishable_ e sessão/MFA: o fallback anon do build não libera acesso administrativo.

keep_vars=true preserva as variáveis cadastradas no dashboard nas publicações. DB vem do wrangler.jsonc. Não cadastrar plano pago ou novo banco. Mesma manutenção é compartilhada com o controlador de teste anterior.

## Antes de clicar Deploy

1. Branch de teste já deve estar no GitHub e selecionada.
2. Configurar/confirmar nome NOVO, comandos e variáveis nas telas disponíveis.
3. Se a UI oculta opções, não aceitar deploy de main por padrão: voltar ou criar sem publicar e ajustar Settings/Builds. Pode ser necessário fornecer captura ao agente.
4. Nunca clicar em merge para disponibilizar esses arquivos: a branch basta.

## Teste após deploy, em etapa posterior

Verificar layout colorido/fontes, fotos/zoom, Diário, mapa por estado, encontros, troféus e admin normal. No controlador /login-teste, confirmar autorização/MFA, manutenção, bloqueio de HTML/JS/assets com requests frescas (sem depender só de aba já aberta), reabertura e histórico. Admin normal fica bloqueado durante manutenção nesta versão; controlador separado permite reabrir. Não considerar migração final pronta enquanto esse comportamento e os demais requisitos não forem resolvidos/aprovados.

## O que NÃO fazer

Não desligar GitHub Pages, alterar DNS, substituir domínio público ou executar SQL adicional no Supabase por esta configuração. Não publicar fixture: guard de deploy recusa a marca fixture=true. Não usar npx wrangler deploy direto para contornar o guard. Sem backups de fotos ou restauração integral validados ainda.
