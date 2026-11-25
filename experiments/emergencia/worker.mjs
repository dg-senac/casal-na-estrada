/** Protótipo isolado: sem dados reais, sem rotas remotas de administração. */
export function criarServidor({ estado, assets }) {
  return {
    async fetch(request) {
      let manutencao;
      try { manutencao = await estado.ativo(); }
      catch { return indisponivel(); }
      if (manutencao !== false) return indisponivel();
      // Nesta prova TODAS as rotas são bloqueadas, sem exceção para assets/feed.
      return assets.fetch(request);
    },
  };
}
function indisponivel() {
  return new Response('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Manutenção</title><h1>Voltamos em breve</h1><p>O site está temporariamente em manutenção.</p></html>', {
    status: 503,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'retry-after': '300', 'x-robots-tag': 'noindex', 'content-security-policy': "default-src 'none'; frame-ancestors 'none'" },
  });
}
/** Somente chamada interna de teste. Não expor sem autenticação/autorização/MFA. */
export async function acionarEmergencia({ estado, snapshots, lerDados, id }) {
  await estado.ativar(); // Falha aqui aborta; não anunciar bloqueio inexistente.
  try {
    const dados = await lerDados();
    const conteudo = JSON.stringify({ versao: 1, tipo: 'snapshot-de-incidente', dados });
    await snapshots.criarSemSobrescrever(id, conteudo);
    return { manutencao: true, backup: 'concluido' };
  } catch {
    return { manutencao: true, backup: 'falhou' };
  }
}
