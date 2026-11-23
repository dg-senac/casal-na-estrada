# Componentes isolados instalados com autorização

Usuário autorizou explicitamente criar a nova função isolada e tabelas/funções auxiliares (resposta "Sim"). Não autorizou desligar Pages/restringir origens antigas nesta etapa.

## Operações remotas concluídas

1. list_projects confirmou projeto pjglrlullnchqazxpvyn saudável. list_edge_functions mostrou somente foto-publicada ACTIVE v1 antes da instalação. Consulta confirmou schema origem_worker e duas RPCs ausentes.
2. create_migration origem_worker_isolada executada com sucesso. Schema/tabela nonce/índice, funções de consumo e publicação e duas RPCs criadas, owners postgres, search_path vazio, sem alterar tabelas editoriais, Storage ou políticas existentes. RLS da NOVA tabela nonces ativada. Registro local em supabase/migrations/202611210006_origem_worker_isolada.sql. Não reaplicar como pendência.
3. create_edge_function criou midia-worker, ID dd790d86-26e3-472c-b170-7ea3cd2dbaaa, versão1, status ACTIVE. Função anterior foto-publicada não modificada. verify_jwt=false porque autenticação é HMAC obrigatória no código, não token do visitante. Sem HMAC configurado, responde 503 em paths válidos, não entrega objeto. O agente NÃO criou/consultou valor de segredo nem chave privilegiada real.
4. SELECT de privilégios depois da instalação confirmou nas quatro funções: owner postgres, anon EXECUTE=false, authenticated EXECUTE=false, service_role EXECUTE=true. Funções privadas SECURITY DEFINER, wrappers SECURITY INVOKER; search_path vazio em todas.
5. SELECT da tabela confirmou owner postgres, RLS=true, anon/authenticated sem USAGE no schema e sem SELECT na tabela.

## Limites de validação remota

Tentativa de GET sem assinatura pelo fetch_page falhou no próprio mecanismo de fetch, sem status HTTP utilizável. Portanto NÃO afirmar que a negativa HTTP hospedada foi verificada. ACTIVE é confirmação do conector, não prova ponta a ponta. Primeiro teste hospedado assinado ainda pendente da configuração exclusiva do segredo compartilhado e canal de teste no Worker.

## Código entregue

supabase/functions/midia-worker/index.js é a fonte autônoma enviada ao conector. Aceita path completo /functions/v1/midia-worker/... ou path interno /midia-worker/... do gateway, mas mensagem HMAC sempre usa /midia-worker/... canônico. Só permite JPEG/PNG/WebP dos dois buckets e consulta publicação antes/depois de ler bytes. Segredo MIDIA_WORKER_HMAC e chave interna SUPABASE_SERVICE_ROLE_KEY acessados exclusivamente pelo ambiente Edge; sem retorno/log. Não há credencial privilegiada no Worker/build/browser. A chave interna é poderosa; segurança do endpoint depende das guardas/código/RPCs e não de ela ser chave de escopo limitado.

Bundle exato testado localmente em tests/edge-origem-bundle.mjs via Deno.serve/Deno.env simulados: caminhos de gateway, HMAC, entrega fictícia, unsigned negado, ausência de configuração negada. Teste não usa segredo ou bytes reais. Teste integrado SQL/HMAC da candidata continua separado. Teste instalado real de performance/CPU/quotas não feito.

## Próximo passo do usuário

entregas/gerar-segredo-midia-local.html gera 32 bytes aleatórios no navegador local e mostra 64 caracteres hex. NÃO envia rede, não tem segredo embutido ou persistência; não garante segurança contra extensões/computador comprometido. Baixar/abrir localmente, gerar uma vez, guardar em gerenciador de senhas, não compartilhar/screenshot/chat. Configurar o mesmo MIDIA_WORKER_HMAC como segredo no Supabase Edge e Cloudflare Worker paralelo (não variável PUBLIC_, não campo de build). Não pedir usuário para copiar SUPABASE_SERVICE_ROLE_KEY para Cloudflare: ela permanece só dentro da Edge.

Orientar um painel por vez. Supabase: projeto casalnaestrada, seção Edge Functions/Secrets; nome exato MIDIA_WORKER_HMAC. Não alterar segredos existentes. Não trocar senha/chaves existentes e não selecionar plano pago. Depois de salvar o primeiro lado, confirmar apenas sucesso sem valor. Worker ainda não tem bridge HMAC ativada; criar secret lá sozinho não muda rotas existentes.

## Pendências intactas

Bridge do Worker assinado, build com canal exclusivo servidor, mapeamento completo de URLs (inclusive Markdown), teste hospedado, fechamento de caminhos públicos antigos e eventual migração/Pages exigem trabalho e autorização adicionais. Nenhuma contenção completa anunciada. Não repetir backups para esta etapa.
