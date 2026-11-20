/**
 * Números e índices que saem do conteúdo que já existe no banco.
 *
 * Nada aqui é cadastrado à mão: os quilômetros vêm do campo `distancia` das
 * publicações e os lugares vêm do `local`/`uf` das viagens e da `cidade` das
 * peças da sala de troféus.
 */
import type { Encontro, Post, Trofeu } from './dados';
import type { MarcoEstrada } from '../data/marcos-estrada';

const UFS: Record<string, string> = {
  acre: 'AC',
  alagoas: 'AL',
  amapá: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceará: 'CE',
  'distrito federal': 'DF',
  'espírito santo': 'ES',
  goiás: 'GO',
  maranhão: 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  pará: 'PA',
  paraíba: 'PB',
  paraná: 'PR',
  pernambuco: 'PE',
  piauí: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondônia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'são paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
};

const UF_EXTENSO: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
};

export const nomeDaUf = (uf?: string): string => (uf ? (UF_EXTENSO[uf] ?? uf) : 'Sem estado');

/** "186 km de asfalto" → 186 · "1.240 km" → 1240 · sem número → 0 */
export function kmDe(distancia?: string): number {
  if (!distancia) return 0;
  const m = distancia.replace(/\./g, '').match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

/** Soma dos quilômetros registrados nas publicações. */
export function kilometros(posts: Post[]): number {
  return posts.reduce((total, p) => total + kmDe(p.data.distancia), 0);
}

/** "186 km" ou "12 km" — formatação à brasileira. */
export const kmTexto = (n: number): string => n.toLocaleString('pt-BR');

/**
 * Normaliza uma cidade que vem como "Gravatá — PE" ou "Pernambuco" (só estado).
 * Devolve o nome da cidade (ou do estado, quando é o caso) e a UF.
 */
export function separarCidade(valor?: string): { nome: string; uf?: string } {
  const bruto = (valor ?? '').trim();
  if (!bruto) return { nome: '' };

  const partes = bruto.split(/\s+[—-]\s+|\s*\/\s*/).map((p) => p.trim()).filter(Boolean);
  const ultima = partes[partes.length - 1] ?? '';
  const ehUf = /^[A-Z]{2}$/.test(ultima);
  const uf = ehUf ? ultima : UFS[bruto.toLowerCase()];

  if (ehUf) return { nome: partes.slice(0, -1).join(' — '), uf };
  if (UFS[bruto.toLowerCase()]) return { nome: '', uf };
  return { nome: bruto };
}

/** Destinos explícitos substituem o texto livre; vazio mantém o modo legado. */
export function destinosRegistro(data: { destinos?: { nome: string; uf: string; lat?: number; lng?: number }[]; local?: string; uf?: string; cidade?: string }) {
  if (Array.isArray(data.destinos) && data.destinos.length) return data.destinos;
  const local = separarCidade(data.local || data.cidade);
  return local.nome ? [{ nome: local.nome, uf: data.uf || local.uf }] :
    local.uf ? [{ nome: nomeDaUf(local.uf), uf: local.uf }] : [];
}

export type VisitaConfirmada = { nome: string; uf: string; observacao?: string };

const chaveLugar = (nome: string, uf?: string) => `${(uf ?? '').trim().toUpperCase()}|${nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()}`;

export type Lugar = {
  nome: string;
  uf?: string;
  publicacoes: number;
  pecas: number;
  coords?: [number, number];
  marcos?: MarcoEstrada[];
  visita?: VisitaConfirmada;
};

export type GrupoDeLugar = {
  uf?: string;
  estado: string;
  lugares: Lugar[];
  publicacoes: number;
  pecas: number;
};

/**
 * Índice "onde a gente já esteve": junta viagens (publicações) e troféus por
 * cidade, agrupado por estado. Cidade que só apareceu como estado entra no
 * grupo como "todo o estado".
 */
export function lugares(posts: Post[], trofeus: Trofeu[], marcos: MarcoEstrada[] = [], visitas: VisitaConfirmada[] = []): GrupoDeLugar[] {
  const mapa = new Map<string, Lugar>();

  const registrar = (nome: string, uf: string | undefined, campo: 'publicacoes' | 'pecas', lat?: number, lng?: number) => {
    const chave = chaveLugar(nome, uf);
    if (!mapa.has(chave)) mapa.set(chave, { nome, uf, publicacoes: 0, pecas: 0 });
    const lugar = mapa.get(chave)!;
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat!) <= 90 && Math.abs(lng!) <= 180 && !lugar.coords) lugar.coords = [lat!, lng!];
    lugar[campo] += 1;
  };

  for (const [registros, campo] of [[posts, 'publicacoes'], [trofeus, 'pecas']] as const) {
    for (const registro of registros) {
      const vistos = new Set<string>();
      for (const d of destinosRegistro(registro.data)) {
        const chave = chaveLugar(d.nome, d.uf);
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        registrar(d.nome, d.uf, campo, 'lat' in d ? d.lat : undefined, 'lng' in d ? d.lng : undefined);
      }
    }
  }

  for (const marco of marcos) {
    const chave = chaveLugar(marco.nome, marco.uf);
    if (!mapa.has(chave)) mapa.set(chave, { nome: marco.nome, uf: marco.uf, publicacoes: 0, pecas: 0 });
    const lugar = mapa.get(chave)!;
    lugar.marcos ??= [];
    if (!lugar.marcos.some(m => m.href === marco.href)) lugar.marcos.push(marco);
  }

  // Registros existentes têm prioridade. Visitas não inventam publicações/peças.
  for (const visita of visitas) {
    const chave = chaveLugar(visita.nome, visita.uf);
    if (!mapa.has(chave)) mapa.set(chave, { nome: visita.nome, uf: visita.uf, publicacoes: 0, pecas: 0, visita });
  }

  const grupos = new Map<string, GrupoDeLugar>();
  for (const lugar of mapa.values()) {
    const chave = lugar.uf ?? '';
    if (!grupos.has(chave)) {
      grupos.set(chave, { uf: lugar.uf, estado: nomeDaUf(lugar.uf), lugares: [], publicacoes: 0, pecas: 0 });
    }
    const grupo = grupos.get(chave)!;
    grupo.lugares.push(lugar);
    grupo.publicacoes += lugar.publicacoes;
    grupo.pecas += lugar.pecas;
  }

  return [...grupos.values()]
    .map((g) => ({
      ...g,
      lugares: g.lugares.sort(
        (a, b) => b.publicacoes + b.pecas - (a.publicacoes + a.pecas) || a.nome.localeCompare(b.nome, 'pt-BR')
      ),
    }))
    .sort((a, b) => b.publicacoes + b.pecas - (a.publicacoes + a.pecas) || a.estado.localeCompare(b.estado, 'pt-BR'));
}

