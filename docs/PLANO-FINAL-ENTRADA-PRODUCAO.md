# Plano único de entrada em produção e contenção

## Resultado da revisão local

Não foi executada migração, mudança de DNS, fechamento de origem, merge ou alteração editorial nesta revisão. Branch arena/bb30d53b-casal-na-estrada mantida. Sem contratação. Este documento substitui a sequência fragmentada de decisões, não substitui prova hospedada.

### Já validado pelo usuário

- Backup de emergência, download/conferência, bloqueio e reabertura no paralelo; não repetir coleção/exportação.
- Fotos pelo proxy assinado e negativa de origem unsigned403.
- Canal publicado:2posts/1álbum/31troféus/3encontros, assinatura obrigatória na Edge.
- Build real pelo canal publicado, Publicar agora pelo Deploy Hook e publicação Ready.
- Cron cadastrado manualmente17 * * * *. Status protegido instalado, mas primeira consulta foi anterior à primeira execução elegível. Ainda não há resultado recente confirmado. Métricas sem erros não provam lógica bem-sucedida: falhas são tratadas.

### Restrições concretas encontradas no código

1. Worker força X-Robots-Tag noindex,nofollow em assets; continua sendo endereço paralelo, não produção SEO.
2. scripts/build-cloudflare-teste.mjs, src/lib/publicacao-cloudflare.js, src/lib/emergencia-admin.js e leitor do canal fixam host atual. Não apontar domínio novo sem ajustar/testar todos juntos.
3. Workflow Pages continua schedule10min e deploy main. RPC/triggers antigos de publicação precisam ser inventariados antes de desativação; não remover CRUD, autenticação, MFA ou funções de emergência por engano.
4. Políticas públicas REST e Storage, bucket midia público e Edge foto-publicada antiga contornam manutenção do Worker. Só ocultar URL no HTML não fecha isso.
5. Existe também leitura publicada de midia-rascunhos via política pública. Tornar somente bucket midia privado não basta.
6. Fotos no editor/admin precisam continuar visíveis depois do fechamento. É preciso conferir uso de signedURL/autorização administrativa; não declarar preservado sem teste de fluxo administrativo.
7. GitHub Pages desabilitado mas workflow ativo é configuração contraditória. Desativar publicação antiga de forma coordenada, sem apagar repo/arquivos e sem presumir que builds REST continuariam após restrições.
8. Imagens/HTML já baixados, caches externos e cópias de terceiros não são apagados por manutenção. Promessa é bloquear novas entregas pelos canais controlados, não revogação de cópias.

## Decisão necessária do proprietário

Endereço oficial. Caminho mínimo sem contratar domínio: adotar o endereço workers.dev atual, mantendo nome técnico para evitar recriar segredo/banco/integração. Nome com site-teste é inconveniente estético, mas pode ser mantido sem implicar teste eterno. Se preferir domínio próprio já existente, fornecer apenas nome público; não pedir senha ou token. Não mudar DNS sem aprovação específica.

Pedir aprovação conjunta e explícita para plano de corte abaixo, incluindo retirada do Pages e restrição de leituras públicas antigas. Até essa aprovação, nada fechar remotamente. Aprovação da preparação recebida antes NÃO equivale à aprovação desse corte.

## Ordem de execução após autorização

### A. Preparar sem interromper o site atual

- Fixar host oficial escolhido; parametrizar flags produção/indexação sem tirar proteção do controle/admin. Canonical/sitemap/base devem concordar com endereço final. Manter UI/tipografia/fotos como estão.
- Confirmar um resultado recente do cron pelo controle (consulta apenas); se falhar, corrigir concentradamente. Agendamento não é requisito do bloqueio, mas é requisito da continuidade editorial.
- Inventariar ACL/RLS/triggers/buckets/funções atuais com metadados somente; nunca ler token GitHub armazenado, service_role ou segredos.
- Preparar migração transacional e SQL inverso das permissões/policies reais. Registrar estado público/privado dos buckets e versão Edge antiga sem conteúdos sensíveis. Não reaplicar migrações já instaladas.
- Garantir preview/admin de imagens por acesso administrativo autenticado quando necessário, sem URLs service_role no cliente e sem leitura pública para todos authenticated.
- Preparar desligamento/reversão do workflow e gatilhos de publicação Pages. Conservar repositório, arquivos, backups e mídias originais.
- Aprovação para merge é separada: não fazer merge automaticamente como parte da preparação. Branch desta sessão não muda.

### B. Janela curta de corte

- Publicar versão oficial Cloudflare e conferir host/admin/controle/publicação, sem pedir novo backup completo já validado.
- Retirar publicação Pages e desativar seus gatilhos antigos coordenadamente.
- Fechar leitura editorial pública REST nas7tabelas e políticas Storage públicas pertinentes, tornar buckets necessários privados sem mover/deletar objetos e desabilitar endpoint foto-publicada público antigo. Preservar acesso exclusivo servidor no canal assinado e administrativo com MFA.
- Conferir página pública/foto original/zoom e login/editor após restrições. Em falha significativa, parar e aplicar reversão prevista, sem contratar serviço como atalho.

### C. Uma única prova final de contenção

Usar requests novas para host oficial e origem conhecida, não repetir testes históricos de backup. No ciclo autorizado de manutenção: HTML, asset e proxy no Worker devem negar; REST/Storage/foto-publicada antigas não devem entregar conteúdo anon; painel protegido deve permitir reabertura. Após reabrir, páginas/fotos/admin devem funcionar. Não alegar proteção total antes dessa prova.

O estado de manutenção não revoga sessões Supabase nem apaga downloads anteriores. Repositório público pode conter assets do site; definir claramente o que é conteúdo editorial sob contenção e o que é material público em Git. Não prometer confidencialidade de código/arquivos que continuam no GitHub público.

## Reversão

Antes de fechar origens, guardar definições/ACL sem segredos e preparar inversas. Se a nova hospedagem tiver falha: restaurar permissões/origem antes de reativar build Pages que depende delas, reativar gatilhos/publicação antigos e conferir site original. Reverter abertura pública remove a contenção temporariamente: informar isso, não alegar segurança mantida. Nunca apagar buckets/conteúdo/D1 como forma de rollback.

## Próxima interação: uma decisão, não uma bateria de testes

Propor adoção do workers.dev atual como oficial e aprovação do corte coordenado Pages/origens antigas com reversão. Não pedir nova configuração enquanto proprietário não escolher endereço/aprovar. Depois execução técnica concentrada; envolver usuário somente em painel sem integração e em autorização de merge/corte quando pertinente.
