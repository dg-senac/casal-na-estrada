# Captura editorial consistente — preparação local

SQL experimental: `captura-editorial.sql`. Testar: `node tests/captura-editorial.mjs`.

**Não aplicado no Supabase. Não é migração automática nem está conectado ao Worker.** Nenhum dado real foi exportado nesta etapa.

A função proposta não aceita parâmetros: tabelas e destino não são controlados pelo visitante. Só retorna as sete tabelas editoriais. Todas são agregadas por um único SELECT, com o mesmo snapshot MVCC da instrução. A captura não mantém esse snapshot para operações posteriores de mídia. O instante retornado é o da montagem do envelope, não um identificador de transação/restauração.

Acesso: SECURITY DEFINER, search_path vazio, nomes qualificados, EXECUTE revogado de PUBLIC/anon e permitido a authenticated. Exige auth.uid(), e_administrador() e claim AAL2 do JWT validado pelo gateway Supabase. O corpo tem apenas consultas; não modifica tabelas nem RLS. O proprietário da função tem acesso privilegiado e por isso deve ser revisado explicitamente antes de aplicação real; não instalar com proprietário incapaz de ler todas as linhas nem assumir que a implementação local comprova políticas reais. Nenhuma service_role é exposta ao navegador.

Limites experimentais: lê até 10001 registros por tabela e recusa se superar 10000; não retorna subconjunto como se fosse completo. Envelope acima de 1,5 MiB é recusado. Esses limites não são garantia de custo/tempo de execução: agregar texto muito grande ainda consome recursos antes da checagem. Timeout, cotas e rate limiting devem ser definidos na integração. O pacote final continua sujeito ao limite separado de 2 MiB do módulo de formato.

Retorno: versaoCaptura, capturadoEm ISO UTC, contagens e dados. Hash é criado posteriormente pelo empacotador; ainda não há autenticidade criptográfica. As contagens são derivadas do snapshot; não detectam uma origem que já perdeu registros. Sem Auth, senha, token, mídias binárias, políticas ou funções no resultado. `to_jsonb(linha)` inclui todas as colunas das tabelas permitidas; mudanças futuras de esquema exigem revisão de escopo para impedir exportação involuntária de novos campos sensíveis.

Testes PGlite em memória com auxiliares Auth simulados e tabela privada de administradores: anon recusado; não administrador, UID ausente, AAL1 e administrador desativado recusados; administrador AAL2 aceito mesmo sem leitura direta das tabelas; rascunho incluído; tabelas vazias presentes; limite de bytes e linhas falha sem retorno parcial; aplicação repetida do SQL; captura aceita pelo pacote e comparada integralmente. Teste não simula ataques ao gateway, concorrência remota, latência nem as políticas/funções exatas da produção. Consistência entre tabelas resulta da instrução SQL única, sem teste concorrente remoto nesta fase.

Regressões de pacote e recuperação local aprovadas. Recuperação segue representativa, não é réplica completa do esquema real.

Próxima etapa proposta, sujeita à aprovação: revisar definição real de autorização/permissões/esquema em consultas somente leitura, preparar captura autenticada com download privado/manual do pacote antes de decidir armazenamento na Cloudflare. Aplicar função no banco real ou exportar conteúdo real requer explicar a mudança e obter autorização explícita. Não trocar Worker, migrar site ou desativar GitHub Pages nesta etapa.
