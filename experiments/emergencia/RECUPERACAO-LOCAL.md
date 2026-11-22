# Recuperação em banco local: prova concluída

Executar `node tests/recuperacao-editorial-banco.mjs` com dependências instaladas. Usa PGlite em memória, sem URL/credencial de Supabase ou Cloudflare, sem gravação em produção. Nenhum banco novo foi criado em provedor externo.

`recuperacao-local.mjs` contém esquema REPRESENTATIVO no namespace recuperacao: sete tabelas com UUID, colunas tipadas selecionadas (datas, publicado, slug, horário), PK/UNIQUE/NOT NULL, FKs e checks de horário e intervalo de datas. O registro completo é preservado em JSONB, incluindo campos não mapeados para colunas tipadas. NÃO é réplica integral do esquema real; não valida todas as colunas, funções, triggers, defaults, permissões ou RLS. Não é um importador de produção.

A recuperação valida o pacote antes de entrar na transação, exige destino vazio, insere pais antes de filhos, compara contagens e confirma a transação apenas ao final. Usa parâmetros para valores e lista fixa para nomes de tabelas/colunas. Falhas fazem rollback. Não há TRUNCATE, DELETE, UPDATE ou upsert de dados existentes. A exclusividade é a da transação PGlite local; não assumir segurança contra concorrência de outros escritores num futuro banco remoto.

Testes aprovados:
- Recuperação das sete tabelas com comparação integral do JSON antes/depois, incluindo rascunho, Unicode, null, ficha de rota e referências.
- Tabela filha vazia preservada.
- Nova tentativa em destino já preenchido recusada, dados existentes preservados.
- Constraints nativas recusam chave estrangeira inexistente e PK duplicada.
- Recuperação falha com rollback de todas as tabelas por hora 24:00, término anterior ao início, data impossível, boolean obrigatório nulo, UUID de filho inválido (depois de inserir pais) ou slug duplicado.
- Pacote truncado recusado antes de inserir.
- Testes de formato e do botão experimental continuam aprovados.

Ainda pendente antes de backup real: captura autenticada e consistente da origem, esquema exato e validação completa em restauração isolada representativa, versão de migrações, manifesto/cópia binária de mídia, origem/autenticidade do pacote, destino privado independente, cotas/retenção e auditoria. Checksum não é assinatura nem garante completude da captura.

Nada para o usuário publicar ou configurar nesta etapa. Próxima etapa proposta: desenhar captura consistente das sete tabelas via função administrativa somente leitura, com sessão/MFA e tamanho limitado, sem expor service_role ao navegador. Preparar/testar localmente antes de pedir aprovação de qualquer migração no banco real.
