# Validação local das permissões e ponto de decisão

## Inspeção real somente leitura

Catálogos consultados pelo conector Supabase no projeto pjglrlullnchqazxpvyn, sem ler conteúdo editorial/contas/fatores reais, executar DDL ou acionar triggers:

- 14 políticas SELECT das sete tabelas retornadas integralmente. Público lê publicados; posts exige data <= hoje America/Recife; filhos exigem pai publicado. Admin usa e_administrador().
- 21 políticas de escrita retornadas agrupadas: sete INSERT WITH CHECK admin, sete UPDATE USING/WITH CHECK admin, sete DELETE USING admin.
- Grants diretos: anon e authenticated possuem SELECT/INSERT/UPDATE/DELETE/REFERENCES/TRIGGER/TRUNCATE nas sete tabelas. has_table_privilege confirma TRUNCATE efetivo nas sete para ambos. Roles não são superuser nem BYPASSRLS.
- e_administrador SECURITY DEFINER, owner postgres, search_path vazio, execute postgres/authenticated/service_role. Definição exige administrador ativo e AAL2 quando há fator verificado. Mantida regra existente; controlador emergência tem guarda AAL2 mais estrita.
- disparar_publicacao SECURITY DEFINER, owner postgres, search_path public,pg_temp, execute postgres/service_role. Corpo NÃO consultado para evitar exposição de detalhes sensíveis; função não chamada. toca_atualizado_em não SECURITY DEFINER. Triggers de publicação não foram recriados no teste.

## Prova local

`tests/restauracao-rls-local.mjs`: banco PGlite efêmero com colunas observadas e políticas equivalentes no schema restauracao. Funções Auth uid/jwt e tabela de fatores SIMULADAS; não réplica do servidor Auth. Dados exclusivamente fictícios. Roles locais sem privilégio de dono.

Sete tabelas: visitante, usuário comum AAL2, administrador inativo AAL2, administrador ativo AAL1 com fator verificado e administrador ativo AAL2. Leituras públicas e privadas conferem; INSERT indevido recusado, UPDATE/DELETE indevidos não afetam linhas; UPDATE de admin AAL2 permitido. Não é teste hospedado com sessões reais nem cobertura completa de Storage/RPC/role membership.

Grant TRUNCATE amplo foi reproduzido com fixtures: role anon conseguiu esvaziar tabela local apesar da RLS. Revogação local bloqueou. NENHUM TRUNCATE/removal executado no projeto real. PostgreSQL RLS não controla TRUNCATE; isto não prova endpoint REST público explorável (PostgREST CRUD comum não oferece TRUNCATE). Depende de haver caminho SQL/RPC que exponha esse privilégio. Permissão desnecessariamente ampla merece redução defensiva.

## Decisão pendente do usuário

Proposta de mudança remota mínima: revogar SOMENTE TRUNCATE de anon/authenticated nas sete tabelas editoriais, preservando SELECT/INSERT/UPDATE/DELETE e todas as políticas. Não alterar service_role/postgres, não excluir dados e não desabilitar triggers. Ainda NÃO preparada como migração aplicada; requer autorização explícita antes de mudar permissões reais. REFERENCES/TRIGGER também amplos, mas não incluídos automaticamente neste ajuste mínimo.

Após autorização: migração transacional idempotente com sete tabelas explícitas, validar has_table_privilege falso para ambas, conferir grants CRUD e RLS intactos, sem executar operação destrutiva real para testar. Se não autorizado, somente registrar risco e continuar isolamento; não alegar proteção completa.

Sem deploy, contratação, alteração Pages ou migração nesta etapa. Teste executado com Node 22.23.4 e passou.

## Atualização: ajuste autorizado e aplicado

Usuário autorizou explicitamente ("sim"). create_migration revogar_truncate_editorial executada com sucesso, revogando SOMENTE TRUNCATE nas sete tabelas de anon/authenticated. SQL registrado em supabase/migrations/202611210005_revogar_truncate_editorial.sql. Não reaplicar como pendência.

SELECT posterior com has_table_privilege confirmou para AMBOS os perfis, nas sete tabelas: truncate_removido=true, crud_preservado=true, rls_ativa=true. Sem execução destrutiva para validação. A instrução REVOKE não modifica políticas, dados, triggers, service_role ou postgres. Demais pendências de recuperação/proteção permanecem; isto não conclui solução de emergência.
