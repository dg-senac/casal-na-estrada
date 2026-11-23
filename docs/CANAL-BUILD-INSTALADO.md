# Canal publicado de build instalado com autorização — bootstrap

Usuário autorizou adicionar consulta restrita e estender a função isolada (resposta Sim). Esta autorização não cobre fechar REST/Storage antigos, desligar Pages ou migrar definitivamente.

## Remoto concluído

- list_projects confirmou projeto saudável; list_edge_functions/get_edge_function confirmaram midia-worker ACTIVE v2 e permitiram conferir fonte antes de atualizar.
- Consulta prévia confirmou novas funções ausentes.
- create_migration origem_worker_conteudo_publicado executada com sucesso: campos_publicos/projeção explícita, conteudo_publicado e wrapper público restrito. Registros/editoriais/RLS/buckets anteriores não alterados. Registro em supabase/migrations/202611210007_origem_worker_conteudo_publicado.sql.
- ACL pós-instalação: as três funções são postgres/search_path vazio, anon EXECUTE=false e authenticated EXECUTE=false em todas; service_role chama conteudo_publicado e wrapper, não helper. Helper é chamado como postgres pela função SECURITY DEFINER. Nenhuma credencial criada/lida/rotacionada.
- Consulta real retornou SOMENTE contagens/tamanho, sem exportar textos: 2 posts,1 álbum,31 troféus,3 encontros publicados,35291 bytes JSON PostgreSQL.
- update_edge_function midia-worker para v3 ACTIVE, verify_jwt=false mantido com HMAC no código. Ramo de imagens preservado; rota nova /midia-worker/conteudo usa propósito HMAC próprio e RPC nova. foto-publicada não alterada. Mesmo segredo existente; usuário não deve gerar outro.

## Worker/bootstrap

/conteudo-build.json conectado no router após guarda de manutenção; todos os registros dessa resposta são conteúdo já público (não backup privado). Sem cache e sem CORS adicional; visitantes podem ler quando site aberto por desenho, mas assinatura de origem permanece no servidor. Fonte usa origem assinada e não REST público. Erro da origem fecha acesso.

/api/testar-conteudo-build exige sessão admin/MFA+Origin; pega documento via mesmo handler e verifica que GET direto sem assinatura na origem retorna403. Relata só contagens/estado, sem conteúdo privado ou segredo. Não cria backup, não escreve estado de manutenção; usa nonce no controle de assinatura.

Botão Testar canal de conteúdo do build adicionado ao /login-teste. Não pedir ao usuário executar emergência novamente.

## Estado importante: build ainda NÃO trocado

src/lib/supabase.ts tem opção CONTEUDO_BUILD_URL sem fallback em erro e cache único. Script de build ainda não a ativa: precisa que rota esteja publicada primeiro, senão o próprio deploy inicial tentaria ler endpoint inexistente da versão antiga. Após teste hospedado positivo, ativar variável no script em próximo commit usando URL fixa já disponível. Não precisa novo campo/segredo de build no painel. Uma vez ativo, compilação durante manutenção deve falhar e manter versão já publicada; não reabrir automaticamente para compilar.

## Verificações locais aprovadas

Node22.23.4: tests/conteudo-build-candidato.mjs (PGlite+roles+fluxo HTTP simulado incluindo diagnóstico protegido), leitor-build-integracao, bundle Edge com ramo novo e regressão de imagens, test:cloudflare:local, test:emergencia completo, test:seguranca e Astrocheck23 arquivos sem erros/avisos/hints. Nenhum teste local acessou dados reais. Dist continua fixture e não deve ser publicado diretamente.

## Próxima ação do usuário

Aguardar Ready da publicação na branch de teste. Abrir /login-teste, login/MFA, clicar Testar canal de conteúdo do build e enviar somente mensagem final. Esperado contagens de publicados e negativa403 da origem unsigned. Depois, agente pode ativar leitura efetiva do build pela rota já publicada (ajuste previamente autorizado), sem repetir criação de SQL ou segredos. Se falhar, investigar sem pedir segredo ou criar novo backup.

Os blocos restantes continuam claros: concluir troca do build; fechamento de origens antigas com autorização; migração final/Pages com aprovação. Não anunciar encerramento antes dos testes reais.
