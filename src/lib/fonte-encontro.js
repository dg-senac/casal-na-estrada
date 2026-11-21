/** Somente links web explícitos; escapar HTML não valida o protocolo. */
export function fonteEncontro(valor) {
  if (typeof valor !== 'string' || !valor.trim()) return '';
  const texto=valor.trim();
  if (texto.length > 2048 || /[\u0000-\u0020\u007f\\]/.test(texto)) return '';
  try {
    const u=new URL(texto);
    return ['https:','http:'].includes(u.protocol) && !u.username && !u.password ? u.href : '';
  } catch { return ''; }
}
export function dataConferencia(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return '';
  const n=Date.parse(valor);
  return Number.isFinite(n) && new Date(n).toISOString().slice(0,10)===valor ? valor : '';
}
