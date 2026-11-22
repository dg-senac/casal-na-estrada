# Arquivos de mídia — exportação privada e verificação offline

## Implementação desta etapa

Novo bloco no controlador do site paralelo /login-teste. Botão baixa ZIP dos arquivos visíveis em `public/media` do build atual (via ASSETS) e nos buckets fixos Supabase `midia`/`midia-rascunhos`. Inclui objetos não referenciados/rascunhos visíveis ao operador; não publica esses objetos, não muda buckets/RLS. ZIP fica no computador, não no D1. **Não é backup automático de fotos integrado à emergência.** O botão automático anterior continua copiando apenas cadastros. Não anunciar solução completa ou migração pronta.

Motivo: evitar contratar R2/serviços que peçam cartão e evitar colocar binários/base64 no D1. Usa infraestrutura já disponível e navegador; nenhuma assinatura, banco, bucket ou segredo novo. Limites gratuitos/uso continuam dependendo das cotas da conta existente; cada arquivo faz autenticação/autorização e requisições Storage e pode consumir cota/egresso. Não há garantia de uso ilimitado ou SLA.

## Segurança

APIs POST `/api/midia-inventario` e `/api/midia-arquivo` exigem Origin exata, sessão validada no Supabase, administrador ativo e AAL2. URL de projeto e buckets fixos. Sem service_role, URL assinada, cookie de sessão persistido, endpoint de upload/delete ou logs de conteúdo. Runtime vars existentes e ASSETS reaproveitados. `redirect: manual`, prazo 20s com AbortController. Nomes validados contra segmentos .., controle, backslash, query; cada segmento é codificado. Fontes não são URLs arbitrárias/SSRF. ASSETS servidos pelo binding interno após allowlist gerada no build; manifesto interno não é servido pelo router público. Arquivos binários são enviados como octet-stream/no-store/nosniff, nunca HTML inline.

Inventário pagina o Storage com limit 100, ordenação por nome e pastas recursivas; tamanho/quantidade/profundidade limitados. Falha em fonte, autorização, arquivo sumido, tamanho ausente/mudado ou hash divergente aborta o ZIP como completo. Inventário limitado a 999 arquivos, arquivo <=10 MiB e soma <=60 MiB (limites de projeto, não cotas oficiais). Worker bufferiza apenas um arquivo por requisição; o ZIP todo é montado no navegador. Pode exigir memória considerável em dispositivos modestos; não elevar limites sem revisão.

## Integridade e limites do escopo

ZIP sem compressão (STORE), CRC32, nomes UTF8 e manifesto.json com caminho, fonte, tamanho e SHA-256 para cada arquivo. Hash calculado no Worker e conferido no navegador, além de hash de build para assets. ZIP inclui binários originais, não miniaturas recomprimidas, exceto quando o próprio objeto de origem é miniatura. Fonte public/media contém o que existe nesse build; não inclui imagens fora dessa pasta, URLs externas, vídeos do YouTube, senhas ou esquema/cadastros.

Segundo botão permite escolher o ZIP baixado e conferir inteiramente no navegador, sem upload. Valida estrutura ZIP, nomes, duplicatas, limites, CRC, manifesto, presença/tamanho e SHA-256 de cada entrada. Recusa formatos ZIP genéricos não suportados: somente o formato produzido por esta ferramenta. SHA/CRC não são assinatura nem proteção contra invasor capaz de reescrever arquivos e manifesto.

Não é snapshot atômico entre Storage, Git e dados editoriais: objetos podem mudar durante leitura e alterações do mesmo tamanho no Storage não são detectadas apenas pelos metadados originais. Hash comprova bytes recebidos, não que eram os esperados no momento da emergência. RLS pode omitir objetos sem erro; listagem não comprova inventário administrativo completo. Antes de chamar de recuperação completa, comparar contagens com inventário autorizado e testar reconstrução em ambiente isolado com esquema e arquivos, sem tocar no site real.

## Arquivos e testes

- cloudflare/midia-backup.mjs: inventário/bytes autenticados.
- scripts/manifesto-assets-backup.mjs: manifesto SHA256 do build sem seguir symlinks.
- experiments/emergencia/zip-fotos.mjs: produtor/verificador ZIP sem dependências externas.
- fotos-client.mjs e gerar-worker-fotos.mjs: UI autenticada no bundle worker-fotos-teste.mjs.
- cloudflare/site-worker.mjs usa o novo bundle e encaminha as APIs antes do bloqueio público. Assim administrador autenticado pode exportar durante manutenção; visitantes não.
- scripts de build/teste regeneram o bundle e manifesto. Dist de fixture continua proibido de publicar.

Testes `backup-fotos.mjs`: bytes públicos/privados fictícios, auth/MFA/origem/método, fontes fixas, listagem recursiva, limites, paths inválidos, falhas fechadas, hashes e sintaxe browser. ZIP extraído com zipfile do Python, CRC e bytes iguais; offline recusa truncamento/corrupção/hash adulterado. `fotos-browser.mjs`: botão executado em JSDOM, inventário/arquivos simulados, ZIP real gerado/verificado, sem localStorage. Nenhum conteúdo real copiado pelo agente nesta etapa. Regressões runtime/controle necessárias antes de enviar branch; teste hospedado do ZIP real será do usuário.

## Publicação e validação manual

Push na branch de teste já conectada dispara build do site paralelo (não é merge). Após Ready, usuário abre /login-teste no NOVO endereço, faz MFA, baixa o ZIP sem clicar em emergência real e confirma salvamento em pasta privada. Em seguida escolhe esse ZIP no verificador local e informa somente contagem/total e resultado, NÃO anexa fotos/ZIP ao chat. Não usar upload em serviço de terceiros para extrair. Sem SQL, cartão ou contratação novos.

Pendências: backup automático independente de fotos, retenção/versionamento, inventário completo autorizado, auditoria de exportações/rate limit, restauração completa e encerramento das origens alternativas. GitHub Pages continua intacto.
