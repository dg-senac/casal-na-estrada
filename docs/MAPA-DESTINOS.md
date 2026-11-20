# Destinos automáticos e precisão manual

## Uso no admin
No Diário e em Troféus, o bloco **Destinos no mapa** permite selecionar cidade/UF da lista local de municípios brasileiros. Adicione até 30 cidades por registro. Abra **Mostrar mapa / ajustar ponto** e clique no local desejado, ou preencha latitude e longitude. **Usar centro da cidade** remove o ajuste de coordenadas; **Remover destino** exclui somente a associação, não a publicação.

Sem destinos explícitos, continua valendo a localização já cadastrada: local/UF no Diário e cidade/UF nos Troféus. Nomes não reconhecidos e estados continuam na lista, sem inventar coordenadas. Com destinos explícitos, eles substituem a localização livre para o índice de lugares e para o mapa; o texto da publicação permanece intacto. Use todos os destinos visitados, inclusive o principal.

O ponto representa o município, não desenha rota. Se houver ajustes distintos para uma mesma cidade em vários registros, prevalece o primeiro ajuste encontrado na ordem dos conteúdos (diário antes de troféus). Para pontos distintos dentro da mesma cidade, seria necessário outro modelo de mapa por atrações.

Só conteúdos públicos entram no mapa; posts futuros continuam filtrados pelo fluxo existente. A atualização depende de salvar/publicar e concluir um novo build, não é rastreamento ao vivo ou localização do visitante. Lista por estado, estrutura geral e tipografia preservadas. Busca do diário inclui os destinos adicionais.

## Ativação
1. Aplicar `supabase/migrations/202611200001_destinos_mapa.sql` antes do deploy do novo painel.
2. Publicar o código pelo fluxo de PR/deploy.
3. Testar com um registro descartável ou rascunho: duas cidades, coordenada manual, reset e reabertura do cadastro. Só então publicar o conteúdo desejado.

A migração é aditiva e idempotente: acrescenta JSONB com padrão vazio a posts/trofeus e valida formato, UF, máximo de cidades e limites das coordenadas no banco. Mantém as políticas RLS existentes, sem liberar escrita anônima. A função de validação fica no schema privado, sem execução pública. Nenhum dado antigo é migrado ou reescrito. Builds antigos continuam funcionando; o novo painel precisa da migração para salvar registros com destinos.

## Testes
`npm run test:seguranca` inclui `tests/destinos-mapa.mjs`: editor via DOM, clique no mapa simulado, reset, remoção, múltiplas cidades, duplicatas, coordenadas inválidas e migração SQL em PGlite isolado. `tests/mapa.mjs` verifica o mapa compilado com fixture, links e fallback quando tiles/mapa falham. Não foi feita edição de conteúdo em produção nem teste visual autenticado em navegador real.

## Ativação nesta entrega
Migração aplicada ao Supabase e associação confirmada na publicação `26f336cd-a8b1-49e8-a75b-c19642375244` (Belo Jardim, Sanharó e Pesqueira). Foram alterados somente os destinos do registro; texto, fotos e data preservados. As três cidades usam o centro municipal, sem coordenadas de visita inventadas. O novo mapa precisa do deploy do código.
