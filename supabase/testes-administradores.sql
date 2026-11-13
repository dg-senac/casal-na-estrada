-- Executar somente por conexão administrativa confiável. Não executa alterações
-- editoriais, uploads nem disparos de publicação. Claims expiram no rollback.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ba77b481-884d-49ee-83b9-d182179f9547","role":"authenticated"}', true);
do $teste$
begin
  if not public.e_administrador() then raise exception 'Administrador perdeu acesso'; end if;
  if public.status_publicacao()->>'ok' <> 'true' then raise exception 'Status negado ao administrador'; end if;
  if has_schema_privilege(current_user,'painel_privado','USAGE') then raise exception 'Lista privada exposta'; end if;
end $teste$;

select set_config('request.jwt.claims',json_build_object('sub',gen_random_uuid(),'role','authenticated','user_metadata',json_build_object('admin',true))::text,true);
do $teste$
declare resultado jsonb;
begin
  if public.e_administrador() then raise exception 'Metadado deu acesso indevido'; end if;
  resultado := public.status_publicacao();
  if resultado->>'ok' <> 'false' or resultado ? 'configurada' or resultado ? 'ultima_em' then raise exception 'RPC revelou dados privados'; end if;
  if exists(select 1 from public.posts where publicado=false) then raise exception 'Rascunho exposto'; end if;
  if has_schema_privilege(current_user,'painel_privado','USAGE') then raise exception 'Lista exposta'; end if;
  if has_function_privilege(current_user,'public.envia_build(boolean)','EXECUTE') then raise exception 'Build interno exposto'; end if;
end $teste$;
reset role;
set local role anon;
do $teste$
begin
  if has_function_privilege(current_user,'public.e_administrador()','EXECUTE') then raise exception 'Helper exposto a anon'; end if;
  if has_function_privilege(current_user,'public.publicar_agora()','EXECUTE') then raise exception 'RPC exposta a anon'; end if;
  if has_function_privilege(current_user,'public.definir_token_github(text)','EXECUTE') then raise exception 'RPC exposta a anon'; end if;
  if exists(select 1 from public.posts where publicado=false) then raise exception 'Rascunho exposto'; end if;
end $teste$;
rollback;
