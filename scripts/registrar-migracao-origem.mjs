import {readFileSync,writeFileSync} from 'node:fs';
const pasta='experiments/origem-protegida/';
const sql=readFileSync(pasta+'candidato.sql','utf8')+'\n'+readFileSync(pasta+'rpc-candidatas.sql','utf8')+`
ALTER TABLE origem_worker.nonces ENABLE ROW LEVEL SECURITY;
ALTER FUNCTION origem_worker.consumir_nonce(uuid,bigint) OWNER TO postgres;
ALTER FUNCTION origem_worker.foto_publicada(text,text) OWNER TO postgres;
ALTER FUNCTION public.origem_worker_consumir_nonce(uuid,bigint) OWNER TO postgres;
ALTER FUNCTION public.origem_worker_foto_publicada(text,text) OWNER TO postgres;
NOTIFY pgrst,'reload schema';
`;
writeFileSync('supabase/migrations/202611210006_origem_worker_isolada.sql','-- Registro da migração origem_worker_isolada já aplicada com autorização.\n-- Não reaplicar; arquivos candidatos eram locais, este registro representa a instalação.\n'+sql.replaceAll('-- CANDIDATO: somente testes locais. NÃO aplicar no Supabase nesta etapa.','').replaceAll('-- CANDIDATO LOCAL. Não aplicar no banco real sem revisão/aprovação.',''));
