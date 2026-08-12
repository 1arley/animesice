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
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (isDev ? "http://localhost:3001/api" : "https://api.animesice.app/api");

export async function serverFetchJson<T>(
  path: string,
  init?: { cache?: RequestCache; next?: { revalidate?: number; tags?: string[] } },
): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      cache: init?.cache ?? "no-store",
      next: init?.next,
    });
    if (!res.ok) {
      console.error(`[serverFetchJson] ${path} -> HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[serverFetchJson] ${path} -> ${err}`);
    return null;
  }
}

