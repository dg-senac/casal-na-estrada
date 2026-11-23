/** Propósito separado do protocolo de imagens: assinaturas não são intercambiáveis. */
const encoder=new TextEncoder(),PATH='/midia-worker/conteudo';
const nonceValido=n=>/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(n||'');
async function key(segredo,uso){if(typeof segredo!=='string'||encoder.encode(segredo).length<32)throw Error('Segredo indisponível');return crypto.subtle.importKey('raw',encoder.encode(segredo),{name:'HMAC',hash:'SHA-256'},false,[uso]);}
const mensagem=(tempo,nonce)=>encoder.encode(['conteudo-worker-v1','pjglrlullnchqazxpvyn','GET',PATH,tempo,nonce].join('\n'));
export async function assinarConteudo(segredo,{agora=Date.now(),nonce=crypto.randomUUID()}={}){
 if(!nonceValido(nonce))throw Error('Nonce inválido');const tempo=String(Math.floor(agora/1000));
 const hash=await crypto.subtle.sign('HMAC',await key(segredo,'sign'),mensagem(tempo,nonce));
 return {'X-Midia-Tempo':tempo,'X-Midia-Nonce':nonce,'X-Midia-Assinatura':[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')};
}
export async function verificarConteudo(request,segredo,consumirNonce,agora=Date.now()){
 const u=new URL(request.url);if(u.pathname!==PATH||u.search||request.method!=='GET'||typeof consumirNonce!=='function')return false;
 const tempo=request.headers.get('X-Midia-Tempo'),nonce=request.headers.get('X-Midia-Nonce'),hash=request.headers.get('X-Midia-Assinatura');
 if(!/^\d{1,12}$/.test(tempo||'')||!nonceValido(nonce)||!/^[a-f0-9]{64}$/.test(hash||''))return false;
 const atual=Math.floor(agora/1000),emitido=Number(tempo);if(atual-emitido>30||emitido-atual>5)return false;
 try{if(!await crypto.subtle.verify('HMAC',await key(segredo,'verify'),Uint8Array.from(hash.match(/../g),s=>parseInt(s,16)),mensagem(tempo,nonce)))return false;return await consumirNonce(nonce,Math.max(atual,emitido)+36)===true;}catch{return false;}
}
