/** Cancelamento prevalece; datas encerradas vão ao arquivo, mesmo sem confirmação. */
export function categoriaEncontro(estado, cancelado, confirmado) {
  if (cancelado) return 'cancelado';
  if (estado === 'passado') return 'passado';
  if (!confirmado) return 'confirmar';
  return estado;
}
