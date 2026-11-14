# Saída automática do painel

O `/admin` bloqueia a interface após **30 minutos sem atividade**. Aos 28 minutos mostra aviso com contagem regressiva, **Continuar conectado** e **Sair agora**. O aviso não apaga a edição; a expiração apaga os dados da interface e descarta alterações não salvas. Salve frequentemente.

## Funcionamento

- Teclado, toque, clique e rolagem reais na aba visível renovam o prazo. Movimento de mouse, tráfego de rede, refresh de token e revalidação de autorização não renovam.
- Durante o aviso é preciso clicar em **Continuar conectado**; interações no fundo não prolongam a sessão.
- As abas da mesma origem e sessão compartilham somente horário/estado de expiração em `localStorage`. Nenhuma senha, código TOTP, token ou texto editorial é acrescentado por esse controle. A chave contém UID e ID da sessão para isolar novos logins; não é um mecanismo de autorização.
- Recarregar não renova o prazo. Ao voltar de suspensão, o prazo é conferido antes de aceitar atividade. Um novo login recebe um novo ID de sessão.
- Ao expirar, o painel limpa a interface, invalida verificações de acesso pendentes e chama `signOut({ scope: 'local' })`. Isso não desconecta outros dispositivos. Abas da mesma sessão observam o estado expirado e/ou o evento de saída do SDK.
- Se a saída falhar por rede, a interface fica bloqueada e permite tentar encerrar novamente. Ao recuperar a conexão, tenta de novo. Refresh automático não reabre a sessão expirada.
- Sem acesso ao armazenamento, o relógio funciona em memória por aba. Nesse modo não há sincronização entre abas nem preservação do prazo em reload. O SDK Auth também pode ter limitações próprias nesse ambiente.

## Limites

Este é um controle de navegador para reduzir exposição acidental, **não uma política de expiração imposta pelo servidor**. Um cliente alterado, limpeza/manipulação de armazenamento, extensão maliciosa ou uso direto de um token fora do painel não são impedidos pelo temporizador. Um JWT já emitido pode continuar válido até sua expiração. Mudanças grandes no relógio do dispositivo podem antecipar o bloqueio.

RLS, allowlist e exigência AAL2 continuam sendo as barreiras no banco. Não foi alterada configuração global de sessão do Supabase. Não substitui bloqueio de tela do dispositivo, senha forte, 2FA nem saída manual em computador compartilhado.

## Validação

`npm run test:seguranca` inclui testes com relógio simulado para limite/aviso, continuação explícita, reload, duas abas, suspensão, armazenamento restrito, relógio inválido e foco do diálogo. Um teste executa o script real do admin em jsdom com Auth simulado: aviso, continuação, bloqueio offline, refresh atrasado, retry de logout e novo login. Nenhuma sessão real ou conteúdo de produção é alterado. Isso não equivale a teste em navegador real.

Verificação manual após publicação: abrir duas abas, deixar sem uso até o aviso, continuar em uma e conferir que ambas retomam; deixar expirar e conferir que ambas bloqueiam. Recarregar deve pedir login. Não deixe conteúdo não salvo durante esse teste.
