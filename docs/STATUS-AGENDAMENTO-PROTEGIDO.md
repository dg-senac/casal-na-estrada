# Consulta protegida do agendamento

Usuário confirmou Ready ae90c6b. Cron não apareceu após deploy; usuário adicionou manualmente17 * * * * e screenshot confirmou. Causa da ausência após deploy ainda não determinada; não afirmar corrigida. Metrics mostra zero erros e um asset interno.invalid, indício de execução mas não resultado conclusivo. Usuário autorizou consulta de status no controle.

## Implementação

Wrapper scheduled grava somente última verificação em status_agendamento, linha única D1 (horário em segundos e resultado de allowlist). Criação/gravação ocorre na execução do scheduled, inclusive resultado desativado, não ao consultar. Controle de tentativa/hook/limites não alterado. Falha ao gravar D1 não faz resultado fictício: consulta continua mostrando dado antigo/ausente. Comparar horário exibido com horário atual; registro antigo não prova saúde atual. Registro de execução mais antiga não sobrescreve horário de execução mais nova.

POST /api/status-agendamento exige Origin exata e mesmo admin/MFA confirmado no Supabase. Timeout15s, no-store, sem CORS extra. Retorna somente habilitação runtime, último horário/resultado, dia Recife, tentativas automáticas do dia/limite4. Não devolve URL hook/HMAC/conteúdo/identidade. Retorno habilitado só reflete variável; não prova trigger cadastrado. Consulta não executa verificador nem cria tabelas, reservas, builds, backup ou manutenção. Lê sqlite_master para tabela ainda ausente e informa null/zero. Indisponibilidade/estado inválido retornam503 sem detalhe interno.

Botão Consultar agendamento automático no /login-teste, mesmo controle protegido. Mostra resultado traduzido e horário Recife. Sem registro pede esperar próximo minuto17, nunca usar teste de emergência ou edição fictícia. Tentativa-enviada só informa envio2xx, não Ready; atualizado compara conteúdo+dia com manifesto efetivamente servido. Falha tratada no cron pode não aparecer como erro de invocação: status permite diferenciá-la.

## Verificações

Node22.23.4 tests/agendamento-publicacao.mjs aprovado: fluxo cron anterior+persistência do último horário, consulta autenticada, Origin/admin negados, contagem diária, registro ausente sem criação/sem hook. test:cloudflare:local completo e test:seguranca completo aprovados. Dist fixture não publicável. Não houve SQL remoto, build manual/hook ou alteração de conteúdo pelo agente.

## Próximo teste hospedado

Aguardar Ready deste commit, depois a próxima execução no minuto17. Abrir /login-teste, autenticar e clicar Consultar agendamento automático; enviar só mensagem final. Antes da primeira execução desta versão é normal não ter registro (não reconstruir histórico antigo). Consulta não precisa novo segredo/variável/SQL. Se aparecer indisponivel/sem-referencia/sem-configuracao, investigar sem repetir configuração inteira. Se atualizado com horário recente, comprova verificação sem build desnecessário. Pages/DNS/origens antigas continuam intactos.
