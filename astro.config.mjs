// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Site 100% estático: as recordações (fotos, vídeos, notícias, troféus) vivem em
// arquivos Markdown versionados em src/content — sem banco de dados, sem painel.
export default defineConfig({
  site: 'https://casalnaestrada.com.br',
  output: 'static',
  integrations: [sitemap()],
  build: { inlineStylesheets: 'auto' },
  // Em produção o site é estático; estas opções só afetam o servidor de
  // desenvolvimento (para funcionar atrás de um proxy/preview).
  server: { host: true, allowedHosts: true },
  vite: { server: { allowedHosts: true } },
});
