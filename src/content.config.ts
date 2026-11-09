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
// Cada arquivo é uma peça da prateleira: troféu de pódio, placa de participação,
// lembrança comprada na estrada ou coisa feita em casa (o LEGO, por exemplo).
const trofeus = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/trofeus' }),
  schema: z.object({
    evento: z.string(),
    // Ano do encontro. Deixe de fora quando ninguém lembrar — a peça vai para "Sem data".
    ano: z.number().int().min(1990).max(2100).optional(),
    // Data exata do encontro, se souberem (ex.: 2026-11-08). Serve para ordenar.
    data: z.coerce.date().optional(),
    categoria: z.string().default('Participação'),
    // Cidade ou região ("Iati — PE", "Pernambuco"). Opcional.
    cidade: z.string().optional(),
    colocacao: z.string().default('Participação'),
    // 'ouro' para 1º lugar, 'prata' 2º, 'bronze' 3º, 'laco' participação
    nivel: z.enum(['ouro', 'prata', 'bronze', 'laco']).default('laco'),
    // trofeu = peça de pódio · placa = placa/acrílico de participação
    // lembranca = souvenir da viagem · construcao = feito em casa
    tipo: z.enum(['trofeu', 'placa', 'lembranca', 'construcao']).default('trofeu'),
    edicao: z.string().optional(),
    // A história curta de como a peça foi conquistada (2 a 4 frases).
    historia: z.string(),
    // Frase de efeito que aparece em destaque na página da peça.
    nota: z.string().optional(),
    // Foto principal. As demais fotos da mesma peça vão em "fotos:".
    foto: z.string().optional(),
    fotoAlt: z.string().optional(),
    fotos: z.array(midia).default([]),
    destaque: z.boolean().default(false),
    rascunho: z.boolean().default(false),
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
