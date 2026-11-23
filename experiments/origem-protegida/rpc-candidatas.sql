-- CANDIDATO LOCAL. Não aplicar no banco real sem revisão/aprovação.
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
