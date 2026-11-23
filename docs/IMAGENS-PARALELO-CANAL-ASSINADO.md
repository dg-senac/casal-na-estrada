# Imagens do paralelo usando o canal assinado

## Alteração entregue

Build Cloudflare pós-processa artefatos textuais HTML/JSON/JS/CSS/XML substituindo dois prefixos conhecidos de imagem Supabase por URLs absolutas do MESMO Worker paralelo em /midia-protegida/midia/... ou /midia-protegida/midia-rascunhos/.... Inclui imagens de corpo Markdown/HTML que gerem esses URLs literais, links de zoom, miniaturas e metadados presentes nos artefatos. Também trata JSON com barras escapadas. Não altera registros no banco, scripts fonte de edição, binários ou build Pages. Não garante cobertura de URLs transformadas/concatenadas por código arbitrário ou externos; precisa validação visual/inspeção hospedada.

URLs absolutas preservam exigência de OG/RSS. Host é explicitamente o Worker paralelo; mudar para produção depois exige configuração/revisão, não assumir que funciona em qualquer domínio.

Router só atende /midia-protegida depois de verificar manutenção e método; helper verifica novamente antes/depois da origem. Usa HMAC do runtime no servidor para chamar Edge midia-worker. Sem token de usuário/chave privilegiada nesse pedido e sem assinatura no URL/HTML. Formatos/tamanho estritos, sem redirects/cache. HEAD não retorna corpo mas faz leitura para verificar. Nenhum fallback para URL pública antiga se houver falha: erro fecha acesso. Não protege Bytes já recebidos/caches antigos.

As funções atuais do Supabase e Pages continuam disponíveis. Esta etapa faz o paralelo USAR o novo canal; NÃO fecha a origem antiga e NÃO muda o canal de leitura REST usado pelo build. Admin mantém edição/autenticação direta existente. ZIP/D1/controle de emergência não alterados.

## Evidência

Usuário confirmou previamente teste hospedado: imagem assinada 193340 bytes image/jpeg, sem assinatura HTTP403. Não repetir backups/ativar manutenção só por essa confirmação.

Testes locais Node22.23.4: test:cloudflare:local (inclui novo proxy real no workerd com HMAC verificado e manutenção negada), suíte emergência (inclui reescrita idempotente, JSON escapado, OG/RSS absolutos, binários e Auth/externos preservados, proxy GET/HEAD/paths/consulta/D1), suíte segurança e Astrocheck 23 arquivos sem erros/avisos/hints. Todos passaram. Dist contém fixture, nunca publicar diretamente; deploy será pelo build remoto normal.

## Próximo teste do usuário

Após Ready da branch de teste, abrir site paralelo (não Pages), recarregar e conferir capas do diário, álbum/zoom e troféus. Não acionar emergência para isso, não mexer em segredo/banco. Relatar imagem quebrada/página concreta se houver; não enviar tokens/segredo. Apenas após essa validação considerar parte de imagens do bloco1 concluída remotamente.

## Marcos restantes, sem redefinir o pedido

Bloco1: imagens agora integradas; ainda substituir leitura pública do build por canal servidor seguro antes de revogar REST público.
Bloco2: plano + autorização específica + teste para fechar acesso público às origens Supabase antigas, preservando admin/Auth e critérios de publicação.
Bloco3: aprovação explícita da migração final/Pages, ajuste de URLs/SEO/configuração e teste final com rollback.

Não afirmar estimativa de minutos/percentual ou bloqueio total enquanto dependências não estiverem resolvidas.
