import type {
  Anime,
  Episode,
  Genre,
  Paginated,
  CommentItem,
  Rating,
  RatingStats,
  AnimeStats,
  ToggleFavoriteResponse,
  CheckFavoriteResponse,
  ToggleLikeResponse,
  ContinueWatchingItem,
  WatchHistoryItem,
  NotificationItem,
  NotificationListResponse,
  ChatMessage,
  CommentRepliesResponse,
  PublicUserProfile,
} from "@/types";

// Re-export da sanção de URL — módulo puro em url.ts; aqui por compat.
export { isValidRemoteUrl, safeImageSrc } from "@/lib/url";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

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

/** Resposta de /stream/source — contrato do backend. */
export interface StreamSource {
  animeSlug: string;
  episodeNumber: number;
  src: string;
  rawVideoUrl: string | null;
  embedUrl: string | null;
  reextracted: boolean;
  thumbnailUrl: string | null;
}

/** Proxy interno do backend: mesmo dominio, sem XFO/CSP bloqueando iframe. */
export function isProxyEmbed(url: string): boolean {
  return url.includes("/embed/proxy?");
}

/**
 * Extrai mensagem de erro do shape `{ message: string | string[] }` do backend.
 * Pura e testável — usado por request + adminUploadVideo.
 */
export function readErrorMessage(
  data: unknown,
  fallback = "Erro desconhecido",
): string {
  if (typeof data === "object" && data !== null && "message" in data) {
    const message = (data as { message: unknown }).message;
    return Array.isArray(message) ? message.join(", ") : String(message);
  }
  return fallback;
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
        throw new ApiError(retry.status, readErrorMessage(retryData, "Sessão expirada."));
      }
      return retryData as T;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(401, "Sessão expirada.");
    }
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, readErrorMessage(data));
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

  changeEmail: (newEmail: string, password: string) =>
    request<{ message: string; token?: string }>("/auth/change-email", {
      method: "POST",
      body: JSON.stringify({ newEmail, password }),
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
      `/episode/latest?limit=${limit}`,
    ),

  // --- Streaming ---
  streamSource: (animeSlug: string, episodeNumber: number) =>
    request<StreamSource>(`/stream/source?anime=${encodeURIComponent(animeSlug)}&episode=${episodeNumber}`),

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
      throw new ApiError(res.status, readErrorMessage(data));
    }

    return data as Episode;
  },

  // --- Comments ---
  listAnimeComments: (animeId: string, page = 1, limit = 50) =>
    request<CommentItem[]>(`/comment/anime/${animeId}?page=${page}&limit=${limit}`),

  listEpisodeComments: (episodeId: string, page = 1, limit = 50) =>
    request<CommentItem[]>(`/comment/episode/${episodeId}?page=${page}&limit=${limit}`),

  createComment: (body: {
    content: string;
    animeId?: string;
    episodeId?: string;
    parentId?: string;
  }) =>
    request<CommentItem>(`/comment`, { method: "POST", body: JSON.stringify(body) }),

  editComment: (id: string, content: string) =>
    request<CommentItem>(`/comment/${id}`, { method: "PATCH", body: JSON.stringify({ content }) }),

  deleteComment: (id: string) =>
    request<CommentItem>(`/comment/${id}`, { method: "DELETE" }),

  toggleCommentLike: (id: string) =>
    request<ToggleLikeResponse>(`/comment/${id}/like`, { method: "POST" }),

  getCommentReplies: (id: string, page = 1, limit = 50) =>
    request<CommentRepliesResponse>(`/comment/${id}/replies?page=${page}&limit=${limit}`),

  // --- Rating ---
  rateAnime: (slug: string, score: number) =>
    request<Rating>(`/rating/${slug}`, { method: "POST", body: JSON.stringify({ score }) }),

  removeRating: (slug: string) =>
    request<{ message: string }>(`/rating/${slug}`, { method: "DELETE" }),

  getUserRating: (slug: string) =>
    request<Rating | null>(`/rating/me/${slug}`),

  getRatingStats: (slug: string) =>
    request<RatingStats>(`/rating/stats/${slug}`),

  toggleFavorite: (slug: string) =>
    request<ToggleFavoriteResponse>(`/favorite/${slug}/toggle`, { method: "POST" }),

  listFavorites: (page = 1, limit = 24) =>
    request<Paginated<Anime>>(`/favorite?page=${page}&limit=${limit}`),

  checkFavorite: (slug: string) =>
    request<CheckFavoriteResponse>(`/favorite/${slug}/check`),

  updateProgress: (slug: string, episodeNumber: number, progress: number, duration?: number, completed?: boolean) =>
    request(`/watch-history/${slug}/${episodeNumber}`, {
      method: "POST",
      body: JSON.stringify({ progress, duration, completed }),
    }),

  getContinueWatching: (limit = 12) =>
    request<ContinueWatchingItem[]>(`/watch-history/continue?limit=${limit}`),

  getWatchHistory: (page = 1, limit = 24) =>
    request<Paginated<WatchHistoryItem>>(`/watch-history?page=${page}&limit=${limit}`),

  incrementViews: (slug: string, episodeNumber: number) =>
    request<{ message: string }>(`/episode/${slug}/${episodeNumber}/views`, { method: "POST" }),

  listNotifications: (page = 1, limit = 20, unread = false) =>
    request<NotificationListResponse>(`/notification?page=${page}&limit=${limit}${unread ? "&unread=true" : ""}`),

  markNotificationRead: (id: string) =>
    request<NotificationItem>(`/notification/${id}/read`, { method: "PATCH" }),

  markAllNotificationsRead: () =>
    request<{ message: string }>(`/notification/read-all`, { method: "PATCH" }),

  getPublicProfile: (userId: string) =>
    request<PublicUserProfile>(`/user/${userId}/profile`),

  updateProfileMeta: (data: { avatar?: string; bio?: string }) =>
    request<User>(`/user/me/profile-meta`, { method: "POST", body: JSON.stringify(data) }),

  getRelatedAnime: (slug: string) =>
    request<Anime[]>(`/anime/${slug}/related`),

  getAnimeStats: (slug: string) =>
    request<AnimeStats>(`/anime/${slug}/stats`),
};
