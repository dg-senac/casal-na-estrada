/** Protocolo candidato servidor-servidor. Sem segredos reais ou implantação. */
const enc=new TextEncoder();
const padraoNonce=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export function caminhoOrigemAssinada(caminho){
 if(typeof caminho!=='string'||caminho.length>1200||!caminho.startsWith('/midia-worker/')||/[?#\\\x00-\x1f\x7f]/.test(caminho))return false;
 const partes=caminho.slice('/midia-worker/'.length).split('/');let p;
 try{p=partes.map(s=>decodeURIComponent(s));}catch{return false;}
 if(p.some(s=>!s||s==='.'||s==='..'||/[/%\\?#\x00-\x1f\x7f]/.test(s)))return false;
 const [bucket,...objeto]=p;
 if(bucket==='midia-rascunhos')return /^v1\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(webp|jpg)$/.test(objeto.join('/'));
 return bucket==='midia'&&objeto.length>0&&/^.+\.(webp|jpe?g|png)$/i.test(objeto.at(-1));
}
async function chaveHmac(segredo,usos){
 if(typeof segredo!=='string'||enc.encode(segredo).length<32)throw Error('Configuração de assinatura indisponível');
 return crypto.subtle.importKey('raw',enc.encode(segredo),{name:'HMAC',hash:'SHA-256'},false,usos);
}
const mensagem=(metodo,caminho,tempo,nonce)=>enc.encode(['midia-worker-v1','pjglrlullnchqazxpvyn',metodo,caminho,tempo,nonce].join('\n'));
export async function assinarOrigem({segredo,metodo='GET',caminho,agora=Date.now(),nonce=crypto.randomUUID()}){
 if(!['GET','HEAD'].includes(metodo)||!caminhoOrigemAssinada(caminho)||!padraoNonce.test(nonce)||!Number.isSafeInteger(agora))throw Error('Pedido de assinatura inválido');
 const tempo=String(Math.floor(agora/1000));
 const bytes=await crypto.subtle.sign('HMAC',await chaveHmac(segredo,['sign']),mensagem(metodo,caminho,tempo,nonce));
 return {'X-Midia-Tempo':tempo,'X-Midia-Nonce':nonce,'X-Midia-Assinatura':[...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('')};
}
/** consumirNonce deve ser INSERT atômico exclusivo, compartilhado entre instâncias.
 * Sem implementação real disso, negar. Não usar Set em memória em produção.
 */
export async function verificarOrigem({request,segredo,agora=Date.now(),consumirNonce}){
 const url=new URL(request.url),metodo=request.method;
 if(url.search||!['GET','HEAD'].includes(metodo)||!caminhoOrigemAssinada(url.pathname)||typeof consumirNonce!=='function'||!Number.isSafeInteger(agora))return false;
 const tempo=request.headers.get('X-Midia-Tempo'),nonce=request.headers.get('X-Midia-Nonce'),hash=request.headers.get('X-Midia-Assinatura');
 if(!/^\d{1,12}$/.test(tempo||'')||!padraoNonce.test(nonce||'')||!/^[a-f0-9]{64}$/.test(hash||''))return false;
 const segundo=Math.floor(agora/1000),emitido=Number(tempo);
 if(segundo-emitido>30||emitido-segundo>5)return false;
 try{
  const assinatura=Uint8Array.from(hash.match(/../g),x=>parseInt(x,16));
  const ok=await crypto.subtle.verify('HMAC',await chaveHmac(segredo,['verify']),assinatura,mensagem(metodo,url.pathname,tempo,nonce));
  if(!ok)return false;
  // Expiração segue horário de aceitação; nonce não pode ser removido antes
  // de todo intervalo de validade da assinatura ter terminado.
  return await consumirNonce(nonce,Math.max(segundo,emitido)+36)===true;
 }catch{return false;}
}
/** Assinatura sozinha NÃO autoriza rascunhos. Guarda separada obrigatória. */
export async function autorizarLeituraOrigem(opcoes,{estaPublicada,lerObjeto}){
 if(typeof estaPublicada!=='function'||typeof lerObjeto!=='function')return null;
 if(!await verificarOrigem(opcoes))return null;
 const caminho=new URL(opcoes.request.url).pathname;
 if(await estaPublicada(caminho)!==true)return null;
 return lerObjeto(caminho);
}
