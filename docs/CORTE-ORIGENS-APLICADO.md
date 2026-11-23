# Corte das origens aplicado — aguardando prova final hospedada

Usuário confirmou desativação workflow e retirada Pages. GET workflow confirmou disabled_manually em rodada anterior. DELETE Pages pelo agente recusado403, usuário retirou pelo painel. GET Pages ainda devolve configuração (status null), portanto não prova entrega HTTP cessada. fetch_page do endereço antigo falhou, também não é prova conclusiva de404. Não afirmar verificação HTTP externa do Pages concluída; verificar no teste final.

## Supabase remoto

create_migration corte_origens_publicas_cloudflare sucesso (version null). Registro local supabase/migrations/202611230001_corte_origens_publicas_cloudflare.sql. NÃO reaplicar.

-7 políticas leitura_publica removidas e7gatilhos publicacao_automatica desativados.
- midia_le restrita authenticated AND e_administrador; rascunhos_le_publicada removida.
- bucket midia público=false, midia-rascunhos já privado preservado.
- Nenhum objeto/editorial apagado ou movido. AdminCRUD, funções assinadas e gatilhos de atualizado_em preservados.
- Releitura confirmou públicasREST0,admin_le7,storage_publicada0,gatilhosDesligados7,midiaPublico=false.
- Transação SET LOCAL ROLE anon: posts/albuns/trofeus/encontros/objetosStorage visíveis TODOS0. São testes SQL sob papel, não requestsHTTP.
- Transação SET LOCAL ROLE service_role: RPC conteudo publicado continua2posts/1álbum/31troféus/3encontros. Somente contagens retornadas, sem exportar conteúdo.
- Edge antiga foto-publicada usa leituraanon Storage; remover policy a impede por desenho. Ainda falta prova HTTP negativa específica; função não foi apagada.

## Código de produção neste commit

Host atual adotado como oficial, sem renomear Worker/reconfigurar segredo. Removido noindex forçado das páginas públicas, mantido admin. API/controle mantêm proteção e noindex próprios. Textos do botão agora descrevem site, não teste, e deixam claro que cópias anteriores/repositório público não são apagados. Canonical/SITE_URL já usam host workers.dev atual. Nenhum merge/DNS.

Backup de fotos usa Storage authenticated com sessãoadmin (cloudflare/midia-backup.mjs); política midia_le nova permite admin, rascunhos_le_admin preservada. Prévia admin compatível publicada no7b92030 antes do corte, confirmada Ready pelo usuário. Prova hospedada após fechamento ainda necessária.

## Testes locais desta rodada

Node22.23.4 corte-origens (ida/volta PGlite sintético), site-worker (indexação pública/admin), emergencia-admin (texto/fluxo) e test:cloudflare:local completo aprovados. Dist fixture não publicar. Não acionar novos backups completos só para validar migração.

## Próximo passo

Aguardar Ready do código produção e abrir host oficial, conferir fotos/zoom e admin. Uma única prova final autorizada de manutenção/reabertura com requests novas, verificando origens antigas negadas e controle acessível. Não chamar concluído até essa prova. Cron estado recente ainda pendente, consultável pelo botão já instalado sem mudar estado. Se build falhar após corte, não reabrir origem por atalho antes de investigar; reversão disponível em experiments/corte-producao/reabrir-origens.sql restaura público e remove contenção (somente usar se necessário, coordenado com Pages/workflow).
