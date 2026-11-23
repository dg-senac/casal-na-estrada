const BASE='https://pjglrlullnchqazxpvyn.supabase.co';
const enc=new TextEncoder();
const negar=s=>new Response(null,{status:s,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});
async function ler(r,max){if(!r.body)throw Error('body');const reader=r.body.getReader(),partes=[];let total=0;try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>max)throw Error('size');partes.push(value);}}finally{try{await reader.cancel();}catch{}reader.releaseLock();}const bytes=new Uint8Array(total);let pos=0;for(const p of partes){bytes.set(p,pos);pos+=p.length;}return bytes;}
Deno.serve(async request=>{
 if(!['GET','HEAD'].includes(request.method))return negar(405);
 const u=new URL(request.url);if(u.search||!u.pathname.startsWith('/midia-worker/')&&!u.pathname.startsWith('/functions/v1/midia-worker/'))return negar(404);
 const path=u.pathname.startsWith('/functions/v1/')?u.pathname.slice('/functions/v1'.length):u.pathname;
 if(path.length>1200)return negar(404);
 let partes;try{partes=path.slice('/midia-worker/'.length).split('/').map(p=>decodeURIComponent(p));}catch{return negar(404);}
 if(partes.some(p=>!p||p==='.'||p==='..'||/[\/%\\?#\x00-\x1f\x7f]/.test(p)))return negar(404);
 const [bucket,...objeto]=partes,caminho=objeto.join('/');
 if(bucket==='midia-rascunhos'){if(!/^v1\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(webp|jpg)$/.test(caminho))return negar(404);}
 else if(bucket!=='midia'||caminho.length>1024||!/^.+\.(webp|jpe?g|png)$/i.test(objeto.at(-1)||''))return negar(404);
 const segredo=Deno.env.get('MIDIA_WORKER_HMAC'),chave=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!segredo||enc.encode(segredo).length<32||!chave||Deno.env.get('SUPABASE_URL')?.replace(/\/$/,'')!==BASE)return negar(503);
 const tempo=request.headers.get('X-Midia-Tempo'),nonce=request.headers.get('X-Midia-Nonce'),assinatura=request.headers.get('X-Midia-Assinatura');
 if(!/^\d{1,12}$/.test(tempo||'')||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(nonce||'')||!/^[a-f0-9]{64}$/.test(assinatura||''))return negar(403);
 const agora=Math.floor(Date.now()/1000),emitido=Number(tempo);if(agora-emitido>30||emitido-agora>5)return negar(403);
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),15000);let imagem;
 try{
 const key=await crypto.subtle.importKey('raw',enc.encode(segredo),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const hash=Uint8Array.from(assinatura.match(/../g),s=>parseInt(s,16));
 const mensagem=enc.encode(['midia-worker-v1','pjglrlullnchqazxpvyn',request.method,path,tempo,nonce].join('\n'));
 if(!await crypto.subtle.verify('HMAC',key,hash,mensagem))return negar(403);
 const headers={apikey:chave,Authorization:'Bearer '+chave};
 const buscar=(url,o)=>fetch(url,{...o,redirect:'manual',cache:'no-store',signal:ac.signal});
 const rpc=async(nome,body)=>{const r=await buscar(BASE+'/rest/v1/rpc/'+nome,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body)});if(r.status!==200){try{await r.body?.cancel();}catch{}throw Error('rpc');}const texto=new TextDecoder().decode(await ler(r,1024));if(texto!=='true'&&texto!=='false')throw Error('rpc-format');return texto==='true';};
 if(!await rpc('origem_worker_consumir_nonce',{valor:nonce,expira:Math.max(agora,emitido)+36}))return negar(403);
 const publicada=()=>rpc('origem_worker_foto_publicada',{bucket,caminho});
 if(!await publicada())return negar(404);
 imagem=await buscar(BASE+'/storage/v1/object/authenticated/'+partes.map(encodeURIComponent).join('/'),{method:'GET',headers});
 if(imagem.status!==200)return negar(404);
 const tipo=(imagem.headers.get('Content-Type')||'').split(';')[0].trim().toLowerCase();if(!['image/jpeg','image/png','image/webp'].includes(tipo))return negar(404);
 const tamanho=imagem.headers.get('Content-Length');if(tamanho!==null&&(!/^\d+$/.test(tamanho)||Number(tamanho)>10485760))return negar(502);
 const bytes=await ler(imagem,10485760);if(!await publicada())return negar(404);
 return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':tipo,'Content-Length':String(bytes.length),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex','Content-Security-Policy':"default-src 'none'; sandbox",'Referrer-Policy':'no-referrer'}});
 }catch{return negar(503);}finally{try{await imagem?.body?.cancel();}catch{}clearTimeout(timer);}
});
