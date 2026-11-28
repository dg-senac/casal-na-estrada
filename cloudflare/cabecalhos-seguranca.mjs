// Aplicado pelo Worker: _headers de assets não cobre todas as respostas do runtime.
export async function protegerResposta(resposta, request, env = {}, politicaHtml = false) {
  const headers = new Headers(resposta.headers);
  headers.set('Strict-Transport-Security', 'max-age=31536000');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  if (!headers.has('Referrer-Policy')) headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  let body = resposta.body;
  if (politicaHtml && headers.get('Content-Type')?.includes('text/html') && !headers.has('Content-Security-Policy')) {
    const html = await resposta.text();
    const hashes = [];
    // Autoriza somente o conteúdo exato dos scripts inline emitidos no build (inclusive JSON-LD).
    for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
      if (!match[1].trim()) continue;
      const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(match[1])));
      hashes.push(`'sha256-${btoa(String.fromCharCode(...bytes))}'`);
    }
    let origem = '';
    try {
      const u = new URL(env.SUPABASE_URL ?? env.PUBLIC_SUPABASE_URL);
      if (u.protocol === 'https:') origem = ` ${u.origin} ${u.origin.replace('https:', 'wss:')}`;
    } catch { /* Sem configuração: não libera conexões externas. */ }
    headers.set('Content-Security-Policy', [
      "default-src 'self'",
      `script-src 'self' ${[...new Set(hashes)].join(' ')}`.trim(),
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' https: data: blob:",
      "font-src 'self' data:",
      `connect-src 'self'${origem}`,
      "media-src 'self' https: blob:",
      "object-src 'none'", "base-uri 'self'", "form-action 'self'",
      "frame-src 'none'", "frame-ancestors 'none'",
    ].join('; '));
    headers.delete('Content-Length');
    body = request.method === 'HEAD' ? null : html;
  }
  return new Response(body, { status: resposta.status, statusText: resposta.statusText, headers });
}
