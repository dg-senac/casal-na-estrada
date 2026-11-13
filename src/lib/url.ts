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
  // Escape de HTML não bloqueia javascript: em href. Validar o protocolo
  // antes de reutilizar URLs vindas do conteúdo cadastrado.
  const limpo = caminho.trim().replace(/[\u0000-\u001f\u007f-\u009f]/g, '');
  if (limpo.startsWith('//') || limpo.includes('\\')) return '#';
  const esquema = limpo.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (esquema && !['http', 'https', 'mailto', 'tel'].includes(esquema)) return '#';
  caminho = limpo;
  if (!caminho.startsWith('/')) return caminho;
  return `${base}${caminho}`;
};

export const basePath = base;
