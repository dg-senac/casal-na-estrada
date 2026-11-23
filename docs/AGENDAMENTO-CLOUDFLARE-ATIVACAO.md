# Ativação do horário de verificação no paralelo

Usuário confirmou Ready55fb601, Workers Free ativo e cadastrou por conta própria variável Runtime AGENDAMENTO_PUBLICACAO=1 após explicação do próximo passo. Autorizou previamente preparação e rotina automática no paralelo. Não há autorização para Pages/DNS/fechamento de origens/contratação.

Este ajuste adiciona triggers.crons=["17 * * * *"] em wrangler.jsonc: verificação no minuto17 de cada hora UTC, também minuto17 em Recife. Horário da plataforma não é garantia de execução pontual. O handler scheduled já estava publicado; depende da variável string1 para efetuar trabalho. keep_vars=true preservado, nenhum segredo/variável existente foi sobrescrito pelo código.

Rotina compara hash do conteúdo e dia Recife com manifesto interno efetivamente servido pelo ASSETS. Logo não gera build a cada hora: pode solicitar quando há mudança e na virada do dia (HTML temporal), com intervalo mínimo1h e máximo4 tentativas AUTOMÁTICAS por dia Recife. Manual e builds por push consomem cota à parte. Falhas/timeout consomem tentativa, não marcam revisão como publicada. Manutenção bloqueia publicação. Mesmo com limite diário, não há prova de saldo restante nem garantia de encaixe em cota: não contratar/upgrade se esgotar; pausar rotina.

Testes executados Node22.23.4: tests/agendamento-publicacao.mjs aprovado, agora inclui cron exato, keep_vars e ausência de override da variável de habilitação; test:cloudflare:local completo (build fixture, dryrun Wrangler e runtime emulado) aprovado. Dist final fixture NÃO publicável. Sem chamada de hook real pelo agente.

Após push, aguardar Ready da nova revisão. Ready confirma publicação do código/configuração, NÃO execução bem-sucedida de cron. Próxima confirmação: conferir Cron Trigger no painel do Worker (horário17 * * * *), depois evento/execução hospedada e eventual build quando houver diferença. Ausência de novo build no mesmo dia com revisão igual é normal; não fabricar edição de conteúdo para testar. Não acionar backup ou emergência novamente.

Para pausar: trocar AGENDAMENTO_PUBLICACAO para0 no Runtime e salvar/deploy. Trigger pode continuar chamando handler sem consultas externas quando variável desligada. Não remover hook nem segredos HMAC como forma de pausa. Se remover trigger só no painel, próximo deploy pode restaurá-lo a partir do wrangler; mudar código se for remoção permanente.

Saldo exato de builds e desempenho CPU real não confirmados; plano gratuito confirmado por screenshot. A resposta da IA Cloudflare que dizia zero builds contraria histórico fornecido e não deve fundamentar cálculo de consumo. Migração definitiva segue pendente e Pages está intacto.
