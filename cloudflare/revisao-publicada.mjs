function ordenar(v){if(Array.isArray(v))return v.map(ordenar);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordenar(v[k])]));return v;}
export function diaRecife(agora=Date.now()){return new Date(agora-3*3600000).toISOString().slice(0,10);}
export async function revisaoPublicada(conteudo,agora=Date.now()){
 const bytes=new TextEncoder().encode(JSON.stringify({versao:1,dia:diaRecife(agora),conteudo:ordenar(conteudo)}));
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
 return {versao:1,dia:diaRecife(agora),hash};
}
