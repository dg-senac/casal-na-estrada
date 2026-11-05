/**
 * Resolve caminhos internos respeitando o "base path" do deploy.
 *
 * No ar em domínio próprio o base é `/`; no GitHub Pages (repositório de projeto)
 * o site vive em `/casal-na-estrada/`. Sempre que você escrever um link ou o
 * caminho de uma imagem começando com `/`, envolva com `url()`:
 *
 *   <a href={url('/diario')}>
 *   <img src={url(foto.src)} />
 *
 * Links externos (http...) e âncoras passam intactos.
 */
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export const url = (caminho: string): string => {
  if (!caminho.startsWith('/')) return caminho;
  return `${base}${caminho}`;
};

export const basePath = base;
