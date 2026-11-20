/** Memórias documentadas em “O casal”, sem criar posts ou troféus fictícios. */
export type MarcoEstrada = {
  nome: string;
  uf: string;
  ano: number;
  titulo: string;
  href: string;
};

export const primeiraViagem: MarcoEstrada = {
  nome: 'Salvador',
  uf: 'BA',
  ano: 2023,
  titulo: 'Nossa primeira grande viagem — rumo à Bahia',
  href: '/sobre#primeira-viagem',
};

export const marcosEstrada = [primeiraViagem];
