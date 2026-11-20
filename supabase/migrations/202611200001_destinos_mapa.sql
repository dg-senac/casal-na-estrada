-- Destinos por registro: sem tabela pública independente nem novas permissões.
-- Herda RLS/publicação do conteúdo pai. [] preserva o reconhecimento legado.
create or replace function painel_privado.destinos_mapa_validos(valor jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare d jsonb;
begin
  if valor is null or jsonb_typeof(valor) <> 'array' then return false; end if;
  if jsonb_array_length(valor) > 30 then return false; end if;
  for d in select value from jsonb_array_elements(valor) loop
    if jsonb_typeof(d) <> 'object' then return false; end if;
    if jsonb_typeof(d->'nome') is distinct from 'string' or length(trim(d->>'nome')) not between 1 and 120 then return false; end if;
    if jsonb_typeof(d->'uf') is distinct from 'string' or not (d->>'uf' = any(array['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'])) then return false; end if;
    if (d ? 'lat') <> (d ? 'lng') then return false; end if;
    if d ? 'lat' then
      if jsonb_typeof(d->'lat') <> 'number' or jsonb_typeof(d->'lng') <> 'number' then return false; end if;
      if (d->>'lat')::numeric not between -90 and 90 or (d->>'lng')::numeric not between -180 and 180 then return false; end if;
    end if;
  end loop;
  return true;
end;
$$;
revoke all on function painel_privado.destinos_mapa_validos(jsonb) from public;
grant usage on schema painel_privado to authenticated;
grant execute on function painel_privado.destinos_mapa_validos(jsonb) to authenticated;
alter table public.posts add column if not exists destinos_mapa jsonb not null default '[]'::jsonb;
alter table public.trofeus add column if not exists destinos_mapa jsonb not null default '[]'::jsonb;
alter table public.posts drop constraint if exists posts_destinos_mapa_validos;
alter table public.posts add constraint posts_destinos_mapa_validos check (painel_privado.destinos_mapa_validos(destinos_mapa));
alter table public.trofeus drop constraint if exists trofeus_destinos_mapa_validos;
alter table public.trofeus add constraint trofeus_destinos_mapa_validos check (painel_privado.destinos_mapa_validos(destinos_mapa));
notify pgrst, 'reload schema';
