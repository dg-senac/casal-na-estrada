/** Política para o painel estático. Não permite scripts inline nem eval. */
export function cspPainel(endereco) {
  let origem = '';
  try {
    const u = new URL(endereco);
    if (u.protocol === 'https:' && !u.username && !u.password) origem = u.origin;
  } catch { /* Configuração ausente/inválida: conexões externas negadas. */ }
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'", // estilos do painel e progresso dos uploads
    "font-src 'self'",
    "img-src 'self' https: blob: data:", // fotos e QR TOTP gerado localmente
    `connect-src 'self'${origem ? ` ${origem} ${origem.replace('https:', 'wss:')}` : ''}`,
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'none'", // formulários são tratados pelo SDK, sem navegação
  ].join('; ');
}