export type ItemDaLinhaDoTempo = {
  ano: number | null;
  data: Date | null;
  tipo: 'publicação' | 'peça' | 'encontro';
  titulo: string;
  onde: string;
  href?: string;
};

/** Tudo o que aconteceu, do mais recente para o mais antigo, agrupado por ano. */
export function linhaDoTempo(
  posts: Post[],
  trofeus: Trofeu[],
  encontros: Encontro[] = []
): { ano: number | null; itens: ItemDaLinhaDoTempo[] }[] {
  const itens: ItemDaLinhaDoTempo[] = [];

  for (const p of posts) {
    itens.push({
      ano: p.data.data.getFullYear(),
      data: p.data.data,
      tipo: 'publicação',
      titulo: p.data.titulo,
      onde: [p.data.local, p.data.uf].filter(Boolean).join(' — '),
      href: `/diario/${p.id}`,
    });
  }

  for (const t of trofeus) {
    const data = t.data.data ?? (t.data.ano ? new Date(Date.UTC(t.data.ano, 0, 1)) : null);
    itens.push({
      ano: t.data.ano ?? (t.data.data ? t.data.data.getFullYear() : null),
      data,
      tipo: 'peça',
      titulo: t.data.evento,
      onde: t.data.cidade ?? '',
      href: `/trofeus/${t.id}`,
    });
  }

  for (const e of encontros) {
    itens.push({
      ano: e.data.inicio.getFullYear(),
      data: e.data.inicio,
      tipo: 'encontro',
      titulo: e.data.nome,
      onde: [e.data.cidade, e.data.uf].filter(Boolean).join(' — '),
      href: '/encontros',
    });
  }

  const ordenado = itens.sort((a, b) => {
    const da = a.data?.valueOf() ?? 0;
    const db = b.data?.valueOf() ?? 0;
    return db - da || a.titulo.localeCompare(b.titulo, 'pt-BR');
  });

  const grupos = new Map<number | null, ItemDaLinhaDoTempo[]>();
  for (const item of ordenado) {
    const ano = item.ano ?? null;
    if (!grupos.has(ano)) grupos.set(ano, []);
    grupos.get(ano)!.push(item);
  }

  return [...grupos.entries()]
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : b - a))
    .map(([ano, itens]) => ({ ano, itens }));
}
