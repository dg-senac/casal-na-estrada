# Emergência — índice e estado atual

Protótipo separado do site Astro. GitHub Pages e admin original não foram migrados ou integrados. Não há bloqueio real do site principal. Não foi ativada cobrança pelo agente.

## Já validado pelo usuário no Worker separado

Login/Supabase com MFA, negativas sem credenciais, manutenção/reabertura do teste, cópia fictícia e falha controlada mantendo manutenção, captura editorial real para D1, conferência do pacote guardado, download autenticado da mesma cópia e histórico início/conclusão com trava liberada. Conferências de arquivos anexados pelo usuário confirmaram 38412 bytes, checksum válido, sete tabelas/50 registros; conteúdo real não copiado para o Git. Evidências hospedadas são relatos/imagens do usuário, não testes automatizados remotos do agente.

## Alteração real no Supabase autorizada

RPC public.capturar_editorial_emergencia aplicada; migração local 202611210004_captura_editorial_emergencia.sql. Captura de leitura restrita a administrador/AAL2. Ver ATIVACAO-CAPTURA-REAL.md. Migração ficha_rota anterior segue pendente conforme inspeção; não aplicada nesta sequência.

## Desenvolvimento e validação local

Executar `npm run test:emergencia` (Node >=22.23.4, dependências npm instaladas e Python3 com sqlite3). Regenera bundles e executa 14 arquivos de teste com dados fictícios: pacote, restauração PGlite representativa, captura, downloads, autorização, D1 simulado e controle com SQL SQLite real. Não usa rede ou credenciais reais. Integrada ao workflow verificar.yml; execução remota ainda depende de PR, não aberto nesta rodada. Astro check também aprovado em 23 arquivos.

Arquivo atual para futuras publicações: worker-controle-teste.mjs. Não reenviar versões antigas, que não têm a coordenação atual. Geradores encadeados mantêm bundles reprodutíveis. Histórico de versões experimentais permanece para testes; não são vários serviços a publicar. Não tratar arquivos do experimento como componentes de produção.

## Controle operacional

CONTROLE-OPERACOES.md descreve trava e histórico. Novo teste controle-operacoes-sqlite.mjs exercita instruções SQL reais em banco efêmero: concorrência controlada entre requisições, reabertura negada enquanto operação ativa, não roubo de trava pelo prazo, histórico, transação e falha de conclusão, teto de histórico. D1 hospedado sob concorrência ainda não foi testado. Autenticação é simulada nessa suíte.

## Pendente antes de produção

- Confirmar concorrência no ambiente hospedado e preparar recuperação investigada de trava; não liberar automaticamente por expiração. Não há botão seguro de recuperação remota pronto.
- Rate limiting efetivo, retenção/exportação de histórico, revisão final de permissões/logs/caches e versões antigas/previews.
- Backup dos binários de mídia em destino privado e gratuito com cotas verificadas; manifesto sozinho não basta.
- Esquema completo e restauração isolada representativa de produção, incluindo constraints/triggers/RLS; checksum não comprova autenticidade.
- Site completo na Cloudflare em paralelo, depois migração e integração no canto direito do admin somente com aprovação. Tratar origem Pages, acesso direto REST/Storage e objetos previamente baixados; não prometer contenção absoluta.

Nenhuma dessas pendências autoriza contratação, mudança de DNS, desligamento do Pages ou alteração de dados reais sem aprovação.

## Atualização: mídia no site paralelo

Novo BACKUP-FOTOS.md descreve ZIP autenticado no computador com binários de public/media e dos dois buckets conhecidos, mais verificador inteiramente local no navegador. Sem alteração de banco/bucket, sem serviço pago, sem gravar fotos no D1. Não é backup automático de fotos integrado à emergência. Site paralelo usa worker-fotos-teste gerado; bundles antigos servem somente às regressões históricas. Scripts de build regeneram controlador e manifesto SHA dos assets. Suíte test:emergencia inclui backup-fotos/fotos-browser. Runtime local também testa endpoints de inventário/bytes e hash. Fotos reais ainda precisam de teste manual no navegador do usuário; não anexar ZIP/fotos no chat.
