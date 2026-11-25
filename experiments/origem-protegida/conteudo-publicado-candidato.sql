-- CANDIDATO LOCAL. Não aplicado ao Supabase. Não altera políticas existentes.
-- Somente o canal servidor terá EXECUTE; JSON usa allowlist de campos.
CREATE FUNCTION origem_worker.campos_publicos(doc jsonb,campos text[])
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce(jsonb_object_agg(key,value),'{}'::jsonb)
 FROM jsonb_each(doc) WHERE key=ANY(campos);
$$;
REVOKE ALL ON FUNCTION origem_worker.campos_publicos(jsonb,text[]) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION origem_worker.conteudo_publicado()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE resultado jsonb;
BEGIN
 resultado:=jsonb_build_object(
 'versao',1,
 'posts',coalesce((SELECT jsonb_agg(origem_worker.campos_publicos(to_jsonb(p),ARRAY['id','slug','titulo','data','local','uf','resumo','tipo','distancia','tags','destaque','publicado','capa_url','capa_alt','capa_foco','capa_mini','corpo','video_youtube','destinos_mapa','ficha_rota']) ORDER BY p.data DESC,p.id)
 FROM public.posts p WHERE p.publicado AND p.data<=(now() AT TIME ZONE 'America/Recife')::date),'[]'::jsonb),
 'albuns',coalesce((SELECT jsonb_agg(origem_worker.campos_publicos(to_jsonb(a),ARRAY['id','slug','titulo','data','local','descricao','capa_url','capa_alt','capa_foco','capa_mini','ordem','publicado'])||jsonb_build_object(
 'album_fotos',coalesce((SELECT jsonb_agg(origem_worker.campos_publicos(to_jsonb(f),ARRAY['id','url','legenda','vertical','ordem']) ORDER BY f.ordem,f.id) FROM public.album_fotos f WHERE f.album_id=a.id),'[]'::jsonb),
 'album_videos',coalesce((SELECT jsonb_agg(origem_worker.campos_publicos(to_jsonb(v),ARRAY['id','titulo','youtube','arquivo','credito','ordem']) ORDER BY v.ordem,v.id) FROM public.album_videos v WHERE v.album_id=a.id),'[]'::jsonb)
 ) ORDER BY a.ordem,a.id) FROM public.albuns a WHERE a.publicado),'[]'::jsonb),
 'trofeus',coalesce((SELECT jsonb_agg(origem_worker.campos_publicos(to_jsonb(t),ARRAY['id','slug','evento','ano','data','categoria','cidade','colocacao','nivel','tipo','edicao','historia','nota','foto_url','foto_alt','foto_foco','foto_mini','destaque','publicado','destinos_mapa'])||jsonb_build_object(
 'trofeu_fotos',coalesce((SELECT jsonb_agg(origem_worker.campos_publicos(to_jsonb(f),ARRAY['id','url','legenda','ordem']) ORDER BY f.ordem,f.id) FROM public.trofeu_fotos f WHERE f.trofeu_id=t.id),'[]'::jsonb)
 ) ORDER BY t.id) FROM public.trofeus t WHERE t.publicado),'[]'::jsonb),
 'encontros',coalesce((SELECT jsonb_agg(origem_worker.campos_publicos(to_jsonb(e),ARRAY['id','nome','inicio','fim','cidade','uf','local','confirmado','observacao','publicado','cancelado','motivo_cancelamento','hora_inicio','fonte_url','conferido_em']) ORDER BY e.inicio,e.id) FROM public.encontros e WHERE e.publicado),'[]'::jsonb)
 );
 IF octet_length(resultado::text)>2097152 THEN RAISE EXCEPTION 'Conteudo publicado excede limite'; END IF;
 RETURN resultado;
END;
$$;
REVOKE ALL ON FUNCTION origem_worker.conteudo_publicado() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.origem_worker_conteudo_publicado()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT origem_worker.conteudo_publicado(); $$;
REVOKE ALL ON FUNCTION public.origem_worker_conteudo_publicado() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION origem_worker.conteudo_publicado() TO service_role;
GRANT EXECUTE ON FUNCTION public.origem_worker_conteudo_publicado() TO service_role;
