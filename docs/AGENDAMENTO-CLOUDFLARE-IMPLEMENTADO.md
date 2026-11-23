# Verificador de publicação agendada implementado (inativo)

## Feito

- Build real lê uma única projeção validada do Worker, cria snapshot em diretório temporário do SO (permissão0600 no arquivo) e o Astro usa esse mesmo snapshot validado. Diretório é apagado no finally, inclusive se Astro falhar. Assim hash não representa uma consulta diferente da compilação.
- Gera dist/_revisao-publicada.json: somente versão, dia Recife e SHA256, sem títulos/conteúdo/segredos. Rota negada com404 pelo Worker antes de servir assets. Publicador exige manifesto válido; fixture não gera manifesto.
- Hash normaliza chaves de objetos, preservando arrays porque ordem pode mudar HTML (SQL já especifica ORDER BY estável). Mudança só em ordem de chaves não dispara; reordenar fotos/conteúdo pode legitimamente disparar.
- Dia America/Recife (UTC-03 atual) faz parte da revisão: pelo menos um build diário é necessário para HTML temporal/SEO mesmo sem edição. Não prometer zero builds com conteúdo idêntico entre dias diferentes.
- scheduled handler chama verificarPublicacaoAgendada. Só executa lógica quando runtime AGENDAMENTO_PUBLICACAO=1. Sem isso retorna desativado. Nenhum trigger foi adicionado a wrangler.jsonc e nenhum agendamento remoto foi configurado.
- Verificador compara projeção atual assinada com manifesto do ASSETS da versão realmente em execução. Sem manifesto válido não dispara (bootstrap conservador).
- Na manutenção/origem indisponível/D1 indisponível não publica e não altera a trava de manutenção. Revalida estado antes do envio; não promete atomicidade entre última consulta D1 e requisição externa (mesmo limite do botão).
- Reserva D1 atômica: máximo4 tentativas automáticas por dia Recife, intervalo mínimo1h entre tentativas; usa também cooldown global60s do admin. Tentativa de cron bloqueada pelo cooldown do admin ainda consome a reserva conservadoramente. Manual não é limitado às4/dia: continua autorizado/cooldown existente.
- Resposta2xx do hook é somente tentativa enviada, jamais baseline atualizado. Timeout/erro conservam reserva/backoff. Sem atualização do manifesto no ASSETS, mudança continua pendente; nova edição durante build também. Não cria fila ilimitada nem retry imediato.
- Tabelas D1 pequenas são criadas apenas quando rotina habilitada detecta diferença e tenta reservar. Não houve SQL remoto nesta rodada.

## Testes executados

Node22.23.4:
- tests/agendamento-publicacao.mjs: D1 emulado, desligado por padrão, objetos equivalentes, baseline atual, dia Recife, edição durante publicação, falha/sem retry, manutenção,4tentativas/dia e retomada no outro dia.
- tests/leitor-build-integracao.mjs: cache/leitura canal/falha sem REST + novo snapshot compartilhado com manifesto, inválido nega sem rede.
- tests/ativacao-canal-build.mjs e tests/publicacao-cloudflare.mjs passaram.
- test:cloudflare:local (build fixture, dryrun Wrangler e runtimeD1) passou. Dist final é fixture e NÃO pode publicar.
- test:seguranca completo e Astrocheck23arquivos sem erros/avisos/hints passaram.
Teste agendamento incluído no test:emergencia. Não houve teste remoto de cron nem simulação com conteúdo real/futuro no Supabase. Publicação dessa revisão pelo build remoto será a primeira prova do snapshot+manifesto reais.

## Ativação ainda pendente

1. Aguardar Ready deste commit no paralelo. Não repetir backup/emergência/hook/segretoHMAC.
2. Conferir no painel plano Free e uso/limites de Workers Builds e Worker CPU. Não pedir API token/cartão/upgrade. Verificador exige HMAC+JSON+SHA no Worker; emulação não prova CPU do plano real. Se ultrapassar limite, não contratar como atalho.
3. Após conferência, ativar trigger horário (ex.:17 * * * *) no wrangler.jsonc em commit próprio E runtime AGENDAMENTO_PUBLICACAO=1. Apenas variável sem trigger não executa; trigger sem variável é no-op. UTC do cron não altera dia Recife no algoritmo. Nenhum hook extra/segredo é necessário.
4. Validar evento scheduled no painel e resultado sem revelar dados. A rotina não faz log de URL/hook/conteúdo; observabilidade está desligada atualmente. Um teste protegido/status de acompanhamento ou observação de build será necessário para comprovação hospedada. Não alegar cron validado só por Ready do código.
5. Latência aproximada: até próxima verificação horária + duração do build; atrasos da plataforma/limite4 tentativas/dia podem ampliar. Não prometer horário exato. Se orçamento diário esgotar, intervenção manual ou dia seguinte; dados continuam salvos.

## Recuperação e escopo

Desativar variável de runtime AGENDAMENTO_PUBLICACAO (ou remover trigger) interrompe solicitações automáticas sem apagar conteúdo/estado/backups. Para voltar à referência anterior é preciso considerar que manifesto só existe em builds novos. Pages/SQL/RLS/buckets/DNS não alterados; não há merge nem contratação. Gatilhos antigos continuam coexistindo até fechamento especificamente autorizado. Migração definitiva ainda não concluída.
