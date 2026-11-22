# Integração inicial no admin paralelo

Botão à direita: Emergência — teste. Ativo somente no build PUBLIC_EMERGENCIA_PARALELO=1 e origem exata do Worker novo. Build Pages padrão não habilita e origem diferente não mostra. Não muda fontes/estilos/layout existentes além do botão/modal nativo.

Modal explica alcance: manutenção somente do paralelo + cópia dos cadastros reais no D1; não inclui fotos nem bloqueia Pages/Supabase direto. Nenhuma ação no primeiro clique. Confirmação explícita obtém sessão atual e faz POST relativo /api/emergencia-real com Bearer e UUID. Sem compartilhar sessão em URL/localStorage novo. Autorização/MFA/Origin/trava/limite de cópias no servidor já existente continuam obrigatórios. Resposta exibida como texto, nunca HTML.

Sem retry automático. Após envio, botão desabilitado nesta instância do painel para evitar repetição acidental. Em erro de rede não presumir sucesso/falha: conferir pelo controle protegido /login-teste. Esse endereço permanece disponível durante manutenção para conferir/baixar cópia e reabrir. Não faz reabertura automática nem dispensa login/MFA do controlador. Não é a UI definitiva de produção e não afirma backup automático de fotos.

Testes: emergencia-admin.mjs cobre confirmação/nenhuma chamada ao abrir, restrição de host/flag, duplicidade, sessão, resposta insegura como texto, falha503/rede e bloqueio de repetição. inatividade-integracao atualizado para injetar módulo e flag de build no DOM simulado; suíte segurança e Astro check aprovados. test:cloudflare:local aprovado com build incluindo novo botão; dist fixture não publicar diretamente. Teste hospedado da aparência/acionamento ainda depende de usuário após build Cloudflare.

Mudanças enviadas apenas à branch paralela disparam Cloudflare Builds já configurado. Sem merge, DNS ou desligamento Pages. Não anunciar publicação Ready antes de confirmação.
