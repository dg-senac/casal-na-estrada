export const BUCKET_RASCUNHOS = 'midia-rascunhos';
const CAMINHO = /^v1\/[a-f0-9-]{36}\.(webp|jpg)$/;
export function urlFotoPrivada(base, caminho) {
  if (!CAMINHO.test(caminho)) throw new Error('Caminho de foto inválido.');
  return `${base.replace(/\/$/, '')}/functions/v1/foto-publicada/${caminho}`;
}
export function caminhoFotoPrivada(base, valor) {
  const prefixo = `${base.replace(/\/$/, '')}/functions/v1/foto-publicada/`;
  if (typeof valor !== 'string' || !valor.startsWith(prefixo)) return null;
  const caminho = valor.slice(prefixo.length);
  return CAMINHO.test(caminho) ? caminho : null;
}

/** Só troca src de imagens. Campos persistidos continuam com URL estável, sem tokens. */
export function criarPreviaPrivada({ client, base, documento = document }) {
  let ativa = false, geracao = 0;
  const blobs = new Map(), pendentes = new Set();
  const atualizar = async () => {
    if (!ativa) return;
    for (const img of documento.querySelectorAll('img[src]')) {
      const original = img.getAttribute('src');
      const caminho = caminhoFotoPrivada(base, original);
      if (!caminho) continue;
      if (blobs.has(caminho)) { img.src = blobs.get(caminho); continue; }
      if (pendentes.has(caminho)) continue;
      pendentes.add(caminho);
      const rodada = geracao;
      try {
        const { data, error } = await client.storage.from(BUCKET_RASCUNHOS).download(caminho);
        if (!ativa || rodada !== geracao || error || !data) continue;
        const url = URL.createObjectURL(data);
        blobs.set(caminho, url);
        // Pode haver mais de uma prévia da mesma foto.
        for (const alvo of documento.querySelectorAll('img[src]')) {
          if (alvo.getAttribute('src') === original) alvo.src = url;
        }
      } catch { /* Falha fechada: nunca copiar a foto para um bucket público. */ }
      finally { if (rodada === geracao) pendentes.delete(caminho); }
    }
  };
  const observador = new documento.defaultView.MutationObserver(atualizar);
  observador.observe(documento.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });
  return {
    ativar() { ativa = true; atualizar(); },
    limpar() {
      ativa = false; geracao++;
      for (const url of blobs.values()) URL.revokeObjectURL(url);
      blobs.clear(); pendentes.clear();
    },
  };
}
