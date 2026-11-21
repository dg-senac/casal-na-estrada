# Agenda regional — etapa 3

## Funcionalidades
- Filtro por UF, com opções vindas dos encontros públicos cadastrados. Combina com as cinco categorias atuais; “Ocorrendo agora” continua padrão. Contadores e contagem regressiva respeitam o estado escolhido. Sem JavaScript, a lista completa continua disponível.
- Compartilhamento individual no WhatsApp com nome, cidade/UF, datas e link direto para o encontro. O link abre a categoria correta, inclusive cancelados/encerrados, e não afirma que a data está confirmada: orienta conferir a situação na agenda.
- Fonte oficial HTTP(S) e data da última conferência opcionais no admin. Não são preenchidas automaticamente e não alteram a situação do evento. Links inválidos e datas inválidas não aparecem na página. Links externos usam noopener/noreferrer.
- Fonte e informações de cancelamento continuam visíveis; convite para combinar comboio é ocultado em eventos encerrados ou sem confirmação. Compartilhamento continua disponível.
- Validação administrativa impede fim anterior ao início. Não houve recadastro nem confirmação de eventos reais. Tipografia e categorias preservadas.

## Ativação pendente
Aplicar `supabase/migrations/202611210002_fontes_encontros.sql` antes de publicar o painel. Acrescenta apenas `encontros.fonte_url` e `encontros.conferido_em`, sem mudar RLS. O build tolera ausência dessas colunas na leitura, mas salvar pelo painel atualizado requer a migração.

**Migração não aplicada; sem PR ou merge nesta etapa.** As etapas 1 e 2 continuam acumuladas na mesma branch, conforme combinado.

## Testes
- `tests/agenda-regional.mjs`: validação de links/datas e migração idempotente no PostgreSQL isolado, incluído na suíte de segurança.
- `tests/categorias-encontros.mjs`: categorias, mudança de estado, contadores, resultado vazio, atualização temporal e deep link para cancelado, incluído na suíte de segurança.
- `tests/tempo-encontros.mjs`: fuso Recife, limites, simultaneidade, cancelamento e passagem de categoria; harness atualizado para as categorias existentes.
- Astro check e build com fixture temporária aprovados; HTML compilado inspecionado para fonte/data opcionais e links de compartilhamento corretos no base path GitHub Pages.
- Etapa 1/SEO revalidada. Sem teste interativo autenticado em produção.
