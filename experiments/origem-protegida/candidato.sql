-- CANDIDATO: somente testes locais. NÃO aplicar no Supabase nesta etapa.
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
