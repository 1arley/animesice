import type {
  Anime,
  Episode,
  Paginated,
  StreamTokenResponse,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? Array.isArray((data as { message: unknown }).message)
          ? ((data as { message: string[] }).message as string[]).join(", ")
          : String((data as { message: unknown }).message)
        : "Erro desconhecido";
    throw new ApiError(res.status, message);
  }

  return data as T;
}

export const api = {
  register: (body: { name: string; email: string; password: string }) =>
    request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  me: () => request<User>("/user/me"),

  refresh: (refreshToken: string) =>
    request<AuthResponse>("/auth/refresh", {
      method: "POST",
      headers: { Authorization: `Bearer ${refreshToken}` },
    }),

  // --- Catálogo (públicos) ---
  listAnimes: (page = 1, limit = 12) =>
    request<Paginated<Anime>>(`/anime?page=${page}&limit=${limit}`),

  getAnime: (slug: string) => request<Anime>(`/anime/${slug}`),

  getEpisodes: (slug: string) =>
    request<Episode[]>(`/anime/${slug}/episodes`),

  getEpisode: (slug: string, number: number) =>
    request<Episode & { anime: Anime }>(`/episode/${slug}/${number}`),

  latestEpisodes: (limit = 12) =>
    request<(Episode & { anime: Anime })[]>(
      `/anime/latest-episodes?limit=${limit}`,
    ),

  // --- Streaming ---
  streamToken: (animeSlug: string, episodeNumber: number) =>
    request<StreamTokenResponse>(
      `/stream/token?anime=${encodeURIComponent(animeSlug)}&episode=${episodeNumber}`,
    ),

  // --- Embed / Scrape (animefire proxy backend) ---
  // Monta a URL do proxy de embed (mesmo dominio backend, sem XFO/CSP).
  // O iframe aponta para este endereco, nao direto para animefire.
  embedProxyUrl: (animefireUrl: string): string =>
    `${API_URL}/embed/proxy?url=${encodeURIComponent(animefireUrl)}`,

  // Scrape do episodio animefire: retorna URLs .mp4 token + iframes.
  embedScrape: (animefireUrl: string) =>
    request<{ videos: string[]; iframes: string[] }>(
      `/embed/scrape?url=${encodeURIComponent(animefireUrl)}`,
    ),

  // --- Admin (protegido ROLE=ADMIN) ---
  adminListAnimes: (page = 1, limit = 50) =>
    request<Paginated<Anime & { _count: { episodes: number } }>>(
      `/admin/animes?page=${page}&limit=${limit}`,
    ),

  adminUpdateEpisode: (
    slug: string,
    number: number,
    dto: Partial<Pick<Episode, "title" | "videoUrl" | "thumbnailUrl" | "duration" | "embedUrl">>,
  ) =>
    request<Episode>(`/admin/episode/${slug}/${number}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    }),

  adminUpdateAnime: (
    slug: string,
    dto: Partial<Pick<Anime, "title" | "synopsis" | "coverImage" | "bannerImage" | "rating" | "status" | "ageRating">>,
  ) =>
    request<Anime>(`/admin/anime/${slug}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    }),

  adminImportAnime: (body: {
    anilistId?: number;
    search?: string;
    audio?: "LEGENDADO" | "DUBLADO";
  }) =>
    request<Anime>("/admin/anime/import", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Upload manual: multipart/form-data não pode usar o helper request()
  // (que força Content-Type application/json e quebra o boundary do browser).
  adminUploadVideo: async (
    slug: string,
    number: number,
    file: File,
  ): Promise<Episode> => {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(
      `${API_URL}/admin/episode/${slug}/${number}/upload`,
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      },
    );

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const message =
        typeof data === "object" && data !== null && "message" in data
          ? Array.isArray((data as { message: unknown }).message)
            ? ((data as { message: string[] }).message as string[]).join(", ")
            : String((data as { message: unknown }).message)
          : "Erro desconhecido";
      throw new ApiError(res.status, message);
    }

    return data as Episode;
  },
};
