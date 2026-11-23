# Guarda persistente da origem — prova em Postgres local

Implementação candidata em experiments/origem-protegida/candidato.sql. NÃO é migração pronta para produção; não aplicar no Supabase. Nenhuma chamada remota foi executada nesta etapa, nenhuma permissão real alterada.

## Avanço concreto

A assinatura da etapa anterior agora foi integrada, nos testes, a funções Postgres reais em PGlite (não apenas Set/mocks de nonce):

- origem_worker.nonces com PK e índice de expiração; consumir_nonce usa lock exclusivo da tabela para serializar limpeza/capacidade/inserção. ON CONFLICT impede consumir o mesmo nonce duas vezes. Timestamp de expiração aceito só no futuro e até 66 segundos do relógio do banco. Diferença de relógios pode rejeitar pedidos legitimamente; falha fechada é intencional. Limpeza até 100 expirados por chamada, capacidade 10 mil; não é tabela de histórico editorial.
- foto_publicada reconhece referências explícitas de capas/miniaturas/fotos e filhos nas sete tabelas pertinentes (vídeos não são imagens). Exige publicação e, para posts, data já alcançada em Recife; filhos dependem do pai publicado. Caminhos restritos aos dois buckets atuais. Arquivos sem referência, rascunhos, posts futuros e outros buckets não são autorizados.
- Schema/tabela/funções sem permissão PUBLIC. SECURITY DEFINER com search_path vazio; proprietário é quem cria no banco local. NENHUMA role cliente foi autorizada e não há RPC exposta no schema public. Um adaptador futuro precisa acesso servidor limitado e owner fixado/revisado antes de qualquer implantação real.

## Testes executados

Node22.23.4 tests/origem-protegida-banco.mjs aprovado: nonce único em disputa entre duas chamadas, replay negado, expiração inválida negada, limpeza limitada funcionando, limite 10 mil recusando nova entrada, visitante sem acesso às duas funções. Publicado permitido; rascunho/futuro/objeto sem referência/path inválido/filha de álbum privado negados; publicar pai libera referências esperadas. Fluxo HMAC real -> consumir_nonce SQL -> foto_publicada SQL -> leitura fictícia executado e repetição impedida. Nenhum binário real no teste. assinatura-origem também passou. Incluído em test:emergencia.

## Limites que impedem ativação imediata

- Ainda não existe adaptador Supabase Edge para consumir essas funções com identidade servidor delimitada, nem configuração de segredo compartilhado/rotação. Não usar chave anon ou token do administrador como segredo.
- Encadear consulta de publicação e leitura cria intervalo de concorrência: adaptador deve checar publicação novamente antes de entregar bytes quando necessário; não alegar snapshot atômico entre Postgres/Storage. Cópias já recebidas nunca são revogadas.
- Comparação de URLs é exata: variantes percent-encoded, URLs externas e mídia embutida em Markdown/HTML exigem inventário. Negar por padrão protege rascunhos mas pode quebrar imagens legítimas sem planejamento; não mudar URLs reais ainda.
- Lock exclusivo por imagem é seguro para unicidade/capacidade, mas serializa requisições. Medir contenção/latência/CPU e consumo de cotas; avaliar alternativa transacional mais eficiente antes de produção. Teste Promise.all usa conexão PGlite local serializada, não prova concorrência distribuída Supabase. O lock SQL oferece a exclusão prevista, ainda precisa ensaio hospedado autorizado.
- Ao atingir capacidade, pedidos são negados; limpeza limitada pode exigir várias chamadas após longas pausas. Não aumentar limite ou remover proteção para fazer teste passar.
- REST anônimo continua necessário ao build atual; bucket midia e Edge Function antiga continuam públicos. Esta prova NÃO fecha bypass, não muda hospedagem nem conclui contenção.

Próximo trabalho: inventário de referências compatíveis e desenho do adaptador com identidade servidor, plano de mudança/rollback para build e Storage. Qualquer alteração real deve ser apresentada ao usuário antes de executar. Nenhuma ação de painel necessária nesta etapa.
