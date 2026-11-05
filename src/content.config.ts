import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Todo o conteúdo do site é versionado em arquivos .md dentro de src/content.
 * Para publicar uma lembrança nova, basta criar um arquivo — nada de painel,
 * banco de dados ou login para esquecer a senha.
 */

const midia = z.object({
  src: z.string(),
  legenda: z.string().optional(),
  vertical: z.boolean().optional(),
});

const video = z.object({
  titulo: z.string(),
  youtube: z.string().optional(),
  arquivo: z.string().optional(),
  credito: z.string().optional(),
});

// ---------- Diário: mini-notícias, crônicas e posts de viagem ----------
const diario = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/diario' }),
  schema: ({ image }) =>
    z.object({
      titulo: z.string(),
      data: z.coerce.date(),
      local: z.string(),
      uf: z.string().length(2).optional(),
      resumo: z.string().max(260),
      capa: z.string(),
      capaAlt: z.string(),
      tipo: z.enum(['crônica', 'notícia', 'relato', 'aviso']).default('relato'),
      distancia: z.string().optional(),
      tags: z.array(z.string()).default([]),
      destaque: z.boolean().default(false),
      rascunho: z.boolean().default(false),
    }),
});

// ---------- Galeria: álbuns de fotos e vídeos ----------
const albuns = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/albuns' }),
  schema: z.object({
    titulo: z.string(),
    data: z.coerce.date(),
    local: z.string(),
    capa: z.string(),
    capaAlt: z.string(),
    descricao: z.string(),
    fotos: z.array(midia).default([]),
    videos: z.array(video).default([]),
    ordem: z.number().default(99),
    rascunho: z.boolean().default(false),
  }),
});

// ---------- Sala de troféus ----------
const trofeus = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/trofeus' }),
  schema: z.object({
    evento: z.string(),
    ano: z.number(),
    categoria: z.string(),
    cidade: z.string(),
    colocacao: z.string(),
    // 'ouro' para 1º lugar, 'prata' 2º, 'bronze' 3º, 'laco' participação
    nivel: z.enum(['ouro', 'prata', 'bronze', 'laco']).default('laco'),
    nota: z.string().optional(),
    foto: z.string().optional(),
  }),
});

// ---------- Agenda de encontros ----------
const encontros = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/encontros' }),
  schema: z.object({
    nome: z.string(),
    inicio: z.coerce.date(),
    fim: z.coerce.date().optional(),
    cidade: z.string(),
    uf: z.string().length(2),
    local: z.string().optional(),
    confirmado: z.boolean().default(true),
    observacao: z.string().optional(),
  }),
});

export const collections = { diario, albuns, trofeus, encontros };
