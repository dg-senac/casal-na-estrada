import {URL_CONTEUDO_BUILD} from '../src/lib/conteudo-build.js';
/** URL não secreta; a assinatura ocorre apenas no runtime do Worker. */
export function configurarCanalBuild(env,{fixture=false}={}){
 return {...env,CONTEUDO_BUILD_URL:fixture?'':URL_CONTEUDO_BUILD};
}
