# Revisão de segurança — escopo e resultados

Revisão pontual, não certificação nem garantia de ausência de vulnerabilidades.
Na revisão inicial não houve brute force, teste de carga, escrita de payloads em produção ou alteração de contas/políticas reais. Na etapa seguinte, autorizada pelo proprietário, a migração de administradores abaixo foi aplicada e verificada.

## Corrigido nesta revisão

- Markdown do diário/troféus: sanitização com lista fechada de tags/atributos e protocolos; remove scripts, manipuladores de eventos, formulários, estilos e embeds arbitrários.
- Prévia administrativa: sanitização própria com DOMPurify, incluindo remoção explícita de URLs data:/blob:. A prévia tem acesso ao contexto autenticado, então não deve renderizar HTML arbitrário.
- JSON-LD: serialização que impede texto como `</script>` de escapar do bloco JSON.
- URLs do conteúdo que passam pelo helper `url()`: bloqueio de protocolos executáveis e URLs de rede ambíguas. Não equivale a auditoria de todo link externo possível.
- Upload pelo painel: tipos JPEG/PNG/WebP/AVIF explicitamente permitidos e teto de entrada de 10 MB; imagem reprocessada pelo canvas. Essas validações no navegador não substituem as regras do Storage.
- Astro atualizado de 5 para 7.4.1 e dependências transitivas atualizadas. Necessário Node >=22.22.0 (CI usa Node 22). A migração passou por build estático, tipos e regressões locais.
- `npm audit`: antes, 5 pacotes apontados (1 crítico, 3 altos, 1 baixo); depois, 0 alertas conhecidos no lockfile no momento da consulta. Isso não prova inexistência de falhas nem que os cinco alertas eram exploráveis no site estático.
- CI passou a executar auditoria de dependências (bloqueio em alto/crítico) e testes de sanitização.

## Verificações reais, somente leitura

- Supabase: RLS habilitada em todas as 8 tabelas públicas inspecionadas, inclusive `config`.
- Políticas públicas de conteúdo limitam leitura a `publicado=true`; tabelas de fotos/vídeos dependem da publicação do registro pai.
- Consulta sob o papel `anon`: 0 registros não publicados visíveis nas quatro tabelas principais. Não foram criados rascunhos para testar: o resultado depende também dos dados existentes, complementado pela inspeção das políticas.
- `anon` não tem SELECT em `config`: tentativa de leitura foi rejeitada pelo banco.
- `anon` não tem EXECUTE em `publicar_agora()`, `status_publicacao()` e `definir_token_github(text)`.
- EXPLAIN (sem ANALYZE, sem executar UPDATE) de alteração de posts como `anon`: plano com filtro constante `false`, nenhuma linha elegível. Inspeção das políticas também não encontrou INSERT/UPDATE/DELETE públicos nas tabelas de conteúdo ou no bucket.
- Cadastro público e usuários anônimos de autenticação desativados. Rotação de refresh tokens habilitada.
- Bucket `midia`: público por intenção, limite de 10 MB e tipos JPEG/PNG/WebP/AVIF; escrita inicialmente restrita ao papel autenticado; na etapa seguinte foi limitada aos administradores autorizados.
- API do GitHub Pages informa `https_enforced=true`.
- Busca heurística nos arquivos versionados atuais não encontrou padrões de tokens privados GitHub/Supabase nem chaves privadas PEM. Não foi feita varredura completa de histórico nem de todos os formatos de segredo. A chave anon/publicável não é um segredo e depende da RLS.

## Testes locais

`npm run test:seguranca`: 12 entradas maliciosas testadas tanto na conversão Markdown quanto na prévia (scripts, eventos em imagens, SVG/MathML, iframe/srcdoc, URLs javascript:/data:/vbscript:, formulários e estilos). Testa preservação do Markdown legítimo, protocolos e JSON-LD sem fechamento de script.

