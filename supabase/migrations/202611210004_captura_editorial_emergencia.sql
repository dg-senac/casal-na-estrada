-- Captura somente leitura autorizada pelo usuário e aplicada via conector Supabase.
-- Não exporta mídia nem Auth; requer administrador e AAL2.
-- SECURITY DEFINER necessário para obter também rascunhos; guardas explícitas.
create or replace function public.capturar_editorial_emergencia()
returns jsonb language plpgsql volatile security definer set search_path = ''
as $func$
declare dados jsonb; contagens jsonb; resultado jsonb; item record;
begin
  if (select auth.uid()) is null
     or not coalesce((select public.e_administrador()), false)
     or coalesce((select auth.jwt()->>'aal'), '') <> 'aal2' then
    raise exception 'Acesso restrito a administrador com segundo fator.' using errcode = '42501';
  end if;

  -- Todas as subconsultas pertencem à MESMA instrução SELECT e ao mesmo snapshot.
  -- Limite+1 permite recusar excesso sem agregar a tabela inteira.
  select jsonb_build_object(
    'posts', (select coalesce(jsonb_agg(to_jsonb(t) order by t.id), '[]'::jsonb) from (select * from public.posts order by id limit 10001) t),
    'albuns', (select coalesce(jsonb_agg(to_jsonb(t) order by t.id), '[]'::jsonb) from (select * from public.albuns order by id limit 10001) t),
    'trofeus', (select coalesce(jsonb_agg(to_jsonb(t) order by t.id), '[]'::jsonb) from (select * from public.trofeus order by id limit 10001) t),
    'encontros', (select coalesce(jsonb_agg(to_jsonb(t) order by t.id), '[]'::jsonb) from (select * from public.encontros order by id limit 10001) t),
    'album_fotos', (select coalesce(jsonb_agg(to_jsonb(t) order by t.id), '[]'::jsonb) from (select * from public.album_fotos order by id limit 10001) t),
    'album_videos', (select coalesce(jsonb_agg(to_jsonb(t) order by t.id), '[]'::jsonb) from (select * from public.album_videos order by id limit 10001) t),
    'trofeu_fotos', (select coalesce(jsonb_agg(to_jsonb(t) order by t.id), '[]'::jsonb) from (select * from public.trofeu_fotos order by id limit 10001) t)
  ) into dados;

  contagens := '{}'::jsonb;
  for item in select key, value from jsonb_each(dados) loop
    if jsonb_array_length(item.value) > 10000 then
      raise exception 'Captura excede o limite de registros; nenhum pacote retornado.' using errcode = '54000';
    end if;
    contagens := contagens || jsonb_build_object(item.key, jsonb_array_length(item.value));
  end loop;
  resultado := jsonb_build_object('versaoCaptura', 1,
    'capturadoEm', to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'contagens',contagens,'dados',dados);
  if octet_length(resultado::text) > 1572864 then
    raise exception 'Captura excede 1,5 MiB; nenhum pacote retornado.' using errcode = '54000';
  end if;
  return resultado;
end;
$func$;
alter function public.capturar_editorial_emergencia() owner to postgres;
revoke all on function public.capturar_editorial_emergencia() from public, anon, authenticated, service_role;
grant execute on function public.capturar_editorial_emergencia() to authenticated;
notify pgrst, 'reload schema';
