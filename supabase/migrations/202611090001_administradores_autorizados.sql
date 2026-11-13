-- Restrição de administração. Aplicar em transação via create_migration.
-- Única conta existente validada previamente; não autorizar todo auth.users.
create schema if not exists painel_privado;
revoke all on schema painel_privado from public, anon, authenticated;

create table if not exists painel_privado.administradores (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
alter table painel_privado.administradores enable row level security;
revoke all on painel_privado.administradores from public, anon, authenticated;

-- Trava de implantação: não prosseguir se a conta esperada não existir.
do $seed$
begin
  if not exists (select 1 from auth.users where id = 'ba77b481-884d-49ee-83b9-d182179f9547'::uuid) then
    raise exception 'Conta administradora esperada não encontrada; migração cancelada.';
  end if;
  insert into painel_privado.administradores (usuario_id)
  values ('ba77b481-884d-49ee-83b9-d182179f9547')
  on conflict (usuario_id) do nothing;
end
$seed$;

create or replace function public.e_administrador()
returns boolean
language sql stable security definer
set search_path = ''
as $func$
  select exists (
    select 1 from painel_privado.administradores a
    where a.usuario_id = (select auth.uid()) and a.ativo
  );
$func$;
revoke all on function public.e_administrador() from public, anon;
grant execute on function public.e_administrador() to authenticated;

-- Políticas de leitura pública permanecem intactas.
do $policies$
declare tabela text;
begin
  foreach tabela in array array['posts','albuns','trofeus','encontros','album_fotos','album_videos','trofeu_fotos'] loop
    execute format('alter policy admin_le on public.%I using ((select public.e_administrador()))', tabela);
    execute format('alter policy admin_escreve on public.%I with check ((select public.e_administrador()))', tabela);
    execute format('alter policy admin_edita on public.%I using ((select public.e_administrador())) with check ((select public.e_administrador()))', tabela);
    execute format('alter policy admin_apaga on public.%I using ((select public.e_administrador()))', tabela);
  end loop;
end
$policies$;

alter policy midia_envia on storage.objects
  with check (bucket_id = 'midia' and (select public.e_administrador()));
alter policy midia_troca on storage.objects
  using (bucket_id = 'midia' and (select public.e_administrador()))
  with check (bucket_id = 'midia' and (select public.e_administrador()));
alter policy midia_apaga on storage.objects
  using (bucket_id = 'midia' and (select public.e_administrador()));

-- RPCs SECURITY DEFINER também precisam verificar a lista, não apenas auth.uid.
-- Preserva as rotinas já instaladas e não lê/exibe o token armazenado.
do $rpcs$
declare assinatura text; definicao text;
begin
  foreach assinatura in array array['public.status_publicacao()','public.publicar_agora()','public.definir_token_github(text)'] loop
    select pg_get_functiondef(assinatura::regprocedure) into definicao;
    if position('controle_administrador_v1' in definicao) = 0 then
      if definicao !~* '\mbegin\M' then raise exception 'Rotina sem bloco BEGIN: %', assinatura; end if;
      definicao := regexp_replace(definicao, '\mbegin\M', E'begin\n  -- controle_administrador_v1\n  if not public.e_administrador() then\n    raise exception ''Acesso restrito aos administradores autorizados.'' using errcode = ''42501'';\n  end if;', 'i');
      execute definicao;
    end if;
    execute format('revoke all on function %s from public, anon', assinatura);
    execute format('grant execute on function %s to authenticated', assinatura);
  end loop;
end
$rpcs$;

comment on function public.e_administrador() is 'Confere somente o UID da sessão na lista privada de administradores ativos. Não usa metadados editáveis pelo usuário.';
notify pgrst, 'reload schema';
