# Revisão somente leitura do Supabase real

## Escopo executado

Consultados catálogos PostgreSQL pelo conector Supabase no projeto casalnaestrada (pjglrlullnchqazxpvyn): definições e ACL das funções de autorização, colunas/tipos/obrigatoriedade e proprietário/RLS das sete tabelas, políticas RLS e constraints. Nenhuma função criada, migração aplicada, política alterada ou conteúdo editorial exportado nesta etapa. Nenhuma chave ou dado de usuário de Auth consultado.

## Resultado para a captura proposta

- `e_administrador()` existe, SECURITY DEFINER, proprietário postgres, search_path vazio. Confere UID na lista privada de administradores ativos e exige AAL2 quando existe fator confirmado.
- `estado_acesso_painel()` existe com mesmo proprietário e search_path; retorna autorizado/mfa_ativo/mfa_necessario. ACL das duas inclui authenticated e service_role, sem EXECUTE direto para PUBLIC/anon.
- A captura experimental exige AAL2 independentemente de existir fator, além de e_administrador(): manter essa exigência mais estrita. Não substituir a autorização por metadados editáveis do usuário.
- `capturar_editorial_emergencia()` NÃO existe no projeto no momento da inspeção.
- Sete tabelas existem, proprietárias postgres, RLS ativada e FORCE RLS desativado. Políticas administrativas usam e_administrador; políticas públicas são SELECT condicionado à publicação, com data adicional para posts, e vínculo ao pai publicado para filhos.
- IDs UUID e FKs album_fotos/album_videos -> albuns, trofeu_fotos -> trofeus confirmados (ON DELETE CASCADE). Slugs únicos nas tabelas posts/albuns/trofeus.
- Campos hora_inicio/fonte_url/conferido_em de encontros presentes. Checks de hora e URL presentes.
- Coluna posts.ficha_rota AUSENTE: migração anterior da ficha continua pendente. Não é bloqueio da captura genérica, que deve preservar o esquema observado sem inventar campo; é pendência separada para salvar ficha no painel. NÃO corrigida automaticamente nesta revisão.

## Diferenças em relação à prova de restauração

Esquema local era representativo e NÃO deve ser apresentado como espelho do real. Produção tem muitas outras colunas NOT NULL (ex.: títulos, resumo, flags, ordem, timestamps) e constraints de UF, tipo, nível, ano, resumo e destinos_mapa. A regra local fim>=inicio não aparece nas constraints de produção consultadas. Precisamos reproduzir as constraints reais em ambiente isolado ou projetar importação com o esquema correto antes de falar em restauração validada de produção. Captura to_jsonb preserva colunas reais, mas não inclui DDL/defaults/triggers/políticas.

## Segurança e implantação ainda pendentes

Inspeção estática de metadados NÃO é teste de acesso com sessões reais nem auditoria completa. Não houve teste de bypass, políticas por usuário, configuração inteira de grants/default privileges ou contenção de ataque.

SECURITY DEFINER no PostgreSQL pode ler além de RLS dependendo do proprietário: isso é necessário para incluir todos os rascunhos, mas requer instalação por proprietário conhecido, revisão de grants finais (incluindo privilégios padrão) e guardas explícitas. Limites/timeout/rate limit e revisão de novos campos permanecem necessários. Não reduzir permissões existentes por conta própria.

## Próximo passo proposto

Preparar integração local de exportação/download autenticado: receber captura, verificar envelope/contagens, gerar pacote e oferecer download somente após autorização/MFA, sem logs de conteúdo e sem armazenamento automático de dados reais no D1. Testar integralmente com mocks. Antes de disponibilizar dados reais, obter autorização explícita para instalar a função de leitura no Supabase e atualizar o Worker separado. Isso não migra nem bloqueia GitHub Pages, não constitui backup de arquivos e não ativa cobrança.
