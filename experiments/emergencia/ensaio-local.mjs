import {abrirPacote,TABELAS} from './pacote-editorial.mjs';
import {inspecionarZipFotos} from './zip-fotos.mjs';
/** Reconstrução em memória, não importação do esquema real. Sem rede ou escrita. */
export async function reconstruirAcervo(texto,zip){
 const carga=await abrirPacote(texto),midia=await inspecionarZipFotos(zip,true);
 const registros=TABELAS.flatMap(tabela=>carga.dados[tabela].map(registro=>({tabela,registro:structuredClone(registro)})));
 const arquivos=midia.manifesto.arquivos.map(a=>({...a,bytes:midia.itens.get(a.nome)}));
 return {registros,arquivos,contagens:carga.contagens};
}
export function tipoImagemSeguro(bytes){
 if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'image/png';
 if(bytes.length>=12&&String.fromCharCode(...bytes.subarray(0,4))==='RIFF'&&String.fromCharCode(...bytes.subarray(8,12))==='WEBP')return 'image/webp';
 return null; // SVG/HTML/GIF e formatos desconhecidos nunca são renderizados.
}
