/**
 * Ponte de leitura entre o site e o Supabase.
 *
 * O site continua 100% estático: no momento do build (Astro ou GitHub Actions)
 * estas funções leem as tabelas públicas pelo REST do Supabase usando a chave
 * "publishable" (a mesma que qualquer visitante veria no navegador), montam as
 * páginas e o resultado vira HTML. Nada de banco rodando no servidor do site.
 *
 * Variáveis de ambiente necessárias no build:
 *   PUBLIC_SUPABASE_URL       https://xxxx.supabase.co
 *   PUBLIC_SUPABASE_ANON_KEY  chave publishable (pode ir no repositório/CI)
 *
 * Para desenvolver sem internet, defina DADOS_FIXTURE=scripts/dados-exemplo.json
 * e o build lê um arquivo local em vez do banco.
 */
import { readFile } from 'node:fs/promises';

const endereco = (
  import.meta.env.PUBLIC_SUPABASE_URL ??
  process.env.PUBLIC_SUPABASE_URL ??
  ''
).replace(/\/+$/, '');

const chave =
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? process.env.PUBLIC_SUPABASE_ANON_KEY ?? '';

const fixture = process.env.DADOS_FIXTURE || '';

/** O build só consegue montar o site com banco configurado. */
export function exigirBanco(): void {
  if (fixture) return;
  if (!endereco || !chave) {
    throw new Error(
      'Faltam PUBLIC_SUPABASE_URL e/ou PUBLIC_SUPABASE_ANON_KEY no ambiente do build.\n' +
        'Sem elas o site sairia vazio — melhor quebrar o build do que publicar uma vitrine sem conteúdo.'
    );
  }
}

type Linha = Record<string, unknown>;

let arquivo: Promise<Record<string, Linha[]>> | null = null;

async function lerFixture(): Promise<Record<string, Linha[]>> {
  if (!arquivo) {
    arquivo = readFile(fixture, 'utf-8').then(
      (texto) => JSON.parse(texto) as Record<string, Linha[]>
    );
  }
  return arquivo;
}

/**
 * Consulta uma tabela: `consultar('trofeus?select=*&publicado=eq.true')`.
 * No modo fixture, devolve o que estiver no JSON local com o nome da tabela.
 */
export async function consultar<T = Linha>(caminho: string): Promise<T[]> {
  const tabela = caminho.split('?')[0];

  if (fixture) {
    const dados = await lerFixture();
    return (dados[tabela] ?? []) as T[];
  }

  exigirBanco();

  const resposta = await fetch(`${endereco}/rest/v1/${caminho}`, {
    headers: {
      apikey: chave,
      Authorization: `Bearer ${chave}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(20000),
  }).catch((erro: unknown) => {
    throw new Error(
      `Não consegui falar com o Supabase (${tabela}): ${(erro as Error).message}`
    );
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => '');
    throw new Error(
      `Supabase respondeu ${resposta.status} ao ler "${tabela}". ${detalhe.slice(0, 300)}`
    );
  }

  return (await resposta.json()) as T[];
}
