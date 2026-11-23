# Auditoria de agendamento antes da migração definitiva

## Evidência recebida

Usuário testou Publicar agora no paralelo após configurar Deploy Hook e Secret runtime. Screenshot da lista de builds mostra branch arena/bb30d53b-casal-n..., origem Publicar pelo admin e check verde de sucesso. Fluxo manual hospedado confirmado. Isso não prova publicação automática por data futura nem edição real (nenhum conteúdo foi alterado para testar).

## Estado verificado no código

- .github/workflows/deploy.yml: schedule */10 * * * * publica Pages, não Worker. Não foi modificado/desativado.
- wrangler.jsonc e cloudflare/site-worker.mjs: sem Cron Trigger e sem handler scheduled. Worker não se recompila sozinho por passagem de data.
- experiments/origem-protegida/conteudo-publicado-candidato.sql: posts publicados só entram com data <= dia atual America/Recife. Logo a origem passa a incluí-los na virada local, mas HTML já compilado não muda sem build.
- src/pages/encontros.astro: HTML inicial é calculado no build; script do navegador recalcula estados e move cards existentes entre grupos. Isso NÃO adiciona novos registros que estavam ausentes no build nem atualiza todas as outras páginas/SEO.
- src/pages/index.astro: anos de estrada calculados no build (virada anual também precisa recompilação).
- cloudflare/publicacao-cloudflare.mjs: manutenção impede solicitação manual; cooldown60s não é fila de publicação e não promete capturar alterações posteriores ao início de um build.

## Estratégia a implementar, não ativada

Evitar simplesmente compilar a cada10min: seriam144 builds/dia, mesmo sem alterações. Não afirmar que cota atual comporta isso; plano e uso real precisam ser conferidos no painel. Nenhum serviço pago/autorização de cobrança.

Preferir verificação periódica leve no Worker e build apenas quando necessário:

1. Build gera manifesto interno de referência: hash determinístico da projeção publicada usada NAQUELA compilação, versão do algoritmo/template, data local Recife relevante ao HTML e identificador da revisão. Manifesto não precisa expor conteúdo; impedir sua entrega pública, como manifesto de backup.
2. Verificador scheduled consulta D1/manutenção antes e depois de ler a origem assinada. Sem segredo de Supabase, sem REST fallback. Em erro/manutenção, não compilar e não reabrir automaticamente.
3. Comparar projeção canônica atual + dia relevante com manifesto da publicação efetivamente servida. Ordem de objetos/listas precisa ser estabilizada; JSON bruto sem normalização pode mudar sem alteração editorial. Não usar apenas contagens/updated_at: exclusão, filhos e virada de data precisam ser detectados.
4. Mudança real pode solicitar hook. Reusar validação rígida do hook e cooldown compartilhado com admin; não chamar endpoint administrativo via token fabricado e não dispensar admin/MFA nas rotas HTTP existentes.
5. Distinguir tentativa de publicação e publicação concluída: salvar hash como publicado SÓ quando manifesto da nova versão estiver disponível, nunca só por hook202. Falha deve manter alteração pendente, com backoff e limite diário de tentativas para não consumir builds indefinidamente. D1 atômico protege execuções concorrentes e admin.
6. Se editar durante build pendente, verificação posterior precisa detectar diferença e publicar novamente. Isso resolve a lacuna atual do cooldown sem fingir que todo save foi incluído.
7. Frequência e limite diário precisam ser explícitos, com teste offline e confirmação de cotas gratuitas antes de ativar o trigger remoto. Não depender de horário exato: plataforma pode atrasar execução. Datas editoriais atuais são por dia America/Recife, não por minuto.
8. Verificação deve detectar também transições temporais do HTML inicial/SEO, não só posts novos; rebuild diário condicionado à necessidade ou chave temporal planejada. Sem isto, hash editorial igual não garante HTML temporal atualizado.

## Critérios mínimos de teste

- Conteúdo idêntico/reordenação equivalente: zero builds.
- Post futuro cruza dia Recife: uma solicitação, sem publicar antes da data.
- Publicação em voo e nova edição: alteração permanece pendente até novo manifesto efetivo.
- Hook falha/timeout: não marcar como publicado, limitar novas tentativas.
- Manutenção e D1/origem indisponível: zero builds, sem alterar trava.
- Concorrência cron/admin: sem tempestade de builds; backoff/limite global persistente.
- Build bem-sucedido: manifesto permite reconhecer nova referência; versão antiga não finge sucesso.
- Não mostrar hook/HMAC/títulos de rascunhos em respostas/logs.

## Limites desta rodada

Somente auditoria e plano técnico. Nenhum cron, SQL remoto, segredo, alteração editorial, fechamento de origem, merge ou migração foi executado. Pages continua íntegro. Próximo trabalho é implementar e testar offline o verificador com confirmação de publicação, depois avaliar cota no painel antes de habilitar execução periódica. Não declarar migração concluída enquanto esta pendência existir.
