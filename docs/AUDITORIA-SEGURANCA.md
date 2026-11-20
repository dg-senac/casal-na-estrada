# Auditoria e reforços de segurança

## Escopo e método
Revisão de código do site estático, painel, sanitização, URLs, autenticação/MFA, inatividade, regras SQL de autorização, uploads, função de mídia e workflows. Consulta somente leitura das políticas, flags RLS, buckets e privilégios de execução das rotinas no Supabase. Testes de autorização em PostgreSQL isolado (PGlite), sem alterar conteúdo real e sem testes de carga.

## Achados e correções nesta branch

1. **Dependência vulnerável:** atualização do Astro para 7.4.13, com Node mínimo 22.23.4 também nos workflows. O audit anterior apontava uma dependência moderada, incluindo avisos de XSS e travessia de caminho. O aviso do endpoint de imagens do adaptador Node não demonstra exploração deste site, que é estático e não usa esse adaptador. Após a atualização, `npm audit` retornou zero vulnerabilidades conhecidas. CI passa a rejeitar também avisos moderados.
2. **Leitura antecipada de posts agendados pela API:** a política instalada permite SELECT de qualquer post `publicado=true`, sem verificar a data. Ocultar no build não protege o registro na API. Migração `supabase/migrations/202611190001_agendamento_privado.sql` restringe a leitura pública até o dia corrente em Recife e preserva a política administrativa independente. Não aplica restrições às datas de eventos/troféus. **Migração preparada e testada localmente, ainda não aplicada ao banco real.** O filtro do build agora também usa Recife.
3. **Defesa adicional contra XSS no painel:** CSP de produção nega scripts inline/eval, objetos e frames, restringe conexões à origem Supabase configurada. Estilos inline continuam permitidos por compatibilidade; imagens externas continuam possíveis. CSP via meta não protege contra enquadramento por outros sites (`frame-ancestors` requer cabeçalho HTTP). A política não é injetada em desenvolvimento para não quebrar HMR. O HTML compilado tem um único script externo e nenhum script inline.
4. **URLs:** link dinâmico do painel passa pelo validador de protocolos existente; prévia rejeita também barras invertidas que navegadores podem interpretar como autoridade externa. São reforços preventivos; não foi demonstrada uma cadeia de tomada de conta por esses pontos.
5. **Referência de navegação:** painel usa `no-referrer`; páginas públicas usam `strict-origin-when-cross-origin`.

## Proteções confirmadas e limites

- Todas as tabelas inspecionadas em public e painel_privado estão com RLS habilitada. Escrita de conteúdo/storage exige administrador autorizado; a autorização não depende de metadados editáveis do usuário.
- Funções de publicação/configuração não têm execução concedida ao papel anônimo. Funções internas de disparo também não estão concedidas ao usuário autenticado. A revisão dos privilégios não substitui auditoria de infraestrutura/provedor.
- Chave Supabase anon/publicável no frontend é esperada. Não deve ser trocada por service_role. A segurança depende da RLS, não de esconder essa chave.
- Bucket novo `midia-rascunhos` é privado, limitado a 10 MiB e JPEG/WebP. Bucket legado `midia` continua público por compatibilidade: arquivos antigos nele não têm confidencialidade de rascunho. Não foi tornado privado automaticamente para evitar quebrar fotos existentes.
- MFA existente exige AAL2 quando há fator confirmado; não é uma exigência universal de cadastrar MFA. Recomenda-se confirmar que todas as contas administrativas tenham fator ativo.
- A CSP não elimina todos os riscos de XSS nem substitui sanitização. Links HTTPS e imagens externos ainda podem rastrear acessos.
- GitHub Pages não oferece configuração geral de cabeçalhos por arquivo neste projeto. Anti-enquadramento via cabeçalho, políticas de borda/WAF e limitação de tráfego exigem suporte da hospedagem/proxy. Não há promessa de resistência absoluta a ataques ou indisponibilidade do provedor.
- Nenhuma senha foi alterada e nenhum teste destrutivo foi realizado. Configurações de Auth/rate limit e MFA efetivamente cadastrado não foram confirmados nesta rodada.

## Validações realizadas

- `npm audit`: zero vulnerabilidades conhecidas após atualização.
- `npm run test:seguranca`: aprovado, incluindo regressões de Markdown/URLs/JSON-LD, controle de acesso/MFA, inatividade, mídia, nova RLS de agendamento e CSP.
- Astro check: 22 arquivos, zero erros/avisos/hints.
- Build com fixture local: aprovado; dados de exemplo não foram publicados.
- HTML compilado do painel inspecionado para compatibilidade de scripts com a CSP.
- `git diff --check`: aprovado.

Testes executados com Node 22.23.4. Não houve teste interativo completo do painel em navegador autenticado. Antes da publicação, revisar PR, aplicar a migração SQL ao Supabase e publicar o código com dados reais. Nenhuma dessas alterações está automaticamente em produção apenas por existir nesta branch.
