/**
 * Camada de dados do site: lê o Supabase e devolve os objetos do jeito que as
 * páginas já esperavam quando o conteúdo vivia em arquivos .md.
 *
 * Cada função é chamada uma única vez por build (o resultado fica em cache),
 * então dá para pedir a lista em várias páginas sem repetir consultas.
 */
import { consultar } from './supabase';

// ---------------------------------------------------------------- tipos

export type Foto = { src: string; legenda?: string; vertical?: boolean };

export type Video = {
  titulo: string;
  youtube?: string;
  arquivo?: string;
  credito?: string;
};

export type Post = {
  id: string;
  slug: string;
  body: string;
  data: {
    titulo: string;
    data: Date;
    local: string;
    uf?: string;
    resumo: string;
    capa: string;
    capaAlt: string;
    /** Ponto focal do recorte da capa, no formato "50% 32%". */
    capaFoco?: string;
    /** Miniatura gerada no painel (900px), usada nos cartões. */
    capaMini?: string;
    tipo: 'crônica' | 'notícia' | 'relato' | 'aviso';
    distancia?: string;
    tags: string[];
    destaque: boolean;
    rascunho: boolean;
    /** Link do YouTube, quando a publicação tem vídeo. */
    video?: string;
  };
};

export type Album = {
  id: string;
  slug: string;
  data: {
    titulo: string;
    data: Date;
    local: string;
    capa: string;
    capaAlt: string;
    capaFoco?: string;
    capaMini?: string;
    descricao: string;
    fotos: Foto[];
    videos: Video[];
    ordem: number;
    rascunho: boolean;
  };
};

export type Trofeu = {
  id: string;
  slug: string;
  body: string;
  data: {
    evento: string;
    ano?: number;
    data?: Date;
    categoria: string;
    cidade?: string;
    colocacao: string;
    nivel: 'ouro' | 'prata' | 'bronze' | 'laco';
    tipo: 'trofeu' | 'placa' | 'lembranca' | 'construcao';
    edicao?: string;
    historia: string;
    nota?: string;
    foto?: string;
    fotoAlt?: string;
    fotoFoco?: string;
    fotoMini?: string;
    fotos: Foto[];
    destaque: boolean;
    rascunho: boolean;
  };
};

export type Encontro = {
  id: string;
  slug: string;
  data: {
    nome: string;
    inicio: Date;
    fim?: Date;
    cidade: string;
    uf: string;
    local?: string;
    confirmado: boolean;
    observacao?: string;
    /** Encontro cancelado: continua na agenda, mas com o motivo à mostra. */
    cancelado: boolean;
    motivoCancelamento?: string;
  };
};

type Linha = Record<string, any>;

// ---------------------------------------------------------------- ajudantes

const texto = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

/** Postgres devolve `date` como "2026-11-08"; datas à meia-noite UTC erram o dia no Brasil. */
function dataDe(valor: unknown): Date | undefined {
  const s = texto(valor);
  if (!s) return undefined;
  const soDia = /^\d{4}-\d{2}-\d{2}$/.test(s);
  return new Date(soDia ? `${s}T12:00:00` : s);
}

const lista = <T = Linha>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** Cache por tabela: uma consulta por build. */
const cache = new Map<string, Promise<unknown>>();

function umaVez<T>(chave: string, carregar: () => Promise<T>): Promise<T> {
  if (!cache.has(chave)) cache.set(chave, carregar());
  return cache.get(chave) as Promise<T>;
}

const porOrdem = (a: { ordem?: number }, b: { ordem?: number }) =>
  (a.ordem ?? 99) - (b.ordem ?? 99);

// ---------------------------------------------------------------- diário

export function carregarPosts(): Promise<Post[]> {
  return umaVez('posts', async () => {
    const linhas = await consultar<Linha>('posts?select=*&publicado=eq.true&order=data.desc');
    return linhas.map((l) => {
      const data = dataDe(l.data) ?? new Date();
      return {
        id: l.slug as string,
        slug: l.slug as string,
        body: (l.corpo ?? '') as string,
        data: {
          titulo: (l.titulo ?? '') as string,
          data,
          local: (l.local ?? '') as string,
          uf: texto(l.uf),
          resumo: (l.resumo ?? '') as string,
          capa: (l.capa_url ?? '') as string,
          capaAlt: texto(l.capa_alt) ?? (l.titulo ?? '') as string,
          capaFoco: texto(l.capa_foco),
          capaMini: texto(l.capa_mini),
          tipo: (l.tipo ?? 'relato') as Post['data']['tipo'],
          distancia: texto(l.distancia),
          tags: lista<string>(l.tags),
          destaque: Boolean(l.destaque),
          rascunho: l.publicado === false,
          video: texto(l.video_youtube),
        },
      };
    });
  });
}

