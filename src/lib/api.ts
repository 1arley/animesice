import type {
  Anime,
  Episode,
  Genre,
  Paginated,
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

/**
 * Allowlist de schemes/hosts seguros para URLs renderizadas no client.
 * Bloqueia `data:`, `javascript:`, `file:` — vetores XSS via <img>/<poster>.
 */
const ALLOWED_IMAGE_HOSTS = new Set<string | null>([
  null,
]);

export function isValidRemoteUrl(raw: string | null | undefined): raw is string {
  if (!raw) return false;
  let val = raw.trim();
  if (!val) return false;
  if (/^javascript:/i.test(val) || /^data:/i.test(val) || /^file:/i.test(val)) {
    return false;
  }
  try {
    const u = new URL(val);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Normaliza URL de imagem: devolve a string só se for http(s) válida. */
export function safeImageSrc(raw: string | null | undefined): string | undefined {
  return isValidRemoteUrl(raw) ? (raw as string) : undefined;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && !path.startsWith("/auth/")) {
    try {
      await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      const retry = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
        credentials: "include",
      });
      const retryData = await retry.json().catch(() => null);
      if (!retry.ok) {
        throw new ApiError(
          retry.status,
          typeof retryData === "object" && retryData !== null && "message" in retryData
            ? String((retryData as { message: unknown }).message)
            : "Sessão expirada.",
        );
      }
      return retryData as T;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(401, "Sessão expirada.");
    }
  }

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

  forgotPassword: (email: string) =>
    request<{ message: string; token?: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    }),

  updateProfile: (name: string) =>
    request<User>("/auth/update-profile", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  // --- Catálogo (públicos) ---
  listAnimes: (page = 1, limit = 12, search?: string) =>
    request<Paginated<Anime>>(
      `/anime?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`,
    ),

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
  embedProxyUrl: (targetUrl: string): string =>
    `${API_URL}/embed/proxy?url=${encodeURIComponent(targetUrl)}`,

  mediaProxyUrl: (targetUrl: string): string =>
    `${API_URL}/embed/media?url=${encodeURIComponent(targetUrl)}`,

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

  adminUpdateAnime: (
    slug: string,
    dto: Partial<Pick<Anime, "title" | "synopsis" | "coverImage" | "bannerImage" | "rating" | "status" | "ageRating">>,
  ) =>
    request<Anime>(`/admin/anime/${slug}`, {
      method: "PATCH",
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

  adminImportAnime: (body: {
    anilistId?: number;
    search?: string;
    audio?: "LEGENDADO" | "DUBLADO";
  }) =>
    request<Anime>("/admin/anime/import", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  adminUploadVideo: async (
    slug: string,
    number: number,
    file: File,
  ): Promise<Episode> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(
      `${API_URL}/admin/episode/${slug}/${number}/upload`,
      {
        method: "POST",
        credentials: "include",
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
