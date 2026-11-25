-- Reversão do corte: restaura leitura pública e gatilhos antigos; remove contenção.
CREATE POLICY leitura_publica ON public.posts FOR SELECT TO public USING (publicado = true AND data <= (now() AT TIME ZONE 'America/Recife')::date);
ALTER TABLE public.posts ENABLE TRIGGER publicacao_automatica;
CREATE POLICY leitura_publica ON public.albuns FOR SELECT TO public USING (publicado = true);
ALTER TABLE public.albuns ENABLE TRIGGER publicacao_automatica;
CREATE POLICY leitura_publica ON public.trofeus FOR SELECT TO public USING (publicado = true);
ALTER TABLE public.trofeus ENABLE TRIGGER publicacao_automatica;
CREATE POLICY leitura_publica ON public.encontros FOR SELECT TO public USING (publicado = true);
ALTER TABLE public.encontros ENABLE TRIGGER publicacao_automatica;
CREATE POLICY leitura_publica ON public.album_fotos FOR SELECT TO public USING (EXISTS (SELECT 1 FROM public.albuns a WHERE a.id=album_fotos.album_id AND a.publicado));
ALTER TABLE public.album_fotos ENABLE TRIGGER publicacao_automatica;
CREATE POLICY leitura_publica ON public.album_videos FOR SELECT TO public USING (EXISTS (SELECT 1 FROM public.albuns a WHERE a.id=album_videos.album_id AND a.publicado));
ALTER TABLE public.album_videos ENABLE TRIGGER publicacao_automatica;
CREATE POLICY leitura_publica ON public.trofeu_fotos FOR SELECT TO public USING (EXISTS (SELECT 1 FROM public.trofeus t WHERE t.id=trofeu_fotos.trofeu_id AND t.publicado));
ALTER TABLE public.trofeu_fotos ENABLE TRIGGER publicacao_automatica;
ALTER POLICY midia_le ON storage.objects TO public USING (bucket_id='midia');
CREATE POLICY rascunhos_le_publicada ON storage.objects FOR SELECT TO anon,authenticated USING (bucket_id='midia-rascunhos' AND public.foto_esta_publicada(name));
UPDATE storage.buckets SET public=true WHERE id='midia';
NOTIFY pgrst, 'reload schema';
