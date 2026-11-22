# Botões de emergência — prova hospedável isolada

Arquivo completo: `worker-emergencia-teste.mjs`. Substitui o worker de login anterior, sem mudar o site Astro, workflows, Supabase ou Pages. Usar SOMENTE no Worker de teste com D1 fictício já preparado. Requer DB, SUPABASE_URL e chave pública SUPABASE_ANON_KEY Publishable.

Em /login-teste, o login com senha e MFA TOTP é realizado diretamente no Supabase; o Worker verifica a sessão remotamente, consulta a autorização no banco e exige AAL2. Tokens ficam apenas na memória da página. Não há refresh nem armazenamento local. Limpar sessão remove a referência local, não revoga a sessão do Supabase. Feche o teste ao terminar. Sem log de tokens/senhas. O teste cria sessões/challenges de autenticação, mas não escreve dados editoriais no Supabase.

Após validação, dois botões com confirmação ficam disponíveis: ativação de manutenção com cópia fictícia e reabertura. Cada requisição exige novamente autorização/MFA, POST e Origin exata. Estado é gravado antes de iniciar a cópia; se a cópia falha, não reabre. Cópia via INSERT SELECT agregado em uma instrução SQLite, com UUID e INSERT OR IGNORE para impedir sobrescrita. Repetição na mesma página após falha preserva o ID. Reabrir não apaga cópias. Nunca aceita SQL, tabela ou destino do navegador. Login é exceção ao bloqueio, para permitir reabertura autenticada.

Testes locais: `node tests/emergencia-botao.mjs`, `node tests/emergencia-autorizacao.mjs`, `node tests/emergencia-prototipo.mjs`; SQL de agregação e repetição também conferido em SQLite local. Supabase e D1 simulados nos testes Node; integração hospedada ainda depende da execução manual do usuário.

Limites: não operacional para produção, não backup independente, não inclui mídia ou dados reais. Não é proteção contra ataques ou backup do Supabase. Sem auditoria durável de operadores, fila, política de retenção, rate limiting próprio ou serialização global entre operadores; aba/máquina paralela pode enviar comandos concorrentes. Usar um único operador nesta prova. Não migrar o site nem anunciar contenção real. Antes de produção, implementar controle de concorrência/auditoria/limites, restauração e segurança completas, revisar cotas gratuitas e tratar origem GitHub Pages e acesso direto ao Supabase. Não ativar cobrança.

Próximo teste manual: publicar o arquivo e conferir apenas se a tela de login abre. Em etapa separada, login/MFA, ativação, conferir raiz 503 e snapshot no D1, reabertura e raiz 200. Snapshot fica privado no banco, sem rota pública de leitura.
