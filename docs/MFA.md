# Segundo fator no painel

## Ativação pelo proprietário

1. Abra `/admin` e entre com sua conta autorizada.
2. Clique em **Ativar 2FA** no topo. Alterações não salvas devem ser salvas antes.
3. Tenha um app TOTP (Google Authenticator, Microsoft Authenticator, 1Password etc.) e uma forma segura de recuperá-lo.
4. Clique em **Gerar QR code**, escaneie no aplicativo ou use a chave manual. QR/chave são segredos: não enviar no chat, por e-mail ou em fotos compartilhadas.
5. Guarde backup do app ou a chave em gerenciador seguro. Marque a confirmação e digite os seis números atuais do aplicativo.
6. Após a confirmação, o painel deve exibir **2FA ativo**. Saia e entre novamente para validar senha + código no seu aparelho.

Não geramos códigos de recuperação automáticos. Perder o celular sem backup/chave pode exigir recuperação por um responsável com acesso privilegiado ao gerenciamento de Auth e confirmação de identidade. Não existe botão público para contornar o 2FA.

## Acesso e cancelamento

- No login com fator confirmado, a tela de código fica entre senha e editor. Não há opção de continuar somente com senha.
- Código errado/expirado, falta de conexão ou fator indisponível mantêm o painel bloqueado. A interface não revela erros internos nem imprime códigos em logs.
- Hora automática no celular é importante para TOTP. Não tentar códigos automaticamente em sequência.
- Configuração ainda não confirmada pode ser descartada em **Voltar ao painel**, removendo somente o fator criado nessa tela. Durante a confirmação o botão de cancelar fica bloqueado para evitar corrida entre verificar e remover.
- Fechar a aba abruptamente pode deixar um fator não confirmado. Ele não ativa o 2FA nem bloqueia o login. Muitas configurações abandonadas podem atingir limites do provedor e exigir limpeza privilegiada dos fatores *não confirmados*, após verificar a conta; não remover fatores confirmados para solucionar isso.
- Não há remoção/troca de fator confirmado pelo painel nesta versão. Isso evita introduzir um fluxo de desativação inseguro; a gestão privilegiada e a recuperação são separadas.

## Proteção no servidor

Migração `202611090002_mfa_painel.sql`, aplicada e verificada em produção.

`e_administrador()` exige UID na lista privada ativa e, se existir qualquer fator com status `verified` na conta, exige claim JWT `aal=aal2`. As 31 políticas e três RPCs já usam essa função, então o bloqueio não depende de JavaScript. Tokens antigos AAL1 não ganham acesso administrativo após a confirmação do fator, mesmo que ainda não tenham expirado.

Fatores `unverified` são ignorados para evitar bloqueio por cadastro interrompido. Portanto o 2FA **não está ativo na conta até o primeiro código ser confirmado pelo proprietário**. Não criamos nem alteramos fatores reais durante o desenvolvimento.

`estado_acesso_painel()` apenas informa à própria conta se ela é autorizada e se falta MFA. Não retorna fatores, segredos ou lista de administradores; não é concedida a visitantes. A UI oferece TOTP; outro tipo de fator sem TOTP disponível falha de forma fechada, com orientação para recuperação.

Os checks são `SECURITY DEFINER`, com search_path vazio e referências qualificadas. AAL vem do JWT validado pelo serviço, não de metadados editáveis pelo usuário.

O fluxo usa `enroll`, `listFactors` e `challengeAndVerify` do SDK Supabase. O código nunca é verificado localmente. QR é exibido como imagem isolada, não SVG injetado em HTML. Chave/código não são gravados pela aplicação em localStorage, banco editorial, URL, logs, backup editorial ou arquivos do projeto. O Auth armazena o fator e o SDK persiste a sessão autenticada normalmente.

## Testes e limites

- `tests/mfa-banco.mjs`: PostgreSQL descartável PGlite executando a migração real. Conta autorizada sem fator entra; fator pendente não bloqueia; fator confirmado nega AAL1/claim ausente, inclusive UPDATE real contra tabela com RLS de teste; AAL2 libera; não administrador segue bloqueado mesmo com AAL2/metadados; visitante não executa RPC de estado.
- `tests/mfa-painel.mjs`: simulação DOM de geração de QR, chave manual, consentimento de backup, validação de código, erro, descarte, confirmação, status ativo e resposta tardia após logout.
- Controlador testa que pedido de MFA nunca libera o editor, inclusive com resposta contraditória.
- Produção: somente leitura do estado confirmou conta atual autorizada e ainda sem MFA. Nenhum fator, código, senha ou segredo real foi usado nos testes. Isso não substitui o teste final de cadastro e login no celular do proprietário nem é teste end-to-end do provedor.

Ativar 2FA neste painel não ativa 2FA na conta de gerenciamento do Supabase, no GitHub ou no e-mail. Expiração por inatividade ainda não foi implementada.
