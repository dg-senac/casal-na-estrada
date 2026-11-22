# Emergência: plano sem serviços pagos

Status: proposta de arquitetura. Nenhum bloqueio, backup, mudança de DNS ou serviço foi ativado.

## Restrição atual

GitHub Pages entrega arquivos estáticos. Não há middleware para negar todas as requisições imediatamente. Um aviso JavaScript não é bloqueio de segurança. Uma publicação de manutenção por GitHub Actions depende da fila e não remove conteúdo já baixado. Um proxy na frente do Pages deixa o endereço de origem acessível enquanto o Pages permanecer público.

## Arquitetura candidata, sujeita à verificação dos planos gratuitos

Servir o site em Cloudflare Workers com Static Assets e middleware executado antes dos assets, em endereço gratuito workers.dev, sem exigir compra de domínio. Desativar a publicação pública do GitHub Pages após validar a migração, e impedir qualquer endereço alternativo de contornar o bloqueio. Não manter deploys de prévia contendo dados públicos sensíveis como rota alternativa. Esta mudança altera a URL pública atual; o usuário deve aprovar isso antes da implementação/migração.

As condições, cotas e disponibilidade atuais precisam ser verificadas na documentação oficial e na conta. Não prometer gratuidade ilimitada, proteção absoluta ou ativar cobrança. Se o plano gratuito não suportar o desenho, interromper e apresentar alternativas.

## Controle

- Estado de manutenção no servidor, com leitura consistente (não um sinal KV eventualmente consistente), anterior a HTML, assets, feeds e rotas de conteúdo. Resposta 503 e Cache-Control: no-store. Desabilitar caches que possam ignorar o controle. Em falha de consulta ao estado, conteúdo público falha fechado.
- Página de manutenção mínima e painel/login continuam acessíveis por regras explícitas. APIs administrativas exigem sessão Supabase válida, autorização de administrador e MFA AAL2 verificados no servidor; não confiar em flags do navegador. Não expor service_role ao cliente.
- Botão no canto superior direito do admin, confirmação, botão separado para reabrir, trilha de auditoria, proteção de origem/CSRF conforme autenticação adotada, rate limit e idempotência.
- Aplicar manutenção primeiro; iniciar snapshot depois. Falha no snapshot não pode reabrir o site. Retentativas não devem sobrescrever backups anteriores. Exibir estados distintos: bloqueado, backup pendente/concluído/falhou.
- O bloqueio público do site não bloqueia automaticamente REST/Storage do Supabase. Inventariar acesso direto e, se necessário, adicionar um controle de emergência às políticas de leitura pública, preservando RLS e acesso administrativo. Inventariar buckets públicos/privados e URLs já emitidas antes de prometer contenção. Nada invalida cópias já baixadas.

## Backup de emergência

Definir como snapshot lógico dos dados editoriais (incluindo rascunhos) e manifesto de mídia, com cópia dos objetos incluída apenas após medir volume e cotas. Não chamar de backup completo do Supabase: Auth, senhas, configurações, funções e políticas têm recuperação distinta. Código/migrações permanecem versionados no Git.

Armazenamento privado, acesso somente administrativo, retenção limitada sem sobrescrever snapshot anterior, checksum, exportação e teste de restauração isolado. Não registrar tokens/segredos no arquivo ou nos logs. Exportação grande exige paginação/job retomável e controle de concorrência para consistência; evitar snapshot truncado. Não bloquear manutenção esperando uma cópia grande terminar. Arquivos sob suspeita ficam identificados como snapshot do incidente, não como última cópia íntegra.

Medir tamanho/quantidade antes de definir retenção. Sem plano pago, cartão, compra de domínio ou backup integral de mídia prometido sem avaliação. Separar cópias anteriores do snapshot de incidente; backups no mesmo provedor não são recuperação independente.

## Etapas e critérios de aceite

1. Confirmar aceitação da troca da URL e conexão/conta Cloudflare gratuita. Verificar oficialmente cotas de Workers, Static Assets, armazenamento e banco de estado.
2. Inventário somente leitura do Supabase e volume dos objetos; fechar escopo e retenção do snapshot.
3. Implementar/testar em ambiente isolado; sem ativar manutenção em produção nem migrar por conta própria.
4. Testar bloqueio em todas as rotas, assets, feeds e origem alternativa; acesso direto ao Supabase; autorização, MFA, falhas de rede, concorrência, backup incompleto e restauração.
5. Após aprovação explícita, migrar e desativar origem antiga. Só então anunciar bloqueio real operacional.

## Limite de segurança

Não é proteção absoluta contra invasão, DDoS ou comprometimento de credenciais administrativas. Revogação de sessões, rotação de credenciais e resposta ao incidente continuam necessárias conforme o caso. Serviços gratuitos têm cotas e podem ficar indisponíveis; não há promessa de SLA.
