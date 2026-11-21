/** Recife: UTC−03. Hora opcional; sem hora mantém o comportamento de dia inteiro. */
export function limitesEncontro(inicio: Date, fim?: Date, horaInicio?: string) {
  const dia = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const hora = horaInicio && /^([01]\d|2[0-3]):[0-5]\d$/.test(horaInicio) ? horaInicio : '00:00';
  const primeiroDia = Date.parse(`${dia(inicio)}T00:00:00-03:00`);
  const comeco = Date.parse(`${dia(inicio)}T${hora}:00-03:00`);
  const ultimoDia = Math.max(primeiroDia, Date.parse(`${dia(fim ?? inicio)}T00:00:00-03:00`));
  return { inicio: comeco, fim: ultimoDia + 86400000 };
}
export function estadoEncontro(inicio: number, fim: number, agora: number) {
  return agora < inicio ? 'futuro' : agora < fim ? 'andamento' : 'passado';
}
export function tempoRestante(alvo: number, agora: number) {
  const segundos = Math.max(0, Math.ceil((alvo - agora) / 1000));
  return {
    dias: String(Math.floor(segundos / 86400)),
    horas: String(Math.floor(segundos % 86400 / 3600)).padStart(2, '0'),
    minutos: String(Math.floor(segundos % 3600 / 60)).padStart(2, '0'),
    segundos: String(segundos % 60).padStart(2, '0'),
  };
}
