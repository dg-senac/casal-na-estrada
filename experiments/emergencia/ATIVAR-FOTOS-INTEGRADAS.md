# Fotos do Supabase integradas ao fluxo de emergência paralelo

## Implementação agora disponível na branch de teste

- cloudflare/fotos-guardadas.mjs: APIs POST iniciar/copiar/concluir/inventario/arquivo com Origin exata, Auth validada, administrador/MFA, projeto fixo e Publishable de runtime. usuario_id vem do servidor, não do navegador. Sessão é a existente; sem service_role ou token em URL.
- Admin após resposta positiva do backup editorial inicia automaticamente fotos do Supabase, em requests sequenciais curtos. Aba aberta é necessária: não é job independente/background garantido. Interrupção informa ID para retomada sem repetir emergência editorial. Não reabre manutenção em erro.
- Controlador /login-teste tem botões para copiar/retomar fotos e baixar ZIP de fotos GUARDADAS no D1, usando campo ID da cópia editorial existente.
- Download usa exclusivamente bytes do D1, não busca originais Storage. Autenticação ainda depende do Supabase, como controlador editorial existente; indisponibilidade total de Auth exige procedimento operacional fora deste fluxo.
- ZIP de fotos D1 usa manifesto compatível com verificador local, hashes conferidos novamente no servidor e cliente; bytes recebidos e verificados, não mera lista de URLs. Não inclui public/media. Datas do manifesto de download indicam momento do download, não captura atômica.

## Escopo e limites

Somente buckets midia e midia-rascunhos visíveis ao admin validado. Não cobre imagens fixas do repositório, outras URLs/buckets nem Auth/esquema/RLS. Preservar ZIP completo de 81 arquivos e JSON guardados. Não afirmar solução completa nem contenção de Pages/Supabase direto.

Até 3 conjuntos (incluindo incompletos), 100 arquivos por conjunto, 1 MiB por arquivo, 8 MiB por conjunto. Sem apagar automaticamente cópias antigas. Capacidade esgotada retorna erro e precisa revisão, não upgrade. Operações iniciais verificam manutenção e vínculo com cópia editorial da mesma conta. Retomada pode ocorrer após reabertura mas não cria snapshot novo sem manutenção. Todas as falhas são independentes da reabertura; fotos não confirmadas não significam backup completo.

## Correção do protótipo anterior

Documento SNAPSHOT-FOTOS-LOCAL.md descreve versão anterior não hospedada. Agora concluirSnapshotFotos NÃO relê todos os bytes em loop dentro da mesma requisição. Cada chamada copiar grava, relê, valida hash e marca verificado; na conclusão consulta contagem/soma/marcadores e faz join do manifesto com linhas para validar nomes/tamanhos. Bytes não têm rota de update/delete; inserção é imutável e condicional ao estado. Download e retomada revalidam hashes. Marcador não é assinatura nem proteção contra invasor com acesso administrativo ao banco; corrupção fora da API é detectada em download/reconferência, não necessariamente no selo agregado.

Número de chamadas curtas foi reduzido para não usar uma única invocation com >50 queries no inventário máximo permitido. Ainda precisa teste hospedado de CPU/latência/cotas Free. Não há promessa de gratuidade ilimitada nem monitoramento automático de billing. Nenhum plano novo contratado/alterado.

## Testes locais executados

Node22.23.4: suíte emergência completa, runtime Cloudflare local, suíte segurança e Astrocheck (23 arquivos, zero erros/avisos/hints) aprovados. tests/fotos-guardadas-api.mjs com D1 emulado e rede fictícia: fluxo do cliente até selo, download após origem responder 404, retomada sem reler origem, negativa de acesso/origem/path, corrupção recusada e manutenção preservada. Tests snapshot-fotos/fotos-d1-local comprovam imutabilidade/limites. Teste do admin adaptado ao fluxo automático. Não houve cópia de foto real nesta etapa.

## Ativação que depende do usuário

1. Cloudflare D1 existente casal-emergencia-teste: executar conteúdo COMPLETO de entregas/ativar-backup-fotos-d1.sql. Só CREATE TABLE IF NOT EXISTS de duas tabelas, sem alteração das anteriores. Não executar em Supabase. Não precisa chave, cartão, bucket ou banco novo.
2. Aguardar build Ready da atualização da branch de teste. Nenhum merge/alteração DNS/Pages.
3. Preferir reutilizar cópia editorial já validada b14640fe-20fe-4ede-b4f9-ed751d42ee9d: /login-teste, autenticar/MFA, preencher ID e Copiar ou retomar fotos do Supabase no D1. Isso pode exigir manutenção se snapshot fotos ainda não existir; ativar manutenção coordenadamente antes sem criar repetidos backups. Alternativa teste integral: novo acionamento admin após tabelas prontas, consome uma vaga editorial (teto5).
4. Copiar resultado (não fotos) e confirmar contagem/tamanho com inventário conhecido de 22 objetos/3.709.108 bytes, sujeito a atualização do conteúdo. Baixar ZIP D1, validar localmente, só então reabrir. Evitar acionamentos repetidos: limites são pequenos de propósito.

Sem acesso ao painel Cloudflare pelo agente: SQL não foi aplicado remotamente. Até criar tabelas, APIs retornam erro fechado sem modificar manutenção/cadastros por esta etapa. Usuário só deve testar fotos depois desse passo. Implantação será disparada pelo push na branch paralela, não por dist de fixture local.
