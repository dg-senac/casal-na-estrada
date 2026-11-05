// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * Site 100% estático: as recordações (fotos, vídeos, notícias, troféus) vivem em
 * arquivos Markdown versionados em src/content — sem banco de dados, sem painel.
 *
 * Variáveis de ambiente usadas no build (opcionais):
 *   SITE_BASE  caminho onde o site fica publicado. Padrão: '/'.
 *              No GitHub Pages sem domínio próprio é '/nome-do-repositorio/'.
 *   SITE_URL   endereço completo do site (usado no sitemap e nos links absolutos).
 */
const base = process.env.SITE_BASE || '/';
const site = process.env.SITE_URL || 'https://casalnaestrada.com.br';

export default defineConfig({
  site,
  base,
  output: 'static',
  integrations: [sitemap()],
  build: { inlineStylesheets: 'auto' },
  // Em produção o site é estático; estas opções só afetam o servidor de
  // desenvolvimento (para funcionar atrás de um proxy/preview).
  server: { host: true, allowedHosts: true },
  vite: { server: { allowedHosts: true } },
});
