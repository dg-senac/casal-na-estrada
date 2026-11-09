/**
 * Regras da sala de troféus num lugar só.
 *
 * As páginas /trofeus e /trofeus/[slug] usam estes ajudantes para transformar
 * os arquivos de src/content/trofeus em etiquetas, datas e grupos por ano —
 * assim, quando o casal adiciona uma peça nova, nada precisa ser ajustado à mão.
 */
import type { CollectionEntry } from 'astro:content';

export type Trofeu = CollectionEntry<'trofeus'>;

export const NIVEIS = {
  ouro: { curto: '1º', label: '1º lugar' },
  prata: { curto: '2º', label: '2º lugar' },
  bronze: { curto: '3º', label: '3º lugar' },
  laco: { curto: 'Part.', label: 'Participação' },
} as const;

export const TIPOS = {
  trofeu: { curto: 'Troféu', label: 'Troféu de encontro' },
  placa: { curto: 'Placa', label: 'Placa de participação' },
  lembranca: { curto: 'Lembrança', label: 'Lembrança de viagem' },
  construcao: { curto: 'Feito em casa', label: 'Feito em casa' },
} as const;

/** Etiqueta que aparece na foto de cada peça. */
export function selo(t: Trofeu): string {
  if (t.data.nivel !== 'laco') return NIVEIS[t.data.nivel].label;
  if (t.data.tipo === 'trofeu') return NIVEIS.laco.label;
  return TIPOS[t.data.tipo].curto;
}

/** Versão curta da etiqueta, para listas compactas (home). */
export function seloCurto(t: Trofeu): string {
  if (t.data.nivel !== 'laco') return NIVEIS[t.data.nivel].curto;
  if (t.data.tipo === 'trofeu') return 'Part.';
  if (t.data.tipo === 'construcao') return 'Em casa';
  return TIPOS[t.data.tipo].curto;
}

/** Data por extenso quando existe; só o ano quando é o que se sabe. */
export function quando(t: Trofeu): string {
  if (t.data.data) {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(t.data.data);
  }
  if (t.data.ano) return String(t.data.ano);
  return 'sem data';
}

/** Linha curta de data para cartões: edição, data por extenso ou nada. */
export function metaData(t: Trofeu): string {
  if (t.data.edicao) return t.data.edicao;
  if (t.data.data || t.data.ano) return quando(t);
  return '';
}

/**
 * Chave de ordenação: a data do encontro; quando só se sabe o ano, a peça fica
 * no fim daquele ano (não dá para afirmar que foi a mais recente).
 */
export function chaveDeData(t: Trofeu): number {
  if (t.data.data) return t.data.data.valueOf();
  if (t.data.ano) return Date.UTC(t.data.ano, 0, 1);
  return 0;
}

/** Mais recentes primeiro; empate resolvido pelo nome do evento. */
export function ordenar(lista: Trofeu[]): Trofeu[] {
  return [...lista].sort((a, b) => chaveDeData(b) - chaveDeData(a) || a.data.evento.localeCompare(b.data.evento, 'pt-BR'));
}

/** Peças agrupadas por ano, do mais recente para o mais antigo ("Sem data" no fim). */
export function porAno(lista: Trofeu[]): { ano: number | null; pecas: Trofeu[] }[] {
  const grupos = new Map<number | null, Trofeu[]>();
  for (const t of ordenar(lista)) {
    const ano = t.data.ano ?? null;
    if (!grupos.has(ano)) grupos.set(ano, []);
    grupos.get(ano)!.push(t);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : b - a))
    .map(([ano, pecas]) => ({ ano, pecas }));
}

/** Foto principal da peça (campo `foto` ou a primeira de `fotos`). */
export function capa(t: Trofeu): string | undefined {
  return t.data.foto ?? t.data.fotos[0]?.src;
}

/** Texto alternativo com um padrão sensato quando o conteúdo não informa. */
export function capaAlt(t: Trofeu): string {
  return t.data.fotoAlt ?? `Peça da sala de troféus: ${t.data.evento}`;
}

/** Rótulo curto do ano para o índice do topo da página. */
export const rotuloAno = (ano: number | null) => (ano === null ? 'Sem data' : String(ano));
