/**
 * Markdown → HTML.
 *
 * O texto das publicações e dos troféus fica no Supabase em Markdown (o mesmo
 * formato dos antigos arquivos .md). Aqui ele é convertido no build.
 */
import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: true });

export function markdown(texto?: string | null): string {
  if (!texto || texto.trim() === '') return '';
  return marked.parse(texto, { async: false }) as string;
}
