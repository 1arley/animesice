/**
 * Adaptador de fetch para componentes servidor (RSC).
 * Interface única: path + revalidate -> dados | null.
 *
 * Usa cache: 'no-store' para nunca cachear respostas na Vercel Data Cache.
 * O backend já controla caching via seus próprios headers HTTP.
 * Isso evita que erros transitórios (403, 500) fiquem cached indefinidamente.
 */
const isDev = process.env.NODE_ENV !== "production";
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (isDev ? "http://localhost:3001/api" : "https://api.animesice.app/api");

export async function serverFetchJson<T>(
  path: string,
): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      cache: "no-store",
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

