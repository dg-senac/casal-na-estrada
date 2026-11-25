import {readdir,readFile,writeFile,lstat} from 'node:fs/promises';
import {join,extname} from 'node:path';
const BASE='https://pjglrlullnchqazxpvyn.supabase.co';
const SITE='https://casal-na-estrada-site-teste.douglasmarista02.workers.dev';
const trocas=[
 [BASE+'/functions/v1/foto-publicada/',SITE+'/midia-protegida/midia-rascunhos/'],
 [BASE+'/storage/v1/object/public/midia/',SITE+'/midia-protegida/midia/'],
];
/** Só artefatos do build Cloudflare; jamais altera cadastros, originais ou Pages. */
export function reescreverMidiaTexto(texto){
 for(const [origem,destino] of trocas){
  texto=texto.replaceAll(origem,destino);
  // JSON com barras escapadas: preservar sua sintaxe.
  texto=texto.replaceAll(origem.replaceAll('/','\\/'),destino.replaceAll('/','\\/'));
 }
 return texto;
}
export async function reescreverMidiaCloudflare(raiz='dist'){
 let modificados=0;
 async function andar(dir){for(const nome of await readdir(dir)){
  const path=join(dir,nome),s=await lstat(path);if(s.isSymbolicLink())throw Error('Symlink não permitido no build');
  if(s.isDirectory())await andar(path);
  else if(s.isFile()&&['.html','.json','.xml','.js','.css'].includes(extname(nome))){
   const antes=await readFile(path,'utf8'),depois=reescreverMidiaTexto(antes);if(antes!==depois){await writeFile(path,depois);modificados++;}
  }
 }}
 await andar(raiz);return {modificados};
}
