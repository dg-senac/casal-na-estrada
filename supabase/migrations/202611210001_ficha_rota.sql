-- Ficha opcional vinculada ao próprio post; mantém RLS e publicação existentes.
create or replace function painel_privado.ficha_rota_valida(valor jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare chave text; item jsonb;
begin
  if valor is null or jsonb_typeof(valor) <> 'object' then return false; end if;
  for chave,item in select * from jsonb_each(valor) loop
    if not (chave = any(array['origem','destino','distancia_tipo','duracao','paradas','abastecimento','pedagios','gastos','asfalto','observacoes','conferido_em'])) then return false; end if;
    if jsonb_typeof(item) <> 'string' or length(item #>> '{}') > 1000 then return false; end if;
    if chave='distancia_tipo' and (item #>> '{}') not in ('','ida','ida_volta') then return false; end if;
    if chave='conferido_em' and (item #>> '{}') <> '' then
      if (item #>> '{}') !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
      perform (item #>> '{}')::date;
    end if;
  end loop;
  return true;
exception when datetime_field_overflow or invalid_datetime_format then return false;
end;
$$;
revoke all on function painel_privado.ficha_rota_valida(jsonb) from public;
grant usage on schema painel_privado to authenticated;
grant execute on function painel_privado.ficha_rota_valida(jsonb) to authenticated;
alter table public.posts add column if not exists ficha_rota jsonb not null default '{}'::jsonb;
alter table public.posts drop constraint if exists posts_ficha_rota_valida;
alter table public.posts add constraint posts_ficha_rota_valida check (painel_privado.ficha_rota_valida(ficha_rota));
notify pgrst, 'reload schema';
