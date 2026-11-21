# Horário opcional de início dos encontros

O admin oferece um campo de hora (HH:MM) abaixo das datas. Usa o horário de Recife (UTC−03), inclusive para encontros em outros estados. A hora aparece no resumo administrativo, na agenda e no compartilhamento individual do WhatsApp.

A contagem regressiva e a categoria temporal usam o início exato quando informado: um evento às 18:30 continua em Próximos até esse horário, salvo se estiver cancelado ou a confirmar. O encerramento continua no final do último dia cadastrado, pois não foi solicitado horário de término. Sem horário, permanece o comportamento anterior de dia inteiro e não é exibido um horário inventado.

## Ativação
Aplicar `supabase/migrations/202611210003_hora_inicio_encontros.sql` antes de publicar o novo painel. Adiciona a coluna opcional `encontros.hora_inicio`, com validação de formato e sem mudanças de RLS. Não preenche horários nem altera eventos existentes.

**Migração preparada, ainda não aplicada em produção. Nenhum cadastro real foi alterado.** Novos builds toleram a ausência da coluna na leitura; salvar pelo painel atualizado requer aplicá-la. As migrações das etapas anteriores continuam sendo pré-requisitos caso ainda não tenham sido aplicadas.

## Validação
- Astro check: 23 arquivos, zero erros/avisos/hints.
- Suíte de segurança, categorias e teste novo `tests/hora-encontros.mjs` aprovados: meia-noite, 18:30, 23:59, instantes antes/no início, vários dias, legado sem hora, horários inválidos e SQL idempotente em banco isolado.
- Build com fixture temporária e regressão temporal da agenda aprovados.
- HTML compilado conferido: hora legível, timestamp UTC−03 e compartilhamento coerentes.
