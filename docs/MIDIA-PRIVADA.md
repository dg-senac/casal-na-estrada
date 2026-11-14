# Fotos novas privadas até a publicação

## Arquitetura

- O bucket `midia` e seus links antigos permanecem públicos e intocados. Esta mudança não torna privados arquivos já enviados. Uma migração de acervo antigo exige inventário e decisão separados, sem promessa de revogar cópias ou caches existentes.
- Novos envios (capas, miniaturas, fotos de álbuns e detalhes de troféus) vão para `midia-rascunhos`, privado, até 10 MB, JPEG/WebP. Nomes UUID imutáveis; não há política de UPDATE. Não há fallback de upload para o bucket público.
- O banco guarda URL estável da função `foto-publicada`, sem tokens. No painel autorizado, somente o `src` das imagens é trocado por um blob baixado com a sessão administradora/AAL2. Formulários, exportação e banco conservam a URL estável. Logout limpa blobs e descarta downloads atrasados.
- A função pública não usa `service_role`, não aceita destinos arbitrários e não copia arquivos. Repassa GET/HEAD ao Storage com o papel `anon`. RLS verifica se o caminho exato está em capa, miniatura ou foto filha de um registro `publicado=true` cuja data não é futura em Recife. Para filho, o pai precisa existir e estar publicado. Imagens órfãs e rascunhos não são públicas mesmo se alguém souber o caminho.
- O administrador com AAL2 pode baixar rascunhos. A função pública ignora credenciais enviadas pelo visitante: sempre consulta como anon.
- Nenhum link temporário é embutido no site estático. A função responde com `Cache-Control: no-store`, inclusive em erros. Uma despublicação impede novas leituras do arquivo, mas não revoga arquivos já baixados, capturas de tela ou imagens já abertas.

## Publicação e limites

`publicado=true` + data elegível libera o arquivo imediatamente no Storage, independentemente do tempo necessário para o GitHub Pages atualizar o HTML. Não é uma área de staging de alterações de registros já publicados: ao salvar nova capa em um registro publicado, ela se torna pública. Para preparar conteúdo privado, mantenha o registro em rascunho.

Se a mesma foto estiver vinculada a outro registro publicado, ela continua pública mesmo que um dos registros volte a rascunho. Referências externas e imagens coladas de outros sites não ganham privacidade com esta mudança. Fotos novas inseridas manualmente no Markdown não são descobertas pela regra; usar os campos de capa/galeria suportados, não copiar links de rascunhos para o Markdown.

A exibição das novas fotos públicas depende da disponibilidade do Storage, banco e função em cada acesso. Há custo/latência por requisição, sem cache público. Revisar uso/cotas conforme o tráfego. O endpoint não lista objetos, limita formato e usa prazo de 15 segundos; falhas de infraestrutura não abrem acesso.

## Implantação

1. Aplicar `202611090003_midia_rascunhos.sql` (aditiva, não toca no conteúdo real nem nos objetos antigos).
2. Publicar `supabase/functions/foto-publicada/index.js`, com `verify_jwt=false` conforme `supabase/config.toml`. Isso é intencional: visitantes precisam carregar fotos sem login; a autorização de cada objeto é feita no Storage/RLS.
3. Validar bucket privado, políticas e função antes de publicar o painel. Nenhuma chave privilegiada deve ir ao navegador.
4. Publicar o PR do painel pelo fluxo normal de aprovação. Até esse deploy, a versão antiga ainda envia ao bucket público.
5. Teste manual com foto não sensível e rascunho próprio: prévia no painel; link em janela anônima negado; publicar e conferir foto; voltar a rascunho e conferir nova requisição negada. Não usar conteúdo privado como primeiro teste. Não fizemos esse teste com sessão real do proprietário.

Não apagar o bucket nem reverter para envio público como rollback silencioso. Se o fluxo falhar, interromper uploads e corrigir a função/políticas. O código antigo não reconhece prévias privadas, portanto reverter apenas o frontend exige aviso ao proprietário.

## Testes automatizados

`npm run test:seguranca`: PGlite executa a migração SQL real com tabelas/roles locais, sem tocar produção. Testa bucket antigo, anon, não administrador, AAL1/AAL2 simulado, rascunhos, data futura, capas/minis, filhos/pais e remoção de vínculo. Testes do endpoint injetam o transporte e verificam falha fechada, método/caminho/tipo, ausência de privilégio e cache; jsdom verifica blob, persistência sem tokens e resposta de download após logout. Não equivale a navegador real nem ao serviço Storage real.

## Estado desta etapa

Migração `midia_rascunhos` aplicada no projeto existente e função `foto-publicada` criada com status ACTIVE. Consulta confirmou `midia.public=true`, `midia-rascunhos.public=false`, 4 políticas novas e 0 objetos no bucket novo. Como anon, referência inexistente retornou false e nenhum objeto privado foi visível. Nenhum arquivo foi enviado, movido ou apagado, nem registro editorial alterado. O CI do PR #34 passou, incluindo build com leitura real do banco e smoke HTTP sem login: caminhos inválido e inexistente retornaram 404 com no-store. O fluxo completo com upload de foto não sensível e sessão real ainda precisa de validação; não foi criado arquivo de teste em produção. O painel só muda após merge/deploy do PR.
