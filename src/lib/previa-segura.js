import DOMPurify from 'dompurify';
import { tagsEditoriais, atributosEditoriais } from './politica-html.js';

/** A prévia também precisa ser segura: o editor está com sessão administrativa. */
export function sanitizarPrevia(html, purificador = DOMPurify) {
  const corpo = purificador.sanitize(html, {
    RETURN_DOM: true,
    ALLOWED_TAGS: tagsEditoriais,
    ALLOWED_ATTR: atributosEditoriais,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    // O DOMPurify remove scripts, eventos e protocolos executáveis.
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+\.\-]+(?:[^a-z+\.\-:]|$))/i,
  });
  // DOMPurify permite algumas imagens data: por padrão. A política editorial
  // é mais restrita: somente HTTP(S) e caminhos relativos para imagens.
  for (const el of corpo.querySelectorAll('[href], [src]')) {
    for (const attr of ['href', 'src']) {
      const valor = el.getAttribute(attr);
      if (valor === null) continue;
      const limpo = valor.replace(/[\u0000-\u0020\u007f-\u009f]/g, '');
      const esquema = limpo.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
      const permitidos = attr === 'src' ? ['http', 'https'] : ['http', 'https', 'mailto', 'tel'];
      if (limpo.startsWith('//') || (esquema && !permitidos.includes(esquema))) el.removeAttribute(attr);
    }
  }
  return corpo.innerHTML;
}
