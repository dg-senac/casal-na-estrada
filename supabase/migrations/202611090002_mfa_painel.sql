-- AAL2 é obrigatório assim que houver fator confirmado na conta.
-- Fatores ainda não confirmados não podem causar bloqueio de acesso.
create or replace function public.e_administrador()
returns boolean language sql stable security definer set search_path = ''
as $func$
  select exists (
    select 1 from painel_privado.administradores a
    where a.usuario_id = (select auth.uid()) and a.ativo
  ) and (
    coalesce((select auth.jwt()->>'aal') = 'aal2', false)
    or not exists (
      select 1 from auth.mfa_factors f
      where f.user_id = (select auth.uid()) and f.status = 'verified'
    )
  );
$func$;
revoke all on function public.e_administrador() from public, anon;
grant execute on function public.e_administrador() to authenticated;

-- Esta RPC só informa o estado da própria conta; não libera dados editoriais.
create or replace function public.estado_acesso_painel()
returns jsonb language plpgsql stable security definer set search_path = ''
as $func$
declare ativo boolean;
begin
  if not exists (select 1 from painel_privado.administradores a where a.usuario_id = auth.uid() and a.ativo) then
    return jsonb_build_object('autorizado', false, 'mfa_ativo', false, 'mfa_necessario', false);
  end if;
  select exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified') into ativo;
  return jsonb_build_object('autorizado', true, 'mfa_ativo', ativo,
    'mfa_necessario', ativo and not coalesce((auth.jwt()->>'aal') = 'aal2', false));
end;
$func$;
revoke all on function public.estado_acesso_painel() from public, anon;
grant execute on function public.estado_acesso_painel() to authenticated;
notify pgrst, 'reload schema';
