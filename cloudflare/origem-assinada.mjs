import {assinarOrigem,caminhoOrigemAssinada} from '../experiments/emergencia/assinatura-origem.mjs';
const BASE='https://pjglrlullnchqazxpvyn.supabase.co';
async function aberto(env){try{return (await env.DB.prepare('SELECT manutencao FROM estado_site WHERE id = 1').first())?.manutencao===0;}catch{return false;}}
export function caminhoAssinadoDaUrl(valor){
 if(typeof valor!=='string')return null;
 let u;try{u=new URL(valor);}catch{return null;}
 if(u.origin!==BASE||u.search||u.hash||u.username||u.password)return null;
 const fontes=[['/functions/v1/foto-publicada/','midia-rascunhos/'],['/storage/v1/object/public/midia/','midia/']];
 for(const [prefixo,bucket] of fontes)if(u.pathname.startsWith(prefixo)){
  const path='/midia-worker/'+bucket+u.pathname.slice(prefixo.length);return caminhoOrigemAssinada(path)?path:null;
 }
 return null;
}
export async function lerImagemLimitada(r){
 if(r.status!==200||!r.body)throw Error('Imagem não recebida');
 const tipo=(r.headers.get('Content-Type')||'').split(';')[0].toLowerCase().trim();
 if(!['image/jpeg','image/webp','image/png'].includes(tipo)){await r.body.cancel();throw Error('Formato não permitido');}
 const reader=r.body.getReader(),partes=[];let total=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>10*1024*1024)throw Error('Limite excedido');partes.push(value);}}
 finally{try{await reader.cancel();}catch{}reader.releaseLock();}
 const bytes=new Uint8Array(total);let pos=0;for(const p of partes){bytes.set(p,pos);pos+=p.length;}return {bytes,tipo};
}
/** Uso interno apenas. Não exposto como proxy público nesta etapa. */
export async function buscarOrigemAssinada(caminho,env,buscar=fetch){
 if(!caminhoOrigemAssinada(caminho)||!await aberto(env))throw Error('Canal indisponível');
 const segredo=env.MIDIA_WORKER_HMAC;
 const headers=await assinarOrigem({segredo,caminho});
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),20000);
 let r;
 try{
  r=await buscar(BASE+'/functions/v1'+caminho,{method:'GET',headers,redirect:'manual',cache:'no-store',signal:ac.signal});
  const imagem=await lerImagemLimitada(r);
  if(!await aberto(env))throw Error('Manutenção ativa');
  return imagem;
 }finally{try{await r?.body?.cancel();}catch{}clearTimeout(timer);}
}
