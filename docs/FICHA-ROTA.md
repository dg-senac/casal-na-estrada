# Ficha opcional da rota — etapa 2

No Diário do admin, o bloco “Ficha da rota (opcional)” permite preencher origem, destino/percurso, sentido da distância (somente ida ou ida e volta), tempo aproximado, paradas, abastecimento, pedágios, gastos, asfalto, observações e data das informações.

A distância reaproveita o campo Distância já existente: não cria outro número nem soma quilômetros novamente. Para aparecer na ficha, selecione somente ida/ida e volta e preencha a distância do cadastro. Tempo e custos são textos livres para informar contexto, moeda e se incluem paradas ou se são por pessoa.

No relato, a ficha aparece ao final do corpo apenas quando há informação útil. Campos vazios não aparecem. Sem ficha preenchida, o post mantém sua apresentação anterior. Para remover uma ficha, limpe todos os seus campos, inclusive a seleção do sentido da distância. Não há preenchimento retroativo nem inferência de estrada segura, preços ou locais.

## Ativação pendente
Antes de publicar o novo painel, aplicar `supabase/migrations/202611210001_ficha_rota.sql` no Supabase. Ela acrescenta `posts.ficha_rota` JSONB com padrão vazio e valida chaves, tipos, datas e limite de 1.000 caracteres por campo. Herda a RLS do post, sem liberar acesso a rascunhos/agendamentos. O build tolera a coluna ausente na leitura; salvar pelo novo painel exige a migração.

**Migração não aplicada nesta etapa. Nenhum dado real foi alterado. Sem PR ou merge, conforme combinado.**

## Validação
- Teste `tests/ficha-rota.mjs` incluído em `npm run test:seguranca`: normalização, limpeza pelo formulário, valores inválidos e SQL idempotente em PGlite isolado.
- Astro check: 23 arquivos sem erros, avisos ou hints.
- Build com fixture temporária: ficha parcial exibida, unidade da distância preservada, data brasileira, campos vazios ocultos e texto com tags HTML escapado (não executado). Outro relato sem ficha continua sem o bloco.
- Teste de SEO da etapa 1 aprovado novamente.
- Não foi realizado teste interativo no painel autenticado com dados reais.
