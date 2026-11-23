# Ativação do build pelo canal assinado já publicado

## Confirmação recebida

Usuário executou o teste hospedado e confirmou: 2 posts,1 álbum,31 troféus,3 encontros publicados, origem sem assinatura HTTP403. Nenhum backup/manutenção alterado. Não repetir configuração de segredo ou instalação de SQL.

## Mudança desta etapa

scripts/build-cloudflare-teste.mjs passa a fixar CONTEUDO_BUILD_URL no endpoint /conteudo-build.json do Worker paralelo, usando configurarCanalBuild. Reusa endpoint publicado na etapa anterior: não há ciclo de bootstrap. Chave/URL pública Supabase permanecem para configuração do admin e validação de configuração, MAS consultas de conteúdo do Astro passam pelo leitor novo, sem credencial Supabase no GET ao Worker e sem fallback REST em caso de erro. Não há segredo novo em build/painel.

Fixture local força canal vazio e mantém DADOS_FIXTURE apenas nos testes. Host externo por override de ambiente não é aceito. Marca _build-teste.json inclui fonteConteudo=worker-assinado para build real e fixture para teste; publicador recusa builds antigos sem marca nova e fixtures. Isso é guarda operacional, não assinatura contra invasor que edite artefatos.

Mensagem de diagnóstico do endpoint foi atualizada para não afirmar que build ainda não foi trocado após esta publicação. A efetiva conclusão remota só pode ser confirmada por build Ready de commit com essa ativação, não por saída de teste anterior.

## Evidência local

Node22.23.4 tests/ativacao-canal-build.mjs e leitor-build-integracao aprovados (ambiente fixo/cache/ausência de fallback); test:cloudflare:local aprovou compilação fixture, bundle e runtime/D1/HMAC locais; conteudo-build-candidato com SQL local+diagnóstico aprovado; test:seguranca completo e Astrocheck23 sem erros/avisos/hints. Não foi executado build local com rede real; rede do sandbox não permite acesso direto ao Worker. Dist ao final é fixture e não pode ser publicado.

## Publicação e próxima ação

Push somente na branch paralela dispara Cloudflare Builds normal, que terá de ler endpoint real publicado. Usuário confirma Ready do novo commit. Se Ready, prova que essa compilação usou canal novo; não exige novo backup ou manutenção para verificar. Se falhar, ler log sem expor segredos, manter publicação anterior; não reabrir automaticamente manutenção nem habilitar fallback REST como atalho.

Durante manutenção, compilação nova deve falhar: esse é comportamento intencional para não exportar conteúdo pela rota pública com site bloqueado. Publicação anterior continua, ainda sujeita à guarda D1 em runtime. Não mudar estado só para compilar.

## Fora desta mudança

Nenhuma política RLS/Storage alterada, Pages intacto, sem migração definitiva, merge ou contratação. Canais antigos continuam públicos até fechamento autorizado. Publicação automática por edição do painel ainda precisa garantir acionamento de build Cloudflare antes de trocar a hospedagem: gatilho atual de Pages não equivale a publicação do Worker. Não anunciar projeto inteiro terminado só porque fonte do build foi substituída.
