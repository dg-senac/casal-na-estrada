// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * Site estático montado a partir do Supabase no momento do build.
 *
 * As recordações (diário, galeria, troféus, encontros) ficam no banco e são
 * editadas pelo painel /admin. O build lê tudo pela API REST, gera as páginas
 * e o resultado vai para o GitHub Pages — nada de servidor rodando.
 *
 * Variáveis de ambiente usadas no build:
 *   PUBLIC_SUPABASE_URL       endereço do projeto Supabase (obrigatório)
 *   PUBLIC_SUPABASE_ANON_KEY  chave publicável do projeto (obrigatório)
 *   SITE_BASE                 caminho onde o site fica publicado. Padrão: '/'.
 *                             No GitHub Pages sem domínio próprio: '/nome-do-repositorio/'.
 *   SITE_URL                  endereço completo do site (sitemap e links absolutos).
 *   DADOS_FIXTURE             opcional: arquivo JSON local com dados de exemplo,
 *                             para desenvolver sem acesso ao banco.
 */
const base = process.env.SITE_BASE || '/';
const site = process.env.SITE_URL || 'https://casalnaestrada.com.br';

export default defineConfig({
  site,
  base,
  output: 'static',
  // O painel não entra no sitemap: ele não aparece em busca nenhuma.
  integrations: [sitemap({ filter: (pagina) => !pagina.includes('/admin') })],
  build: { inlineStylesheets: 'auto' },
  // Em produção o site é estático; estas opções só afetam o servidor de
  // desenvolvimento (para funcionar atrás de um proxy/preview).
  server: { host: true, allowedHosts: true },
  vite: { server: { allowedHosts: true } },
});
