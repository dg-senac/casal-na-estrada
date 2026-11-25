-- Registro da migração origem_worker_isolada já aplicada com autorização.
-- Não reaplicar; arquivos candidatos eram locais, este registro representa a instalação.

-- Nenhuma permissão de chamada é concedida ao navegador ou ao anon.
CREATE SCHEMA origem_worker;
REVOKE ALL ON SCHEMA origem_worker FROM PUBLIC;
CREATE TABLE origem_worker.nonces (
 nonce uuid PRIMARY KEY,
 expira_em bigint NOT NULL
);
CREATE INDEX nonces_expira_em ON origem_worker.nonces(expira_em);
REVOKE ALL ON origem_worker.nonces FROM PUBLIC;
CREATE FUNCTION origem_worker.consumir_nonce(valor uuid, expira bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE agora bigint := floor(extract(epoch from clock_timestamp())); n integer;
BEGIN
 IF expira <= agora OR expira > agora+66 THEN RETURN false; END IF;
 -- Serializa capacidade + INSERT entre instâncias concorrentes.
 LOCK TABLE origem_worker.nonces IN EXCLUSIVE MODE;
 -- Limpeza limitada; índice por expiração evita varrer indefinidamente.
 DELETE FROM origem_worker.nonces WHERE nonce IN (
  SELECT nonce FROM origem_worker.nonces WHERE expira_em < agora ORDER BY expira_em LIMIT 100
 );
 IF (SELECT count(*) FROM origem_worker.nonces)>=10000 THEN RETURN false; END IF;
 INSERT INTO origem_worker.nonces(nonce,expira_em) VALUES(valor,expira) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS n=ROW_COUNT;
 RETURN n=1;
END;
$$;
REVOKE ALL ON FUNCTION origem_worker.consumir_nonce(uuid,bigint) FROM PUBLIC;

CREATE FUNCTION origem_worker.foto_publicada(bucket text,caminho text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT bucket IN ('midia','midia-rascunhos')
 AND length(caminho) BETWEEN 1 AND 1024
 AND caminho !~ '(^|/)\.\.?(/|$)'
 AND caminho !~ '[[:cntrl:]\\?#%]'
 AND caminho !~ '(^/|/$|//)'
 AND (bucket<>'midia-rascunhos' OR caminho ~ '^v1/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(webp|jpg)$')
 AND caminho ~* '\.(webp|jpe?g|png)$'
 AND EXISTS (
  SELECT 1 FROM (
   SELECT p.capa_url url FROM public.posts p WHERE p.publicado AND p.data <= (now() AT TIME ZONE 'America/Recife')::date
   UNION ALL SELECT p.capa_mini FROM public.posts p WHERE p.publicado AND p.data <= (now() AT TIME ZONE 'America/Recife')::date
   UNION ALL SELECT a.capa_url FROM public.albuns a WHERE a.publicado
   UNION ALL SELECT a.capa_mini FROM public.albuns a WHERE a.publicado
   UNION ALL SELECT t.foto_url FROM public.trofeus t WHERE t.publicado
   UNION ALL SELECT t.foto_mini FROM public.trofeus t WHERE t.publicado
   UNION ALL SELECT f.url FROM public.album_fotos f JOIN public.albuns a ON a.id=f.album_id WHERE a.publicado
   UNION ALL SELECT f.url FROM public.trofeu_fotos f JOIN public.trofeus t ON t.id=f.trofeu_id WHERE t.publicado
  ) refs
  WHERE refs.url=CASE WHEN bucket='midia-rascunhos'
   THEN 'https://pjglrlullnchqazxpvyn.supabase.co/functions/v1/foto-publicada/'||caminho
   ELSE 'https://pjglrlullnchqazxpvyn.supabase.co/storage/v1/object/public/midia/'||caminho END
 );
$$;
REVOKE ALL ON FUNCTION origem_worker.foto_publicada(text,text) FROM PUBLIC;


-- service_role aqui representa APENAS o canal interno da Edge.
-- O Worker e o navegador NÃO recebem essa credencial.
GRANT USAGE ON SCHEMA origem_worker TO service_role;
GRANT EXECUTE ON FUNCTION origem_worker.consumir_nonce(uuid,bigint) TO service_role;
GRANT EXECUTE ON FUNCTION origem_worker.foto_publicada(text,text) TO service_role;
CREATE FUNCTION public.origem_worker_consumir_nonce(valor uuid,expira bigint)
RETURNS boolean LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path='' AS $$
 SELECT origem_worker.consumir_nonce(valor,expira);
$$;
CREATE FUNCTION public.origem_worker_foto_publicada(bucket text,caminho text)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT origem_worker.foto_publicada(bucket,caminho);
$$;
REVOKE ALL ON FUNCTION public.origem_worker_consumir_nonce(uuid,bigint) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.origem_worker_foto_publicada(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.origem_worker_consumir_nonce(uuid,bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.origem_worker_foto_publicada(text,text) TO service_role;

REVOKE ALL ON SCHEMA origem_worker FROM anon,authenticated;
REVOKE ALL ON TABLE origem_worker.nonces FROM anon,authenticated;
REVOKE ALL ON FUNCTION origem_worker.consumir_nonce(uuid,bigint) FROM anon,authenticated;
REVOKE ALL ON FUNCTION origem_worker.foto_publicada(text,text) FROM anon,authenticated;

ALTER TABLE origem_worker.nonces ENABLE ROW LEVEL SECURITY;
ALTER FUNCTION origem_worker.consumir_nonce(uuid,bigint) OWNER TO postgres;
ALTER FUNCTION origem_worker.foto_publicada(text,text) OWNER TO postgres;
ALTER FUNCTION public.origem_worker_consumir_nonce(uuid,bigint) OWNER TO postgres;
ALTER FUNCTION public.origem_worker_foto_publicada(text,text) OWNER TO postgres;
NOTIFY pgrst,'reload schema';
