import {autorizar} from '../experiments/emergencia/autorizacao.mjs';
const projeto='https://pjglrlullnchqazxpvyn.supabase.co';
const buckets=new Set(['midia','midia-rascunhos']);
const LIMITE_TOTAL=60*1024*1024,LIMITE_ARQUIVO=10*1024*1024;
function responderMidia(texto,status=200,extra={}){return new Response(texto,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow',...extra}});}
function caminhoSeguro(p){return typeof p==='string'&&p.length>0&&p.length<=1024&&!/[\\\x00-\x1f\x7f?#]/.test(p)&&!p.split('/').some(s=>!s||s==='.'||s==='..');}
function assetRequest(request,caminho){const u=new URL(request.url);u.pathname='/'+caminho.split('/').map(encodeURIComponent).join('/');u.search='';return new Request(u,{method:'GET'});}
async function lerBytesMidia(r,limite){
 if(!r.ok||!r.body)throw Error('Arquivo indisponível');
 const reader=r.body.getReader(),partes=[];let n=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>limite)throw Error('Limite excedido');partes.push(value);}}
 catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
 const bytes=new Uint8Array(n);let pos=0;for(const p of partes){bytes.set(p,pos);pos+=p.length;}return bytes;
}
async function manifestoRepo(request,env){
 const r=await env.ASSETS.fetch(assetRequest(request,'_backup-assets.json'));
 const bytes=await lerBytesMidia(r,512*1024),m=JSON.parse(new TextDecoder().decode(bytes));
 if(m?.versao!==1||!Array.isArray(m.arquivos)||m.arquivos.length>1000)throw Error('Manifesto inválido');
 const nomes=new Set();for(const a of m.arquivos){if(a.bucket!=='repositorio'||!caminhoSeguro(a.caminho)||!a.caminho.startsWith('media/')||!Number.isSafeInteger(a.tamanho)||a.tamanho<0||a.tamanho>LIMITE_ARQUIVO||!/^[a-f0-9]{64}$/.test(a.sha256)||nomes.has(a.caminho))throw Error('Manifesto inválido');nomes.add(a.caminho);}
 return m.arquivos;
}
export async function tratarMidiaBackup(request,env,fetchImpl=fetch){
 const url=new URL(request.url);
 if(!['/api/midia-inventario','/api/midia-arquivo'].includes(url.pathname))return responderMidia('Não encontrado.',404);
 if(request.method!=='POST')return responderMidia('Método não permitido.',405);
 if(request.headers.get('Origin')!==url.origin)return responderMidia('Origem não permitida.',403);
 const key=env.SUPABASE_ANON_KEY;
 if(env.SUPABASE_URL?.replace(/\/$/,'')!==projeto||!key?.startsWith('sb_publishable_'))return responderMidia('Configuração indisponível.',503);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 const requisitar=(u,o)=>fetchImpl(u,{...o,signal:controller.signal,redirect:'manual',cache:'no-store'});
 try{
  const autorizado=await autorizar(request,{supabaseUrl:projeto,chavePublica:key},requisitar);
  if(!autorizado.autorizado)return responderMidia('Acesso negado ou validação indisponível.',403);
  const headers={apikey:key,Authorization:request.headers.get('Authorization')};
  if(url.pathname==='/api/midia-inventario'){
   const arquivos=[...await manifestoRepo(request,env)];
   for(const bucket of buckets){
    const fila=[{prefix:'',nivel:0}];let paginas=0;
    while(fila.length){const {prefix,nivel}=fila.shift();if(nivel>8)throw Error('Profundidade excessiva');
     for(let offset=0;;offset+=100){if(++paginas>50)throw Error('Inventário excessivo');
      const r=await requisitar(projeto+'/storage/v1/object/list/'+bucket,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({prefix,limit:100,offset,sortBy:{column:'name',order:'asc'}})});
      const linhas=JSON.parse(new TextDecoder().decode(await lerBytesMidia(r,512*1024)));
      if(!Array.isArray(linhas)||linhas.length>100)throw Error('Lista inválida');
      for(const a of linhas){if(typeof a.name!=='string'||a.name.includes('/'))throw Error('Nome inválido');const caminho=prefix?prefix+'/'+a.name:a.name;if(!caminhoSeguro(caminho))throw Error('Nome inválido');
       if(a.id===null&&a.metadata===null){fila.push({prefix:caminho,nivel:nivel+1});continue;}
       const tamanho=Number(a.metadata?.size);if(a.metadata?.size==null||!Number.isSafeInteger(tamanho)||tamanho<0||tamanho>LIMITE_ARQUIVO)throw Error('Arquivo excede limite ou sem tamanho');
       arquivos.push({bucket,caminho,tamanho});if(arquivos.length>999)throw Error('Muitos arquivos');
      }
      if(linhas.length<100)break;
     }
    }
   }
   const unicos=new Set(arquivos.map(a=>a.bucket+'/'+a.caminho));if(unicos.size!==arquivos.length||arquivos.reduce((n,a)=>n+a.tamanho,0)>LIMITE_TOTAL)throw Error('Inventário duplicado ou excessivo');
   return responderMidia(JSON.stringify({versao:1,criadoEm:new Date().toISOString(),arquivos,limiteTotal:LIMITE_TOTAL,observacao:'Captura sequencial, não é snapshot atômico dos arquivos; não inclui URLs externas ou objetos não visíveis pelas políticas.'}),200,{'Content-Type':'application/json; charset=utf-8'});
  }
  const bucket=request.headers.get('X-Midia-Bucket');let caminho;try{caminho=decodeURIComponent(request.headers.get('X-Midia-Caminho')||'');}catch{return responderMidia('Caminho inválido.',400);}
  if(!caminhoSeguro(caminho)||(!buckets.has(bucket)&&bucket!=='repositorio'))return responderMidia('Arquivo não permitido.',400);
  let r,esperado;
  if(bucket==='repositorio'){
   esperado=(await manifestoRepo(request,env)).find(a=>a.caminho===caminho);if(!esperado)return responderMidia('Arquivo não permitido.',404);
   r=await env.ASSETS.fetch(assetRequest(request,caminho));
  }else{
   r=await requisitar(projeto+'/storage/v1/object/authenticated/'+bucket+'/'+caminho.split('/').map(encodeURIComponent).join('/'),{headers});
  }
  const bytes=await lerBytesMidia(r,LIMITE_ARQUIVO);
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
  if(esperado&&(esperado.sha256!==hash||esperado.tamanho!==bytes.length))throw Error('Asset alterado');
  return responderMidia(bytes,200,{'Content-Type':'application/octet-stream','X-Conteudo-Sha256':hash});
 }catch{return responderMidia('Não foi possível obter os arquivos completos. Nenhum backup de fotos foi confirmado. Confira permissões, cotas, limites ou arquivos alterados.',503);}
 finally{clearTimeout(timer);}
}
