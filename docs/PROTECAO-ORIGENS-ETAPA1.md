# Proteção das origens — primeira etapa, sem ativação

## Mapa do código atual

- src/lib/supabase.ts consulta REST no BUILD Astro usando chave pública; src/lib/dados.ts transforma dados em páginas estáticas. Não há leitura REST dinâmica do visitante nas páginas públicas identificada nesse caminho. Portanto bloquear REST anônimo sem substituir o canal de build quebra novas compilações, não remove HTML já publicado.
- src/scripts/admin.js usa Supabase diretamente para login/MFA e edição; não bloquear indiscriminadamente o domínio Supabase na CSP ou revogar todo authenticated. Controlador/backup também dependem de Auth e RPC administrativa com AAL2.
- src/lib/midia-privada.js persiste URLs estáveis /functions/v1/foto-publicada/v1/....webp. A Edge Function do repositório usa chave anon internamente, respeita RLS de publicação e não consulta manutenção D1. Não foi consultada/reimplantada a versão remota nesta etapa.
- Fotos antigas usam Storage público midia. Bucket público é caminho direto independente do Worker; proxy sozinho não remove esse acesso.
- Imagens public/media são assets estáticos; Worker paralelo já consulta estado antes de entregá-los. Pages original continua origem alternativa e workflow deploy.yml publica main/a cada 10 min/manual. Não alterar workflow ou desligar Pages nesta etapa.
- Corpos de texto podem conter imagens/URLs embutidas; trocar somente capa/foto_url não basta. Novas URLs precisam percorrer todos os campos/páginas, sem modificar registros originais ou expor rascunhos.

## Código candidato implementado e testado

cloudflare/midia-publica-candidata.mjs NÃO importado pelo site-worker e sem deploy. Rota proposta /midia-protegida/privada/v1/UUID.webp ou /midia-protegida/publica/caminho.jpg. Destinos fixos no projeto conhecido; não aceita URL arbitrária/query/caminho codificado com barras/traversal/extensões executáveis. Nenhuma chave/cookie/Authorization do visitante é encaminhada. Só JPEG/PNG/WebP, até 10 MiB, timeout, sem redirects ou cache, resposta com headers próprios sem Set-Cookie/Location/CORS da origem. GET/HEAD apenas. D1 fechado/falho bloqueia; nova conferência D1 após ler origem evita entregar se manutenção começou durante a busca. Não impede requisição já concluída antes da manutenção, cópias salvas ou caches históricos.

Testes fixtures em tests/midia-publica-candidata.mjs aprovados: paths, UTF8, cabeçalhos, método, origem fixa, redirects, HTML recusado, manutenção antes/durante leitura e falha D1. Incluído na suíte emergência. Nenhuma foto real lida nem permissão alterada nesta etapa.

## Limite central (não confundir proxy com proteção completa)

O candidato busca apenas fontes que JÁ são públicas. Isso é deliberado para não introduzir service_role nem vazar rascunhos na prova. Ele NÃO fecha acesso direto ao Supabase. Se revogar acesso anônimo hoje, o candidato e build falham. Antes de ativar de verdade precisamos projetar um canal exclusivo servidor para conteúdo publicado, com autorização não reutilizável pelo visitante e critério de publicação mantido no servidor. Não passar credencial privilegiada ao build público, browser, HTML ou repositório; não usar service_role como atalho genérico para servir objetos.

## Próximos portões técnicos

1. Mapear/verificar políticas reais de REST/Storage/Edge Function por consultas somente leitura, sem listar segredos nem copiar corpos que possam conter tokens.
2. Preparar substituição do canal de build e de mídia com autorização servidor-servidor restrita a conteúdo publicado. Cobrir preview/admin e Auth separadamente.
3. Testar páginas/Markdown/capas/miniaturas/zoom, visitantes e rascunhos no paralelo; só então propor mudanças remotas exatas com aprovação e rollback.
4. Remover caminhos públicos alternativos exige mudança no Storage/políticas/Edge Function e decisão sobre Pages. Nunca anunciar bloqueio completo só porque imagens passaram a usar proxy.

Usuário autorizou início técnico, não migração definitiva nem novas permissões/segredos remotos. Nenhuma ação necessária dele nesta primeira etapa.

## Confirmação anterior preservada

Usuário confirmou ciclo completo do backup integrado: cópia editorial f1db2bfe-c85a-445e-b771-c178287d0a18, 22 fotos/3.709.108 bytes armazenadas, ZIP D1 baixado e validado (CRC/manifesto/SHA256), reabertura funcionou. Tabelas snapshots_fotos/objetos_snapshot_fotos já criadas pelo usuário; não pedir novamente. Não repetir emergência e consumir vagas apenas para testar esta rota candidata.
