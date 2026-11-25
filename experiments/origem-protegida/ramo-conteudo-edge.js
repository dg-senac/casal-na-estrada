async function conteudoBuild(request,path){
 if(request.method!=='GET')return negar(405);
 const segredo=Deno.env.get('MIDIA_WORKER_HMAC'),chave=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!segredo||enc.encode(segredo).length<32||!chave||Deno.env.get('SUPABASE_URL')?.replace(/\/$/,'')!==BASE)return negar(503);
 const tempo=request.headers.get('X-Midia-Tempo'),nonce=request.headers.get('X-Midia-Nonce'),assinatura=request.headers.get('X-Midia-Assinatura');
 if(!/^\d{1,12}$/.test(tempo||'')||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(nonce||'')||!/^[a-f0-9]{64}$/.test(assinatura||''))return negar(403);
 const agora=Math.floor(Date.now()/1000),emitido=Number(tempo);if(agora-emitido>30||emitido-agora>5)return negar(403);
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),15000);
 try{
  const key=await crypto.subtle.importKey('raw',enc.encode(segredo),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const hash=Uint8Array.from(assinatura.match(/../g),s=>parseInt(s,16));
  const mensagem=enc.encode(['conteudo-worker-v1','pjglrlullnchqazxpvyn','GET',path,tempo,nonce].join('\n'));
  if(!await crypto.subtle.verify('HMAC',key,hash,mensagem))return negar(403);
  const rpc=async(nome,body)=>fetch(BASE+'/rest/v1/rpc/'+nome,{method:'POST',body:JSON.stringify(body),headers:{apikey:chave,Authorization:'Bearer '+chave,'Content-Type':'application/json'},redirect:'manual',cache:'no-store',signal:ac.signal});
  const r=await rpc('origem_worker_consumir_nonce',{valor:nonce,expira:Math.max(agora,emitido)+36});
  if(r.status!==200){try{await r.body?.cancel();}catch{}return negar(503);}
  if(new TextDecoder().decode(await ler(r,16))!=='true')return negar(403);
  const c=await rpc('origem_worker_conteudo_publicado',{});
  if(c.status!==200){try{await c.body?.cancel();}catch{}return negar(503);}
  const bytes=await ler(c,2097152),doc=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(!doc||doc.versao!==1||Object.keys(doc).sort().join('|')!=='albuns|encontros|posts|trofeus|versao')return negar(503);
  for(const t of ['posts','albuns','trofeus','encontros'])if(!Array.isArray(doc[t])||doc[t].length>5000||doc[t].some(p=>!p||p.publicado!==true))return negar(503);
  return new Response(bytes,{headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});
 }catch{return negar(503);}finally{clearTimeout(timer);}
}
