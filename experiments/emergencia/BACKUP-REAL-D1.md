# Integração de emergência com pacote editorial real no D1

Preparada após autorização do usuário para item 1. NÃO publicada no Worker. Tabela D1 ainda precisa ser criada manualmente pelo usuário. Sem mudanças nesta etapa no Supabase, GitHub Pages ou admin original.

Arquivos: backup-real.mjs, backup-real-d1.sql, gerar-worker-backup-real.mjs, worker-backup-real-teste.mjs (bundle completo). Teste: node tests/backup-real-d1.mjs. Executar gerador antes de distribuir bundle atualizado.

## Comportamento

Novo botão claramente separado dos fictícios: manutenção do TESTE + guardar cadastros REAIS. Confirmação explica que inclui rascunhos, guarda na Cloudflare, não inclui binários e não bloqueia Pages. Sessão, administrador e AAL2 revalidados antes de alterar estado. POST, Origin exata e UUID v4 exigidos. Sem CORS ou leitura pública de backups. Não há service_role ou senha no servidor.

Grava manutenção primeiro e verifica resultado; depois captura real via RPC existente e pacote já validado. Erros posteriores não reabrem. INSERT condicional em uma instrução mantém teto de 5 cópias, 1 MiB por pacote; sem exclusão automática ou sobrescrita. Mesmo ID em retentativa evita nova captura se já gravado. Se lote cheio, mantém manutenção e informa falha, sem declarar backup concluído. UUID por tentativa; mesma aba reutiliza ID após falha. Meta de armazenamento: no máximo 5 MiB de texto de pacotes, mais índices/metadados; demais dados do D1 continuam contando nas cotas. Isso não comprova disponibilidade de cotas nem garante custo zero em conta configurada para cobrança: nenhuma alteração de plano/assinatura realizada. Usa apenas D1 já criado pelo usuário e não exige R2/cartão. Conferir métricas/plano antes de uso continuado.

Tabela contém ID, horário de criação, usuário operador, pacote e SHA-256. Sem rota pública de consulta; conta Cloudflare e administradores com acesso ao banco podem ler. Não é criptografia ponta a ponta nem proteção contra comprometimento de ambos os provedores. D1 separado do Supabase é outra cópia, não substitui cópia offline privada. Identificador+hash confirmados após inserção; recuperação binária/restauração integral ainda pendentes. Hash não é assinatura. Não alegar backup completo: exclui Auth/esquema/arquivos das fotos.

## Testes

Mocks locais: autorização negada sem efeitos, manutenção antes de RPC, pacote salvo validado pelo parser, falha D1 preserva bloqueio, repetição sem sobrescrever/nova captura, teto 5 com recusa antes de capturar sexta cópia, recurso desativado, método GET recusado, sintaxe do script completo. SQL testado em SQLite local: criação idempotente, limite condicional, não sobrescrita. Regressões download/Worker anterior/emergência fictícia aprovadas.

## Limites e próximos passos

Nada aplicado no D1/Cloudflare pelo agente. Primeiro usuário cria SOMENTE tabela no D1 de teste; depois arquivo completo e teste real em etapas. Evitar exportar conteúdo no console/chat; consultar só ID/hash/tamanho. Precisamos de download autenticado das cópias guardadas, integridade em leitura, política de retenção acordada, auditoria durável de tentativas/falhas, rate limiting e serialização global manutenção/reabertura antes de produção. Usuários paralelos ainda podem reabrir durante backup; usar único operador no experimento. Revisar observabilidade para não registrar conteúdo/Authorization. Não migrar/desativar Pages nesta fase.
