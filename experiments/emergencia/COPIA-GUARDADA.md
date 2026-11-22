# Download autenticado da cópia existente no D1

Preparado após autorização do usuário. Sem deploy nesta etapa, sem SQL novo e sem consulta/exportação de conteúdo real pelo agente.

Módulo conferir-backup.mjs passa a atender /api/baixar-backup, além de /api/conferir-backup. POST, Origin exata, administrador ativo, sessão validada remotamente, AAL2, ID UUID v4 e configuração habilitada são obrigatórios antes do SELECT. Mesmo pacote lido é validado e retornado, sem segunda consulta que pudesse trocar o conteúdo entre validação e entrega. Recalcula hash, confere metadado de armazenamento, estrutura, tamanho, IDs, contagens e relações. Falha não retorna anexo nem conteúdo.

Sucesso entrega os bytes textuais originais como JSON attachment, nome com UUID validado, no-store/nosniff/noindex, sem CORS público. Nenhuma escrita no D1, consulta de conteúdo ao Supabase, nova captura, reabertura ou manutenção. Chamadas Supabase apenas para validar usuário/autorização. Inclui rascunhos: arquivo baixado deve ficar privado. Entrega HTTP não confirma salvamento em disco.

Gerar: node experiments/emergencia/gerar-worker-copia-guardada.mjs. Arquivo completo: worker-copia-guardada-teste.mjs. Testes: node tests/baixar-copia-guardada.mjs; regressões conferir-backup e backup-real-d1 aprovadas. Verificado com mocks: conteúdo idêntico, autorização, origem/método, corrupção/truncamento/hash divergente/ausência recusados, SQL limitado ao SELECT, nenhuma captura nova, roteamento do bundle e sintaxe do browser.

Publicação pendente pelo usuário no Worker separado. Primeiro confirmar botão após login/MFA; depois baixar por ID e confirmar salvamento. Não pedir pacote real no chat. Sem alteração do GitHub Pages ou migração. Não comprova autenticidade contra invasor, backup dos binários ou restauração de produção. Demais limitações de operação do protótipo permanecem.
