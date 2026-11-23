# Corte autorizado — execução em fases

Usuário respondeu Sim à adoção do workers.dev atual como oficial, retirada de Pages e restrição das origens públicas antigas, sem exclusão de dados. Autorização de merge não foi solicitada/concedida: não fazer merge implicitamente. Não trocar branch.

## Nesta rodada

- Consulta remota somente de metadados confirmou7políticas leitura_publica TO public, midia_le TO public, rascunhos_le_publicada TO anon/authenticated; midia público=true, midia-rascunhos=false.
- Gatilho publicacao_automatica/disparar_publicacao ativo nas7tabelas; gatilhos toca_atualizado_em devem ser preservados.
- GitHub API GET Pages confirmou build_type workflow e endereço original. Nenhuma operação remota de corte realizada ainda.
- Encontrada prévia admin autenticada somente para midia-rascunhos. Ampliada para fotos históricas midia e referências proxy reescritas. Downloads usam sessão Supabase do próprio admin e blobs locais, sem credenciais novas/URLs persistidas alteradas. Publicar essa compatibilidade ANTES de tornar bucket privado.
- Preparados experiments/corte-producao/fechar-origens.sql e reabrir-origens.sql a partir das políticas reais observadas. NÃO aplicados e ainda precisam teste SQL local. Não são migrações já executadas. Reversão reabre acesso público e desfaz contenção, exige coordenação com Pages.
- Fechamento remove políticas públicas, restringe midia_le ao admin, preserva CRUD/admin e funções assinadas servidor; desativa só publicacao_automatica e torna midia privado sem mover/apagar objetos. Edge foto-publicada sem service_role depende da política pública removida: deve parar de entregar anon, verificar negativa real. Não precisa apagar função.
- tests/midia-admin-legada.mjs e midia-privada aprovados; test:seguranca e test:cloudflare:local aprovados Node22.23.4. Dist fixture NÃO publicar.

## Próximos passos sem nova autorização redundante

1. Aguardar Ready da compatibilidade admin; não fechar enquanto versão ativa não tiver essa correção.
2. Validar SQL ida/volta em PGlite e preservar backup autenticado (download Storage do snapshot) após corte.
3. Preparar versão oficial removendo noindex público, mantendo noindex admin/controle. Texto do botão deve descrever produção/limites honestamente só no corte; atualmente ainda avisa paralelo.
4. Desativar workflow Pages via GitHub e sua hospedagem conforme autorização, coordenado com migração remota. Conservar repositório/dados e reversão. Nenhum merge necessário para desabilitar workflow via API, mas branch main ainda contém site antigo.
5. Aplicar SQL remoto transacional já autorizado somente na janela coordenada; confirmar ACL/negativas anon, Worker imagens/conteúdo e admin sem repetir backup completo.
6. Uma prova final do bloqueio/reabertura. Não anunciar produção protegida até fechamento+negativas. Cron recente ainda não confirmado; consultar status existente, sem fabricar edição.

Não pedir ao usuário segredo/MFA/token ou reconfiguração de hook. Chamar só para painel/Ready/teste indispensável. Saldo de builds desconhecido; manter Free, não contratar.
