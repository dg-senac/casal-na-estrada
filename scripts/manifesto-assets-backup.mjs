import {readdir,readFile,writeFile,lstat} from 'node:fs/promises';
import {join,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';
export async function gerarManifestoAssets(raiz='dist'){
 const arquivos=[];
 async function andar(dir){for(const nome of await readdir(dir)){const path=join(dir,nome),st=await lstat(path);if(st.isSymbolicLink())throw Error('Link simbólico não permitido no backup');if(st.isDirectory())await andar(path);else if(st.isFile()){const bytes=await readFile(path);arquivos.push({bucket:'repositorio',caminho:relative(raiz,path).split(sep).join('/'),tamanho:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}}}
 await andar(join(raiz,'media'));arquivos.sort((a,b)=>a.caminho.localeCompare(b.caminho));
 if(arquivos.length>1000)throw Error('Manifesto excede limite de arquivos');
 await writeFile(join(raiz,'_backup-assets.json'),JSON.stringify({versao:1,arquivos}));return arquivos;
}
