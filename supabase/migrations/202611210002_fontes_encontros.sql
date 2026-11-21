-- Metadados opcionais; não confirma eventos e não altera as políticas RLS.
alter table public.encontros add column if not exists fonte_url text;
alter table public.encontros add column if not exists conferido_em date;
alter table public.encontros drop constraint if exists encontros_fonte_url_valida;
alter table public.encontros add constraint encontros_fonte_url_valida check (
 fonte_url is null or (
 length(fonte_url) <= 2048
 and fonte_url ~ '^https?://[^/@[:space:]\\]+([/?#]|$)'
 and fonte_url !~ '[[:space:]\\]'
 )
);
notify pgrst, 'reload schema';
