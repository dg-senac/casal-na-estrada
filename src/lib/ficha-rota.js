/** Campos opcionais: nenhum dado de percurso é inferido pelo sistema. */
export const camposFicha = [
  ['origem', 'Origem', 'texto'],
  ['destino', 'Destino / percurso', 'texto'],
  ['distancia_tipo', 'A distância do cadastro corresponde a', 'select'],
  ['duracao', 'Tempo aproximado (informe se inclui paradas)', 'texto'],
  ['paradas', 'Paradas para descanso e café', 'area'],
  ['abastecimento', 'Abastecimento', 'area'],
  ['pedagios', 'Pedágios (custos e data, se conhecidos)', 'area'],
  ['gastos', 'Gastos aproximados (total ou por pessoa)', 'area'],
  ['asfalto', 'Condições do asfalto observadas na viagem', 'area'],
  ['observacoes', 'Outras observações do percurso', 'area'],
  ['conferido_em', 'Data dessas informações (opcional)', 'data'],
];
export const tiposDistancia = { ida: 'Somente ida', ida_volta: 'Ida e volta' };

export function normalizarFicha(valor) {
  if (valor == null) return {};
  if (typeof valor !== 'object' || Array.isArray(valor)) throw Error('Ficha da rota inválida.');
  const resultado = {};
  for (const [chave] of camposFicha) {
    if (valor[chave] == null || valor[chave] === '') continue;
    if (typeof valor[chave] !== 'string') throw Error('Os campos da ficha devem ser textos.');
    const texto=valor[chave].trim();
    if (!texto) continue;
    if (texto.length > 1000) throw Error('Cada campo da ficha aceita até 1.000 caracteres.');
    if (chave === 'distancia_tipo' && !Object.hasOwn(tiposDistancia,texto)) throw Error('Escolha somente ida ou ida e volta.');
    if (chave === 'conferido_em' && (!/^\d{4}-\d{2}-\d{2}$/.test(texto) || !Number.isFinite(Date.parse(texto)) || new Date(texto).toISOString().slice(0,10)!==texto)) throw Error('Informe uma data válida na ficha da rota.');
    resultado[chave]=texto;
  }
  return resultado;
}

export function lerFichaFormulario(form) {
  return normalizarFicha(Object.fromEntries(camposFicha.map(([chave]) => [chave, form.querySelector(`[name="ficha_${chave}"]`)?.value ?? ''])));
}
