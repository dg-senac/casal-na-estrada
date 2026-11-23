-- Aplicada remotamente: corte_origens_publicas_cloudflare. Não reaplicar.
DROP POLICY leitura_publica ON public.posts;
ALTER TABLE public.posts DISABLE TRIGGER publicacao_automatica;
DROP POLICY leitura_publica ON public.albuns;
ALTER TABLE public.albuns DISABLE TRIGGER publicacao_automatica;
DROP POLICY leitura_publica ON public.trofeus;
ALTER TABLE public.trofeus DISABLE TRIGGER publicacao_automatica;
DROP POLICY leitura_publica ON public.encontros;
ALTER TABLE public.encontros DISABLE TRIGGER publicacao_automatica;
DROP POLICY leitura_publica ON public.album_fotos;
ALTER TABLE public.album_fotos DISABLE TRIGGER publicacao_automatica;
DROP POLICY leitura_publica ON public.album_videos;
ALTER TABLE public.album_videos DISABLE TRIGGER publicacao_automatica;
DROP POLICY leitura_publica ON public.trofeu_fotos;
ALTER TABLE public.trofeu_fotos DISABLE TRIGGER publicacao_automatica;
ALTER POLICY midia_le ON storage.objects TO authenticated USING (bucket_id='midia' AND (SELECT public.e_administrador()));
DROP POLICY rascunhos_le_publicada ON storage.objects;
UPDATE storage.buckets SET public=false WHERE id='midia';
NOTIFY pgrst, 'reload schema';
