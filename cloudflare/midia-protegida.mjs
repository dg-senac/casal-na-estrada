import {buscarOrigemAssinada} from './origem-assinada.mjs';
import {caminhoOrigemAssinada} from '../experiments/emergencia/assinatura-origem.mjs';
function negar(status){return new Response(null,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});}
/** Router chama somente depois de verificar manutenção. Helper revalida D1. */
export async function servirMidiaProtegida(request,env,buscar=fetch){
 const u=new URL(request.url);
 if(!['GET','HEAD'].includes(request.method))return negar(405);
 if(u.search||!u.pathname.startsWith('/midia-protegida/'))return negar(404);
 const caminho='/midia-worker/'+u.pathname.slice('/midia-protegida/'.length);
 if(!caminhoOrigemAssinada(caminho))return negar(404);
 try{
  const {bytes,tipo}=await buscarOrigemAssinada(caminho,env,buscar);
  return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':tipo,'Content-Length':String(bytes.length),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; sandbox"}});
 }catch{return negar(503);}
}
