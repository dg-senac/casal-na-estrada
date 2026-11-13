# Administração restrita por conta autorizada

## O que foi aplicado

Migração `supabase/migrations/202611090001_administradores_autorizados.sql`, aplicada pelo conector em transação e verificada no banco real. A conta única previamente cadastrada foi incluída por UID, sem mudar senha, tokens ou conteúdo.

- Lista em `painel_privado.administradores`, fora do schema público, com RLS e sem acesso para `anon` ou `authenticated`.
- `public.e_administrador()` não recebe usuário como argumento: verifica o UID da sessão. Não confia em e-mail enviado pelo navegador nem em metadados editáveis.
- Função SECURITY DEFINER com `search_path` vazio e referências qualificadas. Somente autenticados podem chamá-la; ela retorna um booleano, não a lista.
- 28 políticas das sete tabelas editoriais + três políticas de escrita do Storage conferem o helper. Leitura pública dos registros publicados e das imagens permanece.
- `status_publicacao`, `publicar_agora` e `definir_token_github` verificam autorização antes da lógica anterior. As duas últimas rejeitam com 42501; a primeira possui um tratamento de exceções preexistente e retorna `{ok:false,erro:'falhou'}` sem dados administrativos.
- Função interna `envia_build(boolean)` continua sem EXECUTE para `authenticated`.
- Painel aguarda a RPC antes de abrir; erros de rede e negativas não liberam o editor. Resposta atrasada após logout é descartada. Revalida ao retornar à aba e a cada cinco minutos; a barreira real fica no banco a cada operação, independentemente da interface.

## Como autorizar outra conta

Somente o responsável com acesso privilegiado ao banco pode gerir a lista. Não há botão no painel para se tornar administrador. Não é preciso nem recomendado abrir o cadastro público.

1. Criar/convidar a conta desejada pelo gerenciamento de Auth.
2. Conferir o UID real em `auth.users`.
3. Inserir esse UID em `painel_privado.administradores` com `ativo=true`, por consulta administrativa parametrizada.
4. Entrar no painel com essa conta e verificar acesso.

Para revogar, definir `ativo=false` nesse registro. A autorização no servidor muda imediatamente para novas operações. Não remover a última conta ativa sem ter um caminho privilegiado de recuperação. Não disponibilizar SQL de gestão da lista a visitantes nem conceder escrita aos usuários autenticados.

## Verificação realizada

- Banco confirmou um administrador ativo, 31 políticas restritas e três RPCs com verificação.
- Simulação SQL do papel autenticado com o UID autorizado: helper true e status de publicação ok; não consegue gerir a própria lista.
- Simulação SQL de identidade fora da lista, sem criar conta real: helper false, status sem dados privados, rascunhos não visíveis, sem acesso ao schema privado nem à função interna de build.
- Papel anônimo mantém somente leitura pública e não possui EXECUTE administrativo.
- Teste do controlador local: autorizado, negado, erro de rede, resposta inválida, logout concorrente e resposta obsoleta.
- As simulações SQL ajustam claims somente dentro da transação de teste. Isso testa autorização, não login real nem verificação da assinatura JWT no gateway. Nenhuma senha foi usada ou alterada.

## Próximas etapas

MFA no painel foi implementado na etapa seguinte, conforme `docs/MFA.md`. A função `e_administrador()` agora exige AAL2 quando existe fator confirmado; os testes SQL históricos deste documento pressupõem conta sem MFA. O cadastro do autenticador depende do proprietário. Expiração por inatividade continua pendente. Senhas não foram alteradas. As limitações restantes seguem em `docs/SEGURANCA.md`.
