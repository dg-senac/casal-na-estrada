import municipios from '../data/municipios.json';
import { separarCidade } from './estrada';

export const normalizarLugar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Só geolocaliza cidade inequívoca; nunca usa o centro do estado como cidade. */
export function coordenadas(nome: string, uf?: string): [number, number] | null {
  const partes = separarCidade(nome);
  const cidade = normalizarLugar(partes.nome);
  const estado = (uf || partes.uf)?.toUpperCase();
  if (!cidade) return null;
  const encontrados = municipios.filter(([n, u]) =>
    normalizarLugar(String(n)) === cidade && (!estado || u === estado));
  if (encontrados.length !== 1) return null;
  return [Number(encontrados[0][2]), Number(encontrados[0][3])];
}
