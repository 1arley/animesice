import type {
  Anime,
  Episode,
  Genre,
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
    credentials: "include",
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

  logout: () =>
    request<{ message: string }>("/auth/logout", {
      method: "POST",
    }),

  changeEmail: (newEmail: string) =>
    request<{ message: string; token?: string }>("/auth/change-email", {
      method: "POST",
      body: JSON.stringify({ newEmail }),
    }),

  confirmEmail: (token: string) =>
    request<{ message: string }>("/auth/confirm-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  updateProfile: (name: string) =>
    request<User>("/auth/update-profile", {
      method: "POST",
      body: JSON.stringify({ name }),
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

  // Source público (sem JWT) — resolve videoUrl + re-extrai da fonte quando
  // necessário e devolve `src` apontando p/ o proxy de mídia do backend
  // (/embed/media) com anti-hotlinking + IP-vínculo resolvidos server-side.
  // O <video> usa este `src` direto; não há token nem login no client.
  streamSource: (animeSlug: string, episodeNumber: number) =>
    request<{
      animeSlug: string;
      episodeNumber: number;
      src: string;
      rawVideoUrl: string | null;
      embedUrl: string | null;
      reextracted: boolean;
      thumbnailUrl: string | null;
    }>(`/stream/source?anime=${encodeURIComponent(animeSlug)}&episode=${episodeNumber}`),

  // --- Embed / Scrape (animefire proxy backend) ---
  // Monta a URL do proxy de embed (mesmo dominio backend, sem XFO/CSP).
  // Genérico: funciona p/ qualquer URL http/https (animefire, animesonlinecc, ...).
  embedProxyUrl: (targetUrl: string): string =>
    `${API_URL}/embed/proxy?url=${encodeURIComponent(targetUrl)}`,

  // Monta a URL do proxy de mídia (mesmo domínio backend, injeta Referer/UA
  // anti-hotlinking + resolve IP-vínculo do token). Usado p/ .mp4/.m3u8 de
  // CDNs externas (lightspeedst.net, googlevideo.com/videoplayback, ...).
  mediaProxyUrl: (targetUrl: string): string =>
    `${API_URL}/embed/media?url=${encodeURIComponent(targetUrl)}`,

  // Scrape de episódio: extrai URLs .mp4/.m3u8 + iframes.
  // source opcional força um adapter (animefire/animesonlinecc/meusanimes);
  // sem source, o backend auto-detecta pelo host.
  embedScrape: (targetUrl: string, source?: string) =>
    request<{ videos: string[]; iframes: string[] }>(
      `/embed/scrape?url=${encodeURIComponent(targetUrl)}` +
        (source ? `&source=${encodeURIComponent(source)}` : ""),
    ),

  // --- Admin (protegido ROLE=ADMIN) ---
  adminListAnimes: (page = 1, limit = 50) =>
    request<Paginated<Anime & { _count: { episodes: number } }>>(
      `/admin/animes?page=${page}&limit=${limit}`,
    ),

  adminCreateAnime: (dto: {
    slug: string;
    title: string;
    synopsis?: string;
    coverImage?: string;
    bannerImage?: string;
    rating?: number;
    status?: string;
    audio?: "LEGENDADO" | "DUBLADO";
    ageRating?: string;
    genreSlugs?: string[];
  }) =>
    request<Anime>("/admin/anime", {
      method: "POST",
      body: JSON.stringify(dto),
    }),

  adminDeleteAnime: (slug: string) =>
    request<{ message: string }>(`/admin/anime/${slug}`, {
      method: "DELETE",
    }),

  adminCreateEpisode: (
    slug: string,
    dto: {
      number: number;
      title?: string;
      videoUrl?: string;
      embedUrl?: string;
      thumbnailUrl?: string;
      duration?: string;
    },
  ) =>
    request<Episode>(`/admin/episode/${slug}`, {
      method: "POST",
      body: JSON.stringify(dto),
    }),

  adminDeleteEpisode: (slug: string, number: number) =>
    request<{ message: string }>(`/admin/episode/${slug}/${number}`, {
      method: "DELETE",
    }),

  adminListGenres: () => request<Genre[]>(`/genre`),

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
