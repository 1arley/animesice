/**
 * Adaptador de fetch para componentes servidor (RSC).
 * Interface única: path + revalidate -> dados | null.
 * Concentra o fetch + cache + retry + error-swallow que antes vivia em 3 cópias.
 */
const isDev = process.env.NODE_ENV !== "production";
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (isDev ? "http://localhost:3001/api" : "https://api.animesice.app/api");

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function serverFetchJson<T>(
  path: string,
  revalidate = 60,
): Promise<T | null> {
  const url = `${API_URL}${path}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        next: { revalidate },
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        return (await res.json()) as T;
      }

      // 4xx não adianta tentar de novo (exceto 429)
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        console.error(`[serverFetchJson] ${path} -> HTTP ${res.status}`);
        return null;
      }

      // 5xx ou 429: tenta de novo
      console.error(
        `[serverFetchJson] ${path} -> HTTP ${res.status} (attempt ${attempt + 1}/${MAX_RETRIES + 1})`,
      );
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      return null;
    } catch (err) {
      console.error(
        `[serverFetchJson] ${path} -> ${err} (attempt ${attempt + 1}/${MAX_RETRIES + 1})`,
      );
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      return null;
    }
  }

  return null;
}