/**
 * Publicação que já pode aparecer no site.
 *
 * Rascunho nunca aparece; data no futuro fica guardada até o dia chegar — é o
 * "agendar" do painel (o build do dia seguinte encontra a publicação pronta).
 */
export function publicavel(p: Post, hoje = new Date()): boolean {
  if (p.data.rascunho) return false;
  const dia = (d: Date) => d.toISOString().slice(0, 10);
  return dia(p.data.data) <= dia(hoje);
}

/** Atalho: só as publicações liberadas, da mais nova para a mais antiga. */
export function postsNoAr(posts: Post[], hoje = new Date()): Post[] {
  return posts
    .filter((p) => publicavel(p, hoje))
    .sort((a, b) => b.data.data.valueOf() - a.data.data.valueOf());
}

// ---------------------------------------------------------------- galeria

export function carregarAlbuns(): Promise<Album[]> {
  return umaVez('albuns', async () => {
    const linhas = await consultar<Linha>(
      'albuns?select=*,album_fotos(*),album_videos(*)&publicado=eq.true&order=ordem.asc'
    );
    return linhas.map((l) => ({
      id: l.slug as string,
      slug: l.slug as string,
      data: {
        titulo: (l.titulo ?? '') as string,
        data: dataDe(l.data) ?? new Date(),
        local: (l.local ?? '') as string,
        capa: (l.capa_url ?? '') as string,
        capaAlt: texto(l.capa_alt) ?? (l.titulo ?? '') as string,
        capaFoco: texto(l.capa_foco),
        capaMini: texto(l.capa_mini),
        descricao: (l.descricao ?? '') as string,
        fotos: lista<Linha>(l.album_fotos)
          .slice()
          .sort(porOrdem)
          .map((f) => ({
            src: (f.url ?? '') as string,
            legenda: texto(f.legenda),
            vertical: Boolean(f.vertical),
          })),
        videos: lista<Linha>(l.album_videos)
          .slice()
          .sort(porOrdem)
          .map((v) => ({
            titulo: (v.titulo ?? '') as string,
            youtube: texto(v.youtube),
            arquivo: texto(v.arquivo),
            credito: texto(v.credito),
          })),
        ordem: Number(l.ordem ?? 99),
        rascunho: l.publicado === false,
      },
    }));
  });
}

// ---------------------------------------------------------------- troféus

export function carregarTrofeus(): Promise<Trofeu[]> {
  return umaVez('trofeus', async () => {
    const linhas = await consultar<Linha>('trofeus?select=*,trofeu_fotos(*)&publicado=eq.true');
    return linhas.map((l) => ({
      id: l.slug as string,
      slug: l.slug as string,
      body: (l.corpo ?? '') as string,
      data: {
        evento: (l.evento ?? '') as string,
        ano: l.ano == null ? undefined : Number(l.ano),
        data: dataDe(l.data),
        categoria: (l.categoria ?? 'Participação') as string,
        cidade: texto(l.cidade),
        colocacao: (l.colocacao ?? 'Participação') as string,
        nivel: (l.nivel ?? 'laco') as Trofeu['data']['nivel'],
        tipo: (l.tipo ?? 'trofeu') as Trofeu['data']['tipo'],
        edicao: texto(l.edicao),
        historia: (l.historia ?? '') as string,
        nota: texto(l.nota),
        foto: texto(l.foto_url),
        fotoAlt: texto(l.foto_alt),
        fotoFoco: texto(l.foto_foco),
        fotoMini: texto(l.foto_mini),
        fotos: lista<Linha>(l.trofeu_fotos)
          .slice()
          .sort(porOrdem)
          .map((f) => ({ src: (f.url ?? '') as string, legenda: texto(f.legenda) })),
        destaque: Boolean(l.destaque),
        rascunho: l.publicado === false,
      },
    }));
  });
}

// ---------------------------------------------------------------- encontros

export function carregarEncontros(): Promise<Encontro[]> {
  return umaVez('encontros', async () => {
    const linhas = await consultar<Linha>(
      'encontros?select=*&publicado=eq.true&order=inicio.asc'
    );
    return linhas.map((l) => ({
      id: String(l.id),
      slug: String(l.id),
      data: {
        nome: (l.nome ?? '') as string,
        inicio: dataDe(l.inicio) ?? new Date(),
        fim: dataDe(l.fim),
        cidade: (l.cidade ?? '') as string,
        uf: (l.uf ?? '') as string,
        local: texto(l.local),
        confirmado: l.confirmado !== false,
        observacao: texto(l.observacao),
        cancelado: l.cancelado === true,
        motivoCancelamento: texto(l.motivo_cancelamento),
      },
    }));
  });
}
