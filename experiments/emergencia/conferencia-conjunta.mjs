import {abrirPacote,TABELAS} from './pacote-editorial.mjs';
import {inspecionarZipFotos} from './zip-fotos.mjs';
const origem='https://pjglrlullnchqazxpvyn.supabase.co';
const camposMidia=new Set(['capa_url','capa_mini','foto_url','foto_mini','url']);
function identificar(valor){
 const prefixos=[
  [origem+'/functions/v1/foto-publicada/','midia-rascunhos/'],
  ...['midia','midia-rascunhos'].flatMap(b=>['public','authenticated','sign'].map(tipo=>[origem+'/storage/v1/object/'+tipo+'/'+b+'/',b+'/'])),
  ['/casal-na-estrada/media/','repositorio/media/'],['/media/','repositorio/media/'],['media/','repositorio/media/'],
  ['https://dg-senac.github.io/casal-na-estrada/media/','repositorio/media/'],
  ['https://casal-na-estrada.douglasmarista02.workers.dev/media/','repositorio/media/'],
  ['https://casal-na-estrada-site-teste.douglasmarista02.workers.dev/media/','repositorio/media/'],
 ];
 for(const [prefixo,base] of prefixos)if(valor.startsWith(prefixo)){
  try{
   const sufixo=valor.slice(prefixo.length).split(/[?#]/)[0];
   const partes=sufixo.split('/').map(p=>decodeURIComponent(p));
   if(partes.some(p=>!p||p==='.'||p==='..'||/[\\/\x00-\x1f\x7f]/.test(p)))return {estado:'nao_classificada'};
   return {nome:base+partes.join('/')};
  }catch{return {estado:'nao_classificada'};}
 }
 return {estado:/^https?:\/\//i.test(valor)?'externa':'nao_classificada'};
}
/** Não usa rede/SQL. Cruza somente referências, não renderiza HTML dos cadastros. */
export async function conferirConjunto(texto,zip){
 const carga=await abrirPacote(texto),midia=await inspecionarZipFotos(zip);
 const nomes=new Set(midia.manifesto.arquivos.map(a=>a.nome)),usados=new Set();
 const referencias=[];
 function visitar(v,tabela,id,caminho,profundidade=0){
  if(profundidade>40)throw Error('Profundidade excedida');
  if(Array.isArray(v)){v.forEach((x,i)=>visitar(x,tabela,id,[...caminho,String(i)],profundidade+1));return;}
  if(v&&typeof v==='object'){for(const [k,x] of Object.entries(v))visitar(x,tabela,id,[...caminho,k],profundidade+1);return;}
  if(typeof v!=='string'||!v.trim())return;
  const chave=caminho.at(-1);
  // Campos explícitos e strings inteiras com prefixos de mídia conhecidos.
  const ref=identificar(v);
  if(!camposMidia.has(chave)&&!ref.nome)return;
  if(tabela==='album_videos'&&chave==='url'&&!ref.nome){referencias.push({tabela,id,campo:caminho.join('.'),estado:'video_externo'});return;}
  const estado=ref.nome?(nomes.has(ref.nome)?'presente':'ausente'):ref.estado;
  if(estado==='presente')usados.add(ref.nome);
  referencias.push({tabela,id,campo:caminho.join('.'),estado,...(ref.nome?{arquivo:ref.nome}:{})});
 }
 for(const tabela of TABELAS)for(const linha of carga.dados[tabela])visitar(linha,tabela,linha.id,[]);
 const contagens=Object.fromEntries(['presente','ausente','externa','nao_classificada','video_externo'].map(e=>[e,referencias.filter(r=>r.estado===e).length]));
 return {tipo:'conferencia-referencias-nao-restauracao',snapshotCriadoEm:carga.criadoEm,midiaCriadaEm:midia.manifesto.criadoEm??null,
  registros:carga.contagens,arquivosZip:midia.arquivos,bytesZip:midia.totalBytes,contagens,referencias,
  arquivosSemReferencia:midia.arquivos-usados.size,
  avisos:['Não é restauração nem réplica do esquema/RLS/Auth de produção.',
   'Pacote e ZIP não são uma captura atômica; datas diferentes exigem revisão.',
   'Textos HTML/Markdown não são interpretados: imagens embutidas nesses textos podem não ser contadas.',
   'Referências externas e não classificadas precisam de revisão; nenhum endereço externo foi consultado.',
   'Arquivos sem referência podem incluir rascunhos, objetos antigos e miniaturas; não os exclua.',
   'Nenhum arquivo foi enviado e nenhuma alteração foi feita no site.']};
}
