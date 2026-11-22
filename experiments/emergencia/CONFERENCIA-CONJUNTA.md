# Conferência conjunta offline — etapa intermediária

O usuário confirmou download e validação do ZIP real com **81 arquivos / 34.256.257 bytes** no navegador. Isso comprova integridade local relatada, não restauração. O agente não recebeu nem copiou esses binários.

## Entrega

`entregas/conferir-backups-offline.html`: HTML autônomo gerado por `node scripts/gerar-conferencia-offline.mjs`, sem dependências externas e sem dados reais. Salvar e abrir no navegador local, selecionar snapshot editorial JSON e ZIP das fotos. Não selecionar scripts, não enviar arquivos privados ao chat. CSP bloqueia conexões, formulários, imagens e objetos. Nenhum código acessa rede, Supabase, disco de destino ou banco; não executa/renderiza conteúdo de cadastros. Saída somente por textContent. Por ser file local, a segurança depende também do navegador e de extensões; usar cópia confiável gerada do repositório.

## O que faz

- Valida pacote editorial (checksum, sete tabelas, contagens e relações) e estrutura/integridade do ZIP (CRC + SHA256).
- Cruza campos explícitos capa_url/capa_mini/foto_url/foto_mini/url e strings inteiras com prefixos conhecidos.
- Reconhece public/media dos dois hosts conhecidos e caminhos relativos, Storage do projeto fixo e função foto-publicada. Não consulta URLs e não busca arquivos faltantes.
- Lista referências presentes, ausentes, externas, não classificadas e vídeos externos; conta objetos sem referência sem sugerir remoção.
- Não mostra URLs externas originais, mas relatório contém IDs/nomes de arquivos que podem ser privados.
- Recusa caminhos decodificados com traversal, barra codificada, controle ou backslash. Sem equivalência frouxa com outro projeto/host.

## Limites obrigatórios

Não interpreta Markdown/HTML ou CSS embutidos e não cobre fontes de mídia arbitrárias/campos novos automaticamente. Não é importador nem restauração de produção. Não replica esquema/RLS/Auth/Edge Functions/segredos. Arquivos e snapshot não são atômicos; datas diferentes precisam revisão. Referência presente não prova renderização/compatibilidade e checksum não é assinatura. Nenhuma alteração em Pages, domínio ou conta. Teste de restauração completo ainda pendente.

## Testes

`tests/conferencia-conjunta.mjs` usa fixtures somente. Cruza casos públicos/privados/ausentes/externos/ambíguos, recusa corrupção, restaura os mesmos registros no esquema **representativo** PGlite já existente, relê JSON e cruza novamente. Executa HTML gerado em JSDOM com APIs Web, fetch proibido e arquivos fictícios; confirma saída equivalente sem criação de imagens. Não afirmar que isso restaurou o esquema real ou os 81 arquivos do usuário.

Suíte de emergência regenera HTML e inclui o teste. O módulo ZIP passou a expor inspecionarZipFotos com manifesto validado; verificarZipFotos mantém contrato anterior. Bundle do Worker regenerado localmente, sem necessidade de deploy para usar este HTML.

## Próxima validação do usuário

Abrir o HTML local e escolher JSON editorial anteriormente baixado + ZIP validado. Pedir somente os totais presente/ausente/externa/nao_classificada/video_externo, não relatório completo. Se não possuir JSON, obter pela rota autenticada de download da cópia guardada já existente — não pedir credenciais nem recriar backup automaticamente. Resolver diferenças antes de afirmar prontidão para recuperação/migração.
