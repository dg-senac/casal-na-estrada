/**
 * Markdown → HTML.
 *
 * O texto das publicações e dos troféus fica no Supabase em Markdown (o mesmo
 * formato dos antigos arquivos .md). Aqui ele é convertido no build.
 */
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { tagsEditoriais } from './politica-html.js';

marked.setOptions({ gfm: true, breaks: true });

export function markdown(texto?: string | null): string {
  if (!texto || texto.trim() === '') return '';
  const html = marked.parse(texto, { async: false }) as string;
  return sanitizeHtml(html, {
    allowedTags: tagsEditoriais,
    allowedAttributes: {
      a: ['href', 'title'], img: ['src', 'alt', 'title'], ol: ['start'],
      th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    allowProtocolRelative: false,
  });
}
