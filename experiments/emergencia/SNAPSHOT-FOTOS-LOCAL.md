# Protocolo local para cópia de fotos no D1

Implementado em snapshot-fotos.mjs, testado com D1 emulado por Miniflare/workerd em tests/snapshot-fotos.mjs. Ainda NÃO importado pelo Worker, sem API ou alteração de SQL real. Autorização do usuário foi prosseguir desenvolvimento; armazenamento real de novos binários privados ainda não foi iniciado.

## O que está implementado

- Snapshot deve corresponder a uma cópia editorial já existente e ao mesmo usuario_id.
- Manifesto imutável explícito: nomes dos buckets midia/midia-rascunhos, tamanho, até 100 objetos, 1 MiB por objeto, 8 MiB por snapshot. Limites experimentais conservadores, não cotas oficiais.
- Até três snapshots incluindo incompletos, sem exclusão/sobrescrita automática. Teto de dados esperado <=24 MiB + metadados/índices, não incluindo outros dados do banco.
- Manifesto não aceita bytes do cliente; núcleo recebe dados somente de futuro adaptador autenticado. Ainda NÃO há autorização HTTP neste módulo: usuario deve vir da sessão validada no servidor, nunca do JSON de uma requisição.
- Objeto gravado condicionalmente só enquanto snapshot incompleto; PK evita duplicação. Repetir mesmos bytes não sobrescreve, bytes diferentes para nome existente são recusados.
- Estado concluído somente após releitura e validação SHA256 e tamanho de cada objeto e contagem. Não inclui garantia contra invasor com acesso ao banco ou assinatura criptográfica.
- Download interno de bytes verifica hash antes de retornar. Não há URL pública.
- Falha preserva objetos/copias anteriores. Não contém código que altere manutenção ou reabra site.

## Provas executadas

Fixtures apenas: vínculo conta/cópia, conclusão recusada sem arquivo, estado incompleto preservado, tamanho incorreto recusado, gravação/releitura binária, repetição idempotente, conflito sem sobrescrita, conta diferente negada, selo impede escritas posteriores, corrupção detectada na leitura/conferência e quarta versão recusada. Teste independente fotos-d1-local também comprova limite da soma de BLOBs. Ambos incluídos em test:emergencia. Não é teste de segurança de endpoint real, performance remota ou cópia das 22 fotos reais.

## Bloqueios antes de hospedar

1. Adaptador HTTP com autenticação/MFA/Origin, controle concorrência/rate limit, vínculo de operação e usuário vindo do servidor. Leitura de objetos deve ser server-to-server do projeto/buckets fixos, sem uploads arbitrários do cliente.
2. Dividir listagem/cópia/verificação em passos curtos. concluirSnapshotFotos atual relê sequencialmente e pode ultrapassar as 50 queries/invocation do Free com inventários grandes (até cerca de 3 queries por objeto). Portanto NÃO ligar diretamente a rota hospedada. Planejar verificação paginada persistente e selo final resistente a concorrência/TOCTOU. CPU de hashing também precisa medição hospedada, não apenas local.
3. Integração do botão deve diferenciar cadastros confirmados de fotos pendentes/incompletas. Sem reabertura automática em falhas. Se depender de aba aberta, explicar e permitir retomada protegida; não chamar de execução de fundo independente.
4. API de download autenticado e verificador de pacote de fotos guardado. Considerar distinção entre arquivos Storage e public/media; versão Git não é cópia binária externa por si só.
5. Conferir plano/uso atuais da conta Cloudflare e tamanho máximo atual dos objetos (inventário passado não basta); parar se exigir pagamento. Só então propor SQL aditivo completo ao usuário, sem executar o protótipo manualmente no D1 real.

O ZIP manual e a nova cópia editorial b14640fe-20fe-4ede-b4f9-ed751d42ee9d continuam sendo os backups validados. Nenhum backup real novo foi criado nesta etapa. Reabertura e limpeza de sessão anteriores já confirmadas pelo usuário; não repetir para encher capacidade.
