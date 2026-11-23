# Adaptador Edge candidato: assinatura, publicação e bytes

## Implementado e testado localmente

experiments/origem-protegida/edge-candidata.mjs recebe GET/HEAD somente no projeto conhecido e prefixo /functions/v1/midia-worker/. Não importado na Edge Function foto-publicada existente nem no Worker em produção. Mensagem canônica remove apenas /functions/v1 para verificar protocolo /midia-worker/ da etapa anterior; query e path arbitrários recusados.

Fluxo testado: HMAC válido -> consumir nonce por RPC -> consultar publicação por RPC -> ler objeto do Storage -> conferir tipo/tamanho (máximo 10 MiB) -> consultar publicação NOVAMENTE -> entregar bytes com no-store/nosniff e headers próprios. Sem Set-Cookie/Location/Authorization/headers da origem no retorno. Timeout 15s, redirects recusados, erros genéricos sem detalhes internos. HEAD não entrega corpo mas percorre verificação; custo de leitura permanece. Não há snapshot atômico Postgres/Storage: rechecagem reduz janela, não revoga bytes já entregues nem impede alterações logo após o último check.

O adaptador NÃO consulta a manutenção D1; isso continua responsabilidade do Worker que só assina quando aberto e deve verificar estado novamente antes de responder. Uma assinatura já emitida expira em até30s; se vazar pode autorizar uma requisição até expirar/ser consumida. Não expor assinatura ao browser nem guardar em URL/logs.

## Credenciais: distinção importante

A proposta usa chave interna de servidor SOMENTE dentro da Edge para RPC/Storage, depois das guardas. Essa chave é poderosa (pode contornar RLS); o código deve continuar restrito a caminhos validados e fotos publicadas. NÃO é canal genérico de proxy/SQL, NÃO vai para Worker, build público, navegador ou repositório. Nenhuma chave real foi obtida/gerada/usada aqui. A validação estrutural no adaptador não autentica a chave; o Supabase autentica no uso das APIs.

Isso é decisão de arquitetura nova, que precisa revisão/aprovação antes de qualquer uso real: guarda de publicação em função PostgreSQL específica é o limite do canal, a credencial em si não é uma chave de escopo reduzido. Caso esse modelo não seja aceitável, é preciso identidade dedicada com privilégios mínimos em vez de considerar a proposta pronta. Não tratar comprimento ou prefixo da chave como prova de privilégio.

## RPCs candidatas

experiments/origem-protegida/rpc-candidatas.sql cria wrappers públicos SECURITY INVOKER para funções do schema privado. EXECUTE revogado explicitamente de PUBLIC/anon/authenticated e concedido ao papel servidor; schema, tabela e funções privadas também revogados dos clientes para evitar defaults permissivos. Não expõe segredo ou URL assinada. Nenhum SQL deste candidato foi aplicado remotamente. Default privileges/owner/roles reais ainda precisam ser conferidos na instalação e ACL lida de volta.

## Teste integrado executado

Node22.23.4 tests/edge-origem-candidata.mjs aprovado. PGlite com esquema real de colunas observado, roles anon/authenticated/service_role locais, candidato SQL e RPCs. Fetch simula HTTP, mas executa SQL de verdade sob SET ROLE service_role para RPCs; bytes do Storage são fictícios. Verifica fluxo HMAC->RPC->publicação->objeto->publicação, replay, rascunho, despublicação durante busca, tipo HTML recusado, falha de nonce negada, headers internos não repassados e RPC negada a anon/authenticated. Não é teste do gateway remoto, Deno remoto ou credencial real. testes origem-protegida-banco e assinatura-origem também aprovados. Adicionado a test:emergencia.

## Próximo portão, sem alterar o site existente

Para testar hospedado é necessária autorização específica para criar tabelas/funções candidatas e uma NOVA Edge Function isolada, configurar segredo de assinatura exclusivamente entre servidores e verificar permissões. Não substituir foto-publicada, mudar buckets/RLS existentes, fechar REST ou desligar Pages nessa primeira implantação. O usuário nunca deve enviar segredo pelo chat. Só depois de teste hospedado negativo/positivo preparar substituição do canal de build, URLs de todas as imagens e restrição de origens antigas, com rollback explícito.

Não anunciar proteção completa: fontes antigas permanecem públicas e site atual não foi alterado por esta etapa.
