# Corte: dependência de permissão GitHub

Usuário confirmou Ready da correção7b92030. Nesta rodada:
- tests/corte-origens.mjs aprovado em PGlite: SQL ida/volta sintético,7políticas, gatilhos, bucket público/privado. Isso não prova fluxo real.
- Releitura Supabase metadados confirmou7políticas leitura_publica,2políticas Storage relevantes, midia.public=true e wrapper de conteúdo existente. Nenhuma alteração remota SQL realizada.
- Tentativa `gh workflow disable deploy.yml && gh api --method DELETE repos/dg-senac/casal-na-estrada/pages` parou no primeiro comando com HTTP403 Resource not accessible by integration. DELETE NÃO EXECUTOU por causa de &&. Workflow e Pages NÃO foram desativados.
- Falha é permissão do workflow pela integração, não senha/MFA do usuário. Não pedir credencial/token/novo segredo. Não afirmar que corte terminou.

Próximo passo: usuário desativar workflow Publicar no GitHub Pages em Actions (menu ... -> Disable workflow). Uma ação de painel por vez. Depois tentar retirada Pages autorizada via API, se permitida; se403 também, usuário unpublish em Settings->Pages. Não repetir chamada disable negada sem mudança de autorização.

Não fechar origens ainda: Pages permanece público e depende das fotos antigas. Depois de desligar publicação Pages, aplicar corte SQL transacional autorizado e conferir dados publicados via canal servidor e ACL/negações. indexação/texto produção ainda precisa ajuste coordenado. Branch ativa mantida; sem merge.