Build com fixture, `astro check` sem diagnósticos, testes de mapa, pesquisa, carrossel e relógio dos encontros aprovados. Não houve teste em navegador real: testes DOM usam jsdom.

## Pendências / limites importantes

1. **Resolvido na etapa de administradores autorizados:** autenticação não concede mais administração automaticamente. Lista privada por UID, 28 políticas de conteúdo + 3 de Storage e 3 RPCs verificam a autorização. A conta existente foi preservada. Consulte `docs/ADMINISTRADORES.md`.
2. **2FA no painel implementado; proprietário informou ter ativado.** Estado posterior não foi consultado pelo agente. O `/admin` permite cadastrar TOTP e confirmar o primeiro código. Depois de confirmado, banco, Storage e RPCs exigem AAL2. Antes disso, só a conta autorizada entra com senha, como transição para não bloquear o proprietário. Consulte `docs/MFA.md`. O 2FA de GitHub/Supabase é separado e também deve ser ativado nas respectivas contas.
3. Política atual permite senha mínima de 6 caracteres; usar senha única e longa (16+), preferencialmente com gerenciador. CAPTCHA e bloqueio de senhas vazadas não estão habilitados. Não testamos força bruta nem a efetividade dos limites do provedor.
4. Arquivos no bucket público são públicos mesmo se o registro ficar em rascunho. Não armazenar documentos ou fotos privadas nesse bucket.
5. Publicação agendada é escondida pelo código do site; a política do banco verifica `publicado`, não a data. Conteúdo futuro marcado como publicado não deve ser considerado confidencial pela API.
6. Cabeçalhos HTTP (CSP, frame-ancestors, nosniff etc.) e TLS não foram inspecionados por requisição ao domínio final neste ambiente de rede restrita. GitHub Pages não aplica arquivos `_headers` de Netlify; não adicionamos uma configuração que daria falsa sensação de proteção. Avaliar camada de hospedagem/proxy para cabeçalhos configuráveis, com testes de compatibilidade do admin, mapa e YouTube.
7. Saída por inatividade implementada no navegador: limite de 30 minutos, aviso 2 minutos antes, atividade compartilhada entre abas da mesma sessão e bloqueio imediato da interface ao vencer. Não é política de expiração do servidor nem revogação imediata de JWT; veja `docs/INATIVIDADE.md`. Evitar computadores compartilhados e usar Sair.
8. Não foram auditados recuperação de senha por e-mail, backups/restauração, logs completos, histórico Git, extensões do navegador ou segurança dos dispositivos. Sem evidências para afirmar “nenhum incidente” ou “100% seguro”.

## Roteiro seguro para o proprietário

- Em janela anônima, abrir `/admin`: deve pedir login, nunca mostrar registros para editar. O endereço do painel ser conhecido não é vulnerabilidade por si só.
- Tentar uma única senha incorreta: deve falhar, sem revelar dados. Não repetir automaticamente.
- Entrar, sair e recarregar: deve pedir login novamente. Conferir também em uma segunda aba. Não compartilhar senhas nem tokens.
- Criar um rascunho inofensivo de teste e verificar, em janela anônima, que não aparece no diário, pesquisa nem acesso direto à página. Esperar a publicação do build, pois o site é estático. Excluir somente o próprio registro de teste depois.
- Na prévia de um texto não salvo, testar `<img src=x onerror="alert('teste')">`: não deve aparecer alerta. Não salvar/publicar payloads de teste no banco real. Para testes adicionais, usar fixture local.
- No upload, escolher SVG ou arquivo acima de 10 MB: o painel deve recusar. Não enviar arquivos reais sensíveis para teste.
- Confirmar HTTPS e verificar, no DevTools/Network, se há conteúdo HTTP misturado. Usar análise de cabeçalhos somente no próprio domínio.

Qualquer falha nesses testes deve ser investigada antes de divulgar mais o painel. Zero alertas de dependências não substitui esses controles.
