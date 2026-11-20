# Conferência do e-mail “Imagens dos troféus para o Site”

Fonte: mensagem `1a1fb0f26a225930`, Douglas Gabriel, 20/11/2026 às 19h23 (Recife). Conferência visual das peças, consulta à sala de troféus pública e aos 23 cadastros atuais no Supabase. Nenhum registro foi substituído: as oito peças selecionadas não têm cadastro da mesma edição. Imagens copiadas sem filtros, recorte, recoloração ou geração; originais permanecem no Gmail.

| Anexo | Identificação | Ação |
|---|---|---|
|179494.jpg|Highway MC, 5 anos, Recife, 19/11/2026|Incluir placa isolada|
|179487.jpg|15º Taquaritinga Motofest, 05–08/03/2026|Incluir flâmula|
|179497.jpg|10º Campina Grande MotoFest, 20–23/11/2025|Incluir medalha|
|179500.jpg|22º Surubim Motofest, 29–31/08/2025|Incluir placa|
|179503.jpg|Reinauguração da sub-sede Filhos do Éden, João Alfredo, 13/07/2025|Incluir disco|
|179506.jpg|1º Bate e Fica Caveiras 100 Limites, Sairé, 22–23/02/2025|Incluir; NÃO substituir peça dos 10 anos/2026|
|179509.jpg|20º Garanhuns Motofest, 29/11/2025|Incluir|
|179512.jpg|2º Nova Cruz Moto Rock, 15–17/05/2026|Incluir|

## Exclusões expressas
- `179433.jpg`, `179436.jpg`, `179437.jpg`, `179445.jpg`: fotos de pessoas. Não editadas nem incluídas no projeto.
- `179485.jpg`: placa segurada pelas mãos, excluída conforme instrução do usuário. Não será publicada nem usada como foto extra. Foi selecionada somente a imagem isolada `179494.jpg`.

Não foram inventadas histórias pessoais, colocações no pódio ou trajetos a partir dos cenários das fotos. Em eventos com intervalo, a data de ordenação é o primeiro dia impresso na peça. A flâmula e a medalha ficam em Lembranças, não são descritas como troféus de pódio.

## Situação de publicação
- Oito arquivos prontos em `public/media/trofeus/`; manifesto com SHA-256 em `scripts/trofeus-email-2026-11-20.json`.
- SQL idempotente em `scripts/cadastrar-trofeus-email-2026-11-20.sql`, **ainda não executado**.
- Publicar primeiro os arquivos via PR/deploy. Depois revalidar os cadastros contra duplicação, executar o SQL e reconstruir o site. Não inserir referências a imagens ainda indisponíveis no deploy.
- Se nada mudar no banco, são 23 existentes + 8 = 31 cadastros. As 14 inclusões de e-mails anteriores continuam pendentes no SQL específico delas e não foram executadas nesta tarefa.
- Nenhuma troca de foto atual ou alteração de conteúdo real foi feita nesta preparação. A existência das imagens na branch não significa que os oito cadastros já estão no site.
