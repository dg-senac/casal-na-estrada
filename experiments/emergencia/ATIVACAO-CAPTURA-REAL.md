# Ativação autorizada da captura somente leitura

Usuário autorizou explicitamente instalar a função no Supabase e preparar download de cadastros reais no Worker de teste, sem copiar dados reais ao D1 e sem migrar Pages.

## Executado

- Conector Supabase create_migration: captura_editorial_emergencia no projeto pjglrlullnchqazxpvyn, sucesso.
- SQL equivalente versionado em supabase/migrations/202611210004_captura_editorial_emergencia.sql. O conector retornou version null; não afirmar que identificador de versão remoto coincide com nome local.
- Proprietário definido explicitamente postgres. SELECT posterior confirmou SECURITY DEFINER, search_path vazio, ACL apenas postgres e authenticated; anon e service_role sem EXECUTE.
- A função exige UID, administrador ativo e AAL2, mesmo para authenticated. Nenhuma política RLS modificada. Função consulta somente dados editoriais. Não executada com sessão real nesta etapa e nenhum conteúdo editorial exportado pelo agente.
- Arquivo completo worker-download-teste.mjs gerado por gerar-worker-download.mjs. Preserva botões D1 fictícios e adiciona seção separada de download REAL manual após login/MFA. Nenhum comando de emergência passa a copiar dados reais automaticamente.
- Bundle, script browser, download com mocks, autorização, pacote, recuperação local e SQL de migração testados localmente com sucesso.

## Ação manual pendente

Usuário precisa copiar worker-download-teste.mjs inteiro para o Worker casal-na-estrada-teste e publicar, sem mudar bindings/variáveis. Primeiro confirmar tela em /login-teste. Depois, em passo separado, login/MFA e download consentido. Arquivo inclui rascunhos e deve ser guardado privadamente. Não enviar pacote para chat nem commitar conteúdo real. Confirmar arquivo baixado e validar integridade antes de chamar isso de cópia verificada.

Não houve deploy automático na Cloudflare. Download no ambiente hospedado ainda não validado. GitHub Pages/admin original intactos. Não foi feito backup binário de mídias nem restauração do banco real.

## Segurança/limitações

Módulo isolado mantém exportação desativada por padrão; o bundle deste teste explicitamente habilita a rota autenticada. Aplicação de SQL foi a única mudança de produção nesta etapa. Não remove nem restringe recursos anteriores. Para revogar o novo recurso, REVOKE EXECUTE da função de authenticated e remover a rota no Worker, ou remover exclusivamente a função após análise de dependências; não executado por esta documentação.

Ainda pendentes para operação de emergência real: mídia, pacote autenticado criptograficamente/procedência, auditoria/retentiva, rate limit/concorrência, esquema integral de restauração, bloqueio de origem alternativa e acesso direto REST/Storage. Leitura do payload inclui colunas futuras; revisar mudanças de esquema. Backup de incidente não garante estado íntegro anterior. Sem cobrança ativada.
