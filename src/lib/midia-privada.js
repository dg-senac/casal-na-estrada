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

/** Referências históricas também precisam de download autenticado após o corte. */
export function referenciaFotoAdmin(base,valor){
 const privada=caminhoFotoPrivada(base,valor);
 if(privada)return {bucket:BUCKET_RASCUNHOS,caminho:privada};
 if(typeof valor!=='string')return null;
 const prefixos=[
  [base.replace(/\/$/,'')+'/storage/v1/object/public/midia/','midia'],
  ['https://casal-na-estrada.douglasmarista02.workers.dev/midia-protegida/midia/','midia'],
  ['https://casal-na-estrada-site-teste.douglasmarista02.workers.dev/midia-protegida/midia/','midia'],
  ['https://casal-na-estrada-site-teste.douglasmarista02.workers.dev/midia-protegida/midia-rascunhos/',BUCKET_RASCUNHOS],
  ['https://casal-na-estrada.douglasmarista02.workers.dev/midia-protegida/midia-rascunhos/',BUCKET_RASCUNHOS],
 ];
 for(const [prefixo,bucket] of prefixos){if(!valor.startsWith(prefixo))continue;try{
  const caminho=decodeURIComponent(valor.slice(prefixo.length));
  if(!caminho||caminho.length>1024||/[?#\\\x00-\x1f]/.test(caminho)||caminho.split('/').some(p=>!p||p==='.'||p==='..'))return null;
  return {bucket,caminho};
 }catch{return null;}}
 return null;
}

/** Só troca src de imagens. Campos persistidos continuam com URL estável, sem tokens. */
export function criarPreviaPrivada({ client, base, documento = document }) {
  let ativa = false, geracao = 0;
  const blobs = new Map(), pendentes = new Set();
  const atualizar = async () => {
    if (!ativa) return;
    for (const img of documento.querySelectorAll('img[src]')) {
      const original = img.getAttribute('src');
      const referencia = referenciaFotoAdmin(base, original);
      const caminho = referencia ? referencia.bucket+'/'+referencia.caminho : null;
      if (!caminho) continue;
      if (blobs.has(caminho)) { img.src = blobs.get(caminho); continue; }
      if (pendentes.has(caminho)) continue;
      pendentes.add(caminho);
      const rodada = geracao;
      try {
        const { data, error } = await client.storage.from(referencia.bucket).download(referencia.caminho);
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
