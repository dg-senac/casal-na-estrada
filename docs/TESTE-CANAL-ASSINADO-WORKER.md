# Teste do canal assinado dentro do controle protegido

Usuário informou segredo MIDIA_WORKER_HMAC salvo no Supabase e no runtime Secret do Worker casal-na-estrada-site-teste. Valor NÃO enviado ao chat, lido pelo agente ou versionado. Não gerar/trocar novamente só para testar.

## Integração adicionada

cloudflare/origem-assinada.mjs assina GET para Edge isolada midia-worker, valida path e origem fixa, não usa chave privilegiada ou token de usuário no pedido de imagem e consulta manutenção antes e depois de obter bytes. Limite 10MiB, formatos estritos, timeout/redirect manual. Sem rota pública de proxy habilitada ainda.

POST /api/testar-origem-assinada exige Origin exata, sessão administrativa validada e MFA pelo autorizador existente. Requer paralelo aberto. Servidor seleciona uma capa de post público com data já alcançada em Recife, pela API pública já existente (canal provisório, não fecha origem). Não aceita URL/caminho fornecido pelo navegador. Busca via HMAC, depois faz um GET sem assinatura esperando HTTP403, e retorna só tamanho/tipo e resumo. Não devolve segredo, imagem ou chave interna. Não altera estado, conteúdo ou backups. O único registro persistente esperado é nonce consumido na origem no pedido assinado.

Botão no /login-teste: Testar canal assinado de imagens. Não aciona emergência, não consome vaga de backup, não requer criar tabela/secret adicional. Dados de login permanecem em memória como antes. Erro não comprova chave incorreta: também pode indicar configuração, foto sem correspondência, timeout, manutenção, indisponibilidade ou permissões. Não solicitar segredo ao usuário.

## Testes locais executados

Node22.23.4: test:emergencia completa, test:cloudflare:local, test:seguranca, Astrocheck (23 arquivos, zero erros/avisos/hints). Novo tests/canal-assinado.mjs executa Worker -> bundle exato Edge em VM -> HTTP/SQL mock. Prova HMAC correto, segredo errado, unsigned negado, usuário sem admin, origem/método inválidos, manutenção antes/durante, URLs externas rejeitadas. Não comprova gateway/CPU remotos nem imagem real. Teste SQL integrado da etapa anterior usa PGlite separado. Dist ao fim contém fixture e não foi publicado diretamente.

## Validação hospedada pendente

Após Ready do novo build, usuário abre /login-teste no novo Worker, autentica com MFA e clica somente Testar canal assinado de imagens. Pedir mensagem final (não segredo). Não acionar emergência ou criar backup para testar. Sucesso deve relatar imagem recebida com assinatura e pedido sem assinatura recusado HTTP403. Se falhar, investigar runtime/Edge/RPC sem reenviar segredo ao chat.

Este teste é isolado: fotos do site continuam nos URLs anteriores, Pages e políticas/buckets atuais permanecem intactos. Canal de build exclusivo e bloqueio de acesso direto ainda pendentes. Mesmo sucesso aqui NÃO significa migração ou contenção completa.
