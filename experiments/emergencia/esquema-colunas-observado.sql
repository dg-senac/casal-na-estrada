-- SOMENTE PGlite local. Colunas/defaults consultados no catálogo real, sem dados.
-- Não inclui RLS, grants, Auth, Storage ou triggers de publicação.
create schema restauracao;
create table restauracao.posts (
 id uuid NOT NULL DEFAULT gen_random_uuid(), slug text NOT NULL, titulo text NOT NULL, data date NOT NULL DEFAULT CURRENT_DATE, local text, uf text, resumo text NOT NULL, tipo text NOT NULL DEFAULT 'relato'::text, distancia text, tags text[] NOT NULL DEFAULT '{}'::text[], destaque boolean NOT NULL DEFAULT false, publicado boolean NOT NULL DEFAULT true, capa_url text, capa_alt text, corpo text, video_youtube text, criado_em timestamp with time zone NOT NULL DEFAULT now(), atualizado_em timestamp with time zone NOT NULL DEFAULT now(), capa_foco text, capa_mini text, destinos_mapa jsonb NOT NULL DEFAULT '[]'::jsonb,
 primary key(id), unique(slug), check(char_length(resumo)<=260), check(tipo in ('crônica','notícia','relato','aviso')), check(uf is null or char_length(uf)=2)
);
create table restauracao.albuns (
 id uuid NOT NULL DEFAULT gen_random_uuid(), slug text NOT NULL, titulo text NOT NULL, data date NOT NULL DEFAULT CURRENT_DATE, local text, descricao text, capa_url text, capa_alt text, ordem integer NOT NULL DEFAULT 99, publicado boolean NOT NULL DEFAULT true, criado_em timestamp with time zone NOT NULL DEFAULT now(), atualizado_em timestamp with time zone NOT NULL DEFAULT now(), capa_foco text, capa_mini text,
 primary key(id), unique(slug)
);
create table restauracao.trofeus (
 id uuid NOT NULL DEFAULT gen_random_uuid(), slug text NOT NULL, evento text NOT NULL, ano integer, data date, categoria text NOT NULL DEFAULT 'Participação'::text, cidade text, colocacao text NOT NULL DEFAULT 'Participação'::text, nivel text NOT NULL DEFAULT 'laco'::text, tipo text NOT NULL DEFAULT 'trofeu'::text, edicao text, historia text NOT NULL, nota text, foto_url text, foto_alt text, destaque boolean NOT NULL DEFAULT false, publicado boolean NOT NULL DEFAULT true, criado_em timestamp with time zone NOT NULL DEFAULT now(), atualizado_em timestamp with time zone NOT NULL DEFAULT now(), foto_foco text, foto_mini text, destinos_mapa jsonb NOT NULL DEFAULT '[]'::jsonb,
 primary key(id), unique(slug), check(ano is null or ano between 1990 and 2100), check(nivel in ('ouro','prata','bronze','laco')), check(tipo in ('trofeu','placa','lembranca','construcao'))
);
create table restauracao.encontros (
 id uuid NOT NULL DEFAULT gen_random_uuid(), nome text NOT NULL, inicio date NOT NULL, fim date, cidade text NOT NULL, uf text NOT NULL, local text, confirmado boolean NOT NULL DEFAULT true, observacao text, publicado boolean NOT NULL DEFAULT true, criado_em timestamp with time zone NOT NULL DEFAULT now(), atualizado_em timestamp with time zone NOT NULL DEFAULT now(), cancelado boolean NOT NULL DEFAULT false, motivo_cancelamento text, cancelado_em timestamp with time zone, hora_inicio text, fonte_url text, conferido_em date,
 primary key(id), check(char_length(uf)=2), check(hora_inicio is null or hora_inicio ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
 check(fonte_url is null or (length(fonte_url)<=2048 and fonte_url ~ '^https?://[^/@[:space:]\\]+([/?#]|$)' and fonte_url !~ '[[:space:]\\]'))
);
create table restauracao.album_fotos (
 id uuid NOT NULL DEFAULT gen_random_uuid(), album_id uuid NOT NULL, url text NOT NULL, legenda text, vertical boolean NOT NULL DEFAULT false, ordem integer NOT NULL DEFAULT 0, criado_em timestamp with time zone NOT NULL DEFAULT now(), primary key(id), foreign key(album_id) references restauracao.albuns(id) on delete cascade
);
create table restauracao.album_videos (
 id uuid NOT NULL DEFAULT gen_random_uuid(), album_id uuid NOT NULL, titulo text NOT NULL, youtube text, arquivo text, credito text, ordem integer NOT NULL DEFAULT 0, primary key(id), foreign key(album_id) references restauracao.albuns(id) on delete cascade
);
create table restauracao.trofeu_fotos (
 id uuid NOT NULL DEFAULT gen_random_uuid(), trofeu_id uuid NOT NULL, url text NOT NULL, legenda text, ordem integer NOT NULL DEFAULT 0, criado_em timestamp with time zone NOT NULL DEFAULT now(), primary key(id), foreign key(trofeu_id) references restauracao.trofeus(id) on delete cascade
);
