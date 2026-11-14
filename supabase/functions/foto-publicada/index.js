// Sem service_role: a leitura do objeto continua sujeita à RLS do papel anon.
export async function responderFoto(request, { base, chave, buscar = fetch }) {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  const negar = status => new Response(null, { status, headers });
  if (!['GET', 'HEAD'].includes(request.method)) return negar(405);
  const caminho = new URL(request.url).pathname.split('/foto-publicada/')[1];
  if (!/^v1\/[a-f0-9-]{36}\.(webp|jpg)$/.test(caminho ?? '')) return negar(404);
  if (!base || !chave) return negar(503);
  try {
    const resposta = await buscar(`${base}/storage/v1/object/authenticated/midia-rascunhos/${caminho}`, {
      method: request.method,
      headers: { apikey: chave, Authorization: `Bearer ${chave}`, 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(15000),
    });
    if (!resposta.ok) return negar(resposta.status >= 500 ? 503 : 404);
    const tipo = resposta.headers.get('content-type')?.split(';')[0];
    if (!['image/webp', 'image/jpeg'].includes(tipo)) return negar(404);
    return new Response(request.method === 'HEAD' ? null : resposta.body, {
      headers: { ...headers, 'Content-Type': tipo, 'Content-Disposition': 'inline' },
    });
  } catch { return negar(503); }
}
if (typeof Deno !== 'undefined') {
  Deno.serve(request => responderFoto(request, {
    base: Deno.env.get('SUPABASE_URL'), chave: Deno.env.get('SUPABASE_ANON_KEY'),
  }));
}
