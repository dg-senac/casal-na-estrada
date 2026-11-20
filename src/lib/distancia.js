/** Acrescenta a unidade a valores numéricos, sem alterar textos ou unidades já cadastradas. */
export function distanciaComUnidade(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto) return '';
  return /^\d+(?:[.,\s\u00a0]\d+)*$/.test(texto) ? `${texto} km` : texto;
}
