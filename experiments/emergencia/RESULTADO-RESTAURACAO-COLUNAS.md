# Recuperação local com colunas observadas no banco real

## Executado nesta etapa

- Conector Supabase list_projects confirmou projeto pjglrlullnchqazxpvyn.
- Somente SELECT de catálogos: colunas/tipos/NOT NULL/defaults, constraints, RLS, políticas e triggers das sete tabelas editoriais; definição de destinos_mapa_validos. Nenhum conteúdo editorial novo exportado, nenhum segredo/Auth consultado e nenhuma alteração remota.
- Primeiro resultado amplo foi truncado na parte das políticas: NÃO é inventário completo de ACL/RLS. Colunas/RLS e função de destinos foram consultadas separadamente e retornadas integralmente.
- Colunas/defaults registrados em esquema-colunas-observado.sql no schema local restauracao. Constraints de dados observadas reproduzidas semanticamente, com nomes locais automáticos; PK/UNIQUE/FK cascade/checks de resumo, tipo, UF, ano, nível, destinos, hora e fonte.
- Função destinos_mapa_validos consultada confere com a migração do repositório. Na prova local ela é carregada dessa migração e realocada para restauracao; manter revisão caso produção mude.

## Resultado com cópia real já fornecida antes

Usado SOMENTE o snapshot editorial D1 previamente anexado em /tmp/arena-coding-uploads (fora Git). Não solicitado novamente ao usuário. PGlite efêmero em memória, sem endpoint TCP ou acesso ao Supabase. Banco fechado após prova. Não existe persistência de registros reais nos arquivos desta etapa.

Inserção transacional e releitura aprovadas:

|Tabela|Registros|
|---|---:|
|posts|2|
|albuns|1|
|trofeus|31|
|encontros|3|
|album_fotos|11|
|album_videos|0|
|trofeu_fotos|2|
|Total|50|

Importador exige correspondência EXATA de campos do snapshot com colunas locais, sem ignorar campos desconhecidos/preencher faltantes. Inserção por jsonb_populate_record com parâmetros; comparação dentro do Postgres entre registros tipados evita falsos negativos de normalização de timestamps/datas. Não implica igualdade textual do JSON original; comprova igualdade dos valores tipados nas colunas.

## Limites importantes

Isto é um avanço além do esquema representativo anterior e do visualizador em memória, NÃO recuperação completa de Supabase. Não inclui RLS/políticas/grants/owners/Auth/Storage/Edge Functions/índices extra/site. A importação local roda como proprietário. Triggers reais de publicação automática (disparar_publicacao) e de atualizado_em foram identificados e propositalmente NÃO copiados/executados: podem produzir efeitos externos e precisarão de tratamento seguro em eventual restauração. Nenhuma chamada à definição do trigger de publicação foi feita para evitar exposição desnecessária de possíveis detalhes sensíveis. Não executar o SQL local no Supabase.

RLS está habilitada nas sete tabelas, FORCE desabilitado. posts.ficha_rota continua ausente no catálogo; não adicionar automaticamente. Nenhuma migração real aplicada, Pages/Worker intactos, sem serviço novo/pago.

## Regressões

Testes fixtures em tests/restaurar-colunas-local.mjs: sete tabelas completas aceitas, campos faltantes/novos rejeitados e checks de resumo/destinos/hora/fonte/ano inválidos recusados. Teste sem rede incluído na suíte test:emergencia. Prova com snapshot real executada separadamente; CI nunca depende desse anexo.

## Pendências

Inventário completo e testes locais de RLS/grants/autorização, plano dos triggers sem efeitos externos, restauração integrada dos arquivos no Storage/site isolado. Backup automático independente das fotos e contenção das origens alternativas permanecem pendentes. Não afirmar proteção completa/migração pronta.
