import type { BlogPost, Paginated } from "@/types";

/**
 * Adaptador de fetch para componentes servidor (RSC).
 * Interface única: path + revalidate -> dados | null.
 *
 * Usa cache: 'no-store' por padrão para dados dinâmicos. Quando a rota exporta
 * `revalidate = N`, o Next.js respeita esse valor automaticamente — mas apenas
 * se o fetch não sobrescreve `cache`. Por isso removemos `cache: 'no-store'`
 *硬-coded: agora respeita o `revalidate` da rota.
 *
 * Para rotas que precisam de dados sempre frescos (ex: searchParams), use
 * `export const dynamic = 'force-dynamic'` ou passe `{ cache: 'no-store' }`.
 */
const isDev = process.env.NODE_ENV !== "production";

/**
 * Normaliza a base da API: o backend usa o global prefix `api` (NestJS
 * setGlobalPrefix). Se o NEXT_PUBLIC_API_URL vier sem o sufixo (ex.:
 * "https://api.animesice.app"), a gente acrescenta — um env errado não pode
 * derrubar todas as chamadas (404 em tudo). Espelha src/lib/api.ts.
 */
function normalizeApiUrl(raw: string | undefined): string {
  const base = (raw ?? "").trim().replace(/\/$/, "");
  if (!base) {
    return isDev
      ? "http://localhost:3001/api"
      : "https://api.animesice.app/api";
  }
  return base.endsWith("/api") ? base : `${base}/api`;
}

export const API_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

/**
 * Status transitórios (rate-limit/sobrecarga) merecem retry antes de virar
 * "não encontrado" — senão um 429 ocasional transforma uma página válida em
 * soft-404 (notFound → 200 + noindex por causa do streaming do Next).
 */
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 2;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function serverFetchJson<T>(
  path: string,
  init?: { cache?: RequestCache; next?: { revalidate?: number; tags?: string[] } },
): Promise<T | null> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${API_URL}${path}`, {
        cache: init?.cache ?? "no-store",
        next: init?.next,
      });
      if (!res.ok) {
        if (RETRYABLE_STATUS.has(res.status) && attempt < MAX_RETRIES) {
          await sleep(300 * (attempt + 1));
          continue;
        }
        console.error(`[serverFetchJson] ${path} -> HTTP ${res.status}`);
        return null;
      }
      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
      // Falha de rede pode ser transitória; respeita o mesmo backoff.
      if (attempt < MAX_RETRIES) {
        await sleep(300 * (attempt + 1));
        continue;
      }
    }
  }

  console.error(`[serverFetchJson] ${path} -> ${lastError}`);
  return null;
}

export async function serverListBlogPosts(
  page = 1,
  limit = 100,
): Promise<Paginated<BlogPost> | null> {
  return serverFetchJson<Paginated<BlogPost>>(
    `/blog-posts?published=true&page=${page}&limit=${limit}`,
    { cache: "force-cache", next: { revalidate: 900, tags: ["blog-posts"] } },
  );
}

export async function serverGetBlogPost(slug: string): Promise<BlogPost | null> {
  return serverFetchJson<BlogPost>(
    `/blog-posts/slug/${encodeURIComponent(slug)}`,
    { cache: "force-cache", next: { revalidate: 900, tags: ["blog-posts", `blog-post:${slug}`] } },
  );
}

/**
 * Busca stream source de um episódio (async = 202 + jobId, sync = src direto).
 * Usado no SSR pre-fetch da watch page — se o vídeo já existir no cache do
 * backend, retorna o src; se precisar de extração, retorna o jobId para o
 * WatchClient fazer polling/SSE no client.
 */
export async function serverStreamSourceAsync(
  animeSlug: string,
  episodeNumber: number,
  refresh = false,
): Promise<
  | { src: string; embedUrl?: string; thumbnailUrl?: string }
  | { jobId: string; status: string; message?: string }
  | null
> {
  return serverFetchJson<
    | { src: string; embedUrl?: string; thumbnailUrl?: string }
    | { jobId: string; status: string; message?: string }
  >(
    `/stream/source/async?anime=${encodeURIComponent(animeSlug)}&episode=${episodeNumber}${refresh ? "&refresh=1" : ""}`,
    { cache: "no-store" },
  );
}
