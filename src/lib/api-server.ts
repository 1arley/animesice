/**
 * Adaptador de fetch para componentes servidor (RSC).
 * Interface única: path + revalidate -> dados | null.
 * Concentra o fetch + cache + error-swallow que antes vivia em 3 cópias.
 */
const isDev = process.env.NODE_ENV !== "production";
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (isDev ? "http://localhost:3001/api" : "https://api.animesice.app/api");

export async function serverFetchJson<T>(
  path: string,
  revalidate = 60,
): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
