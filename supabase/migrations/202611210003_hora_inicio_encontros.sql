-- Hora local de Recife, opcional. Não preenche horários de eventos existentes.
alter table public.encontros add column if not exists hora_inicio text;
alter table public.encontros drop constraint if exists encontros_hora_inicio_valida;
alter table public.encontros add constraint encontros_hora_inicio_valida check (
 hora_inicio is null or hora_inicio ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
);
notify pgrst, 'reload schema';
