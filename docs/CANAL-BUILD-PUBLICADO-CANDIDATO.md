# Substituição do REST público no build — preparado, ainda não ativado

## Confirmação anterior

Usuário confirmou que capas/fotos/zoom do paralelo abriram normalmente após build b4bcaa2 com URLs protegidas. Parte de imagens validada remotamente; não repetir backups ou teste de emergência para isso.

## Canal preparado

- SQL candidato conteudo-publicado-candidato.sql: função de leitura que entrega versão1 com posts/albuns/trofeus/encontros e filhos públicos embutidos. Posts exigem data alcançada em Recife; demais pais exigem publicado. Campos permitidos explicitamente, não select* exportado: novas colunas não vazam por padrão. Ficha da rota opcional é selecionada do JSON quando existir, sem exigir migração pendente de coluna. Filhos vêm apenas de pais publicados e campos explícitos. JSON máximo2MiB. Sem Auth, lista de admins, timestamps internos ou rascunhos. RPC e schema negados a anon/authenticated, execução só pelo canal servidor. Candidato ainda NÃO aplicado; OWNER/grants reais devem ser revisados na futura migração.
- Protocolo assinatura-conteudo.mjs usa propósito conteudo-worker-v1, separado de imagens. Reutiliza segredo existente mas assinatura de imagem não autoriza conteúdo. Nonces persistentes existentes reaproveitados. Sem novo segredo a pedir ao usuário.
- Edge candidata recebe assinatura válida antes de chamar a nova RPC privada. Chave interna só na Edge. Não altera função hospedada até nova autorização.
- Worker candidato /conteudo-build.json entrega SOMENTE conteúdo já público enquanto aberto. Consulta D1 antes/depois da busca. Ele é intencionalmente legível publicamente quando site aberto — não é endpoint de backup privado. Não importado no router nesta etapa.
- src/lib/conteudo-build.js lê URL fixa desse mesmo Worker, sem apikey/Authorization, sem redirects, máximo2MiB e sem fallback. src/lib/supabase.ts ganhou opção de servidor CONTEUDO_BUILD_URL, cache único por build, quatro tabelas permitidas, filhos já embutidos. Variável ainda NÃO configurada pelo script Cloudflare; build atual continua como antes. Fixture segue tendo precedência só em testes.

## Estratégia de ativação sem ciclo de bootstrap

1. Aprovar/instalar RPC aditiva + extensão de rota conteudo na Edge isolada midia-worker, sem substituir ramo de imagens ou fechar REST/buckets atuais. Registrar SQL aplicado e validar ACLs depois.
2. Publicar rota Worker e teste protegido; ainda manter build atual lendo REST. Confirmar assinatura e retorno público sem rascunhos na hospedagem.
3. Só depois ligar CONTEUDO_BUILD_URL no script de build, para ler endpoint já publicado, sem exigir variáveis secretas de build no painel Cloudflare. Durante manutenção um novo build deve falhar sem fallback; versão já publicada permanece. Entender que ciclo de publicação do conteúdo ainda precisa conexão de deploy, não assumir que gatilho GitHub Pages publica no Worker.
4. Apenas com rebuild confirmado, propor restrição dos acessos diretos ao Supabase e plano de rollback. Não desligar Pages junto desta ativação.

## Evidência local

Tests conteudo-build-candidato.mjs (PGlite + HTTP simulado) faz build sem credencial -> Worker -> HMAC -> Edge -> SQL sob papel servidor. Publicado/filhos aparecem; rascunhos/futuros/filhos privados e coluna sensível nova criada na fixture não aparecem. RPC negada anon/authenticated; assinatura de imagens negada; manutenção aborta leitura sem consultar RPC.

Tests leitor-build-integracao.mjs transpila o src/lib/supabase.ts real e exercita o ramo configurado, cache e ausência de fallback REST em falha. Testes de candidato e leitor aprovados, Astrocheck23 arquivos sem erro/aviso/hint, test:cloudflare:local com fixture/runtime/regressões aprovado. Sem dados reais novos exportados e sem migração/deploy nesta etapa.

## Autorização pendente

Nova consulta SQL aumenta escopo do canal da Edge de imagens para conteúdo textual público. Pedir autorização específica para adicionar essas funções e a rota isolada. Não interpretar simples confirmação visual das fotos como aprovação para alterar leitura/permissões reais. Nenhuma necessidade de novo segredo/painel/cartão para esse ajuste. Canais públicos antigos continuam abertos até plano de fechamento explicitamente aprovado.
