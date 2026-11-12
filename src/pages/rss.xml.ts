/**
 * Feed RSS do diário.
 *
 * Quem usa leitor de notícias acompanha as publicações sem abrir o site — e
 * sites de viagem costumam ser lidos assim. O XML é montado à mão para não
 * precisar de dependência nova no projeto.
 */
import type { APIRoute } from 'astro';
import { carregarPosts, postsNoAr } from '../lib/dados';
import { markdown } from '../lib/markdown';
import { site } from '../data/site';

const escapar = (texto: string) =>
  texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export const GET: APIRoute = async ({ site: endereco }) => {
  const base = (endereco ?? new URL('https://casalnaestrada.com.br')).href.replace(/\/$/, '');
  const posts = postsNoAr(await carregarPosts()).slice(0, 30);

  const itens = posts
    .map((post) => {
      const link = `${base}/diario/${post.id}/`;
      return `    <item>
      <title>${escapar(post.data.titulo)}</title>
      <link>${escapar(link)}</link>
      <guid isPermaLink="true">${escapar(link)}</guid>
      <pubDate>${new Date(post.data.data).toUTCString()}</pubDate>
      <category>${escapar(post.data.tipo)}</category>
      <description>${escapar(post.data.resumo)}</description>
      <content:encoded><![CDATA[${markdown(post.body)}]]></content:encoded>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapar(site.nome)} — Diário</title>
    <link>${escapar(base)}</link>
    <description>${escapar(site.descricao)}</description>
    <language>pt-BR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapar(`${base}/rss.xml`)}" rel="self" type="application/rss+xml" />
${itens}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800',
    },
  });
};
