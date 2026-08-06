/**
 * Adaptador de fetch para componentes servidor (RSC).
 * Interface única: path + revalidate -> dados | null.
 * Concentra o fetch + cache + error-swallow que antes vivia em 3 cópias.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

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
