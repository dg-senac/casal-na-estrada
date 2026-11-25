/** ZIP sem compressão. Montado no navegador; nenhuma imagem vira texto no D1. */
const zipEncoder=new TextEncoder();
const zipCRC=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let n=0xffffffff;for(const b of bytes)n=zipCRC[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
export function montarZipFotos(arquivos){
 if(!Array.isArray(arquivos)||arquivos.length>1000)throw Error('Quantidade de arquivos excedida.');
 const partes=[],diretorio=[],nomes=new Set();let posicao=0,total=0;
 for(const {nome,bytes} of arquivos){
  if(typeof nome!=='string'||!nome||nome.startsWith('/')||nome.includes('\\')||nome.split('/').some(p=>!p||p==='.'||p==='..')||/[\x00-\x1f\x7f]/.test(nome)||nomes.has(nome))throw Error('Nome de arquivo inválido ou duplicado.');
  if(!(bytes instanceof Uint8Array))throw Error('Arquivo inválido.');
  total+=bytes.length;if(total>64*1024*1024)throw Error('ZIP excede o limite de 64 MiB.');
  nomes.add(nome);const utf8=zipEncoder.encode(nome);if(utf8.length>1024)throw Error('Nome excessivo.');
  const crc=crc32(bytes),local=new Uint8Array(30+utf8.length),v=new DataView(local.buffer);
  v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);
  v.setUint32(14,crc,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,utf8.length,true);local.set(utf8,30);
  const central=new Uint8Array(46+utf8.length),c=new DataView(central.buffer);
  c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,33,true);
  c.setUint32(16,crc,true);c.setUint32(20,bytes.length,true);c.setUint32(24,bytes.length,true);c.setUint16(28,utf8.length,true);c.setUint32(42,posicao,true);central.set(utf8,46);
  partes.push(local,bytes);diretorio.push(central);posicao+=local.length+bytes.length;
 }
 const tamanhoCentral=diretorio.reduce((n,b)=>n+b.length,0),fim=new Uint8Array(22),f=new DataView(fim.buffer);
 f.setUint32(0,0x06054b50,true);f.setUint16(8,arquivos.length,true);f.setUint16(10,arquivos.length,true);f.setUint32(12,tamanhoCentral,true);f.setUint32(16,posicao,true);
 return new Blob([...partes,...diretorio,fim],{type:'application/zip'});
}

/** Confere nosso formato ZIP sem extrair arquivos no disco e sem enviar à rede. */
export async function inspecionarZipFotos(arquivo,comBytes=false){
 if(!arquivo||arquivo.size>66*1024*1024)throw Error('ZIP acima do limite.');
 const bytes=new Uint8Array(await arquivo.arrayBuffer()),view=new DataView(bytes.buffer);
 const u16=p=>view.getUint16(p,true),u32=p=>view.getUint32(p,true);
 if(bytes.length<22)throw Error('ZIP truncado.');
 const fim=bytes.length-22;
 if(u32(fim)!==0x06054b50||u16(fim+4)!==0||u16(fim+6)!==0||u16(fim+20)!==0)throw Error('Formato ZIP não suportado.');
 const quantidade=u16(fim+10),inicioCentral=u32(fim+16),tamanhoCentral=u32(fim+12);
 if(quantidade>1000||quantidade!==u16(fim+8)||inicioCentral+tamanhoCentral!==fim)throw Error('Diretório ZIP inválido.');
 const itens=new Map();let local=0,central=inicioCentral;
 const decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:false});
 for(let i=0;i<quantidade;i++){
  if(central+46>fim||u32(central)!==0x02014b50||u16(central+8)!==0x800||u16(central+10)!==0||u16(central+30)!==0||u16(central+32)!==0||u16(central+34)!==0||u32(central+42)!==local)throw Error('Entrada ZIP inválida.');
  const n=u16(central+28),tamanho=u32(central+24),crc=u32(central+16);
  if(central+46+n>fim||u32(central+20)!==tamanho||local+30>inicioCentral||u32(local)!==0x04034b50||u16(local+6)!==0x800||u16(local+8)!==0||u16(local+28)!==0||u16(local+26)!==n||u32(local+14)!==crc||u32(local+18)!==tamanho||u32(local+22)!==tamanho)throw Error('Cabeçalho ZIP divergente.');
  const nome=decoder.decode(bytes.subarray(central+46,central+46+n));
  if(!nome||nome.startsWith('/')||nome.includes('\\')||/[\x00-\x1f\x7f]/.test(nome)||nome.split('/').some(p=>!p||p==='.'||p==='..')||itens.has(nome))throw Error('Nome ZIP inválido.');
  if(decoder.decode(bytes.subarray(local+30,local+30+n))!==nome)throw Error('Nome divergente.');
  const comeco=local+30+n,termino=comeco+tamanho;
  if(termino>inicioCentral)throw Error('Arquivo truncado.');
  const conteudo=bytes.subarray(comeco,termino);if(crc32(conteudo)!==crc)throw Error('CRC divergente.');
  itens.set(nome,conteudo);local=termino;central+=46+n;
 }
 if(central!==fim||local!==inicioCentral||!itens.has('manifesto.json'))throw Error('Manifesto ou diretório ausente.');
 const manifesto=JSON.parse(decoder.decode(itens.get('manifesto.json')));
 if(manifesto.versao!==1||manifesto.tipo!=='arquivos-midia-sem-cadastros'||!Array.isArray(manifesto.arquivos)||manifesto.arquivos.length!==itens.size-1)throw Error('Manifesto incompatível.');
 const nomes=new Set();let total=0;
 for(const a of manifesto.arquivos){
  if(!['repositorio','midia','midia-rascunhos'].includes(a.bucket)||typeof a.caminho!=='string'||a.nome!==a.bucket+'/'+a.caminho||nomes.has(a.nome)||!Number.isSafeInteger(a.tamanho)||a.tamanho<0||a.tamanho>10*1024*1024||!/^[a-f0-9]{64}$/.test(a.sha256))throw Error('Referência inválida no manifesto.');
  const conteudo=itens.get(a.nome);if(!conteudo||conteudo.length!==a.tamanho)throw Error('Arquivo ausente ou tamanho divergente.');
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',conteudo))].map(n=>n.toString(16).padStart(2,'0')).join('');
  if(hash!==a.sha256)throw Error('SHA-256 divergente.');
  total+=conteudo.length;nomes.add(a.nome);
 }
 if(total!==manifesto.totalBytes||total>60*1024*1024)throw Error('Total divergente.');
 return {arquivos:manifesto.arquivos.length,totalBytes:total,manifesto,...(comBytes?{itens}:{})};
}

export async function verificarZipFotos(arquivo){
 const {arquivos,totalBytes}=await inspecionarZipFotos(arquivo);return {arquivos,totalBytes};
}
