import type {
  Anime,
  Episode,
  Genre,
  Paginated,
  CommentItem,
  Rating,
  RatingStats,
  UserRating,
  AnimeStats,
  ToggleFavoriteResponse,
  CheckFavoriteResponse,
  ToggleLikeResponse,
  ContinueWatchingItem,
  WatchHistoryItem,
  NotificationItem,
  NotificationListResponse,
  CommentRepliesResponse,
  PublicUserProfile,
  PublicAnimeListItem,
  PublicFavoriteItem,
  PublicActivityEvent,
  CalendarResponse,
  GenreAnimesResponse,
  AnimeFilters,
  UserAnimeListItem,
  CheckListResponse,
  NotificationPreference,
  AnimeRequestItem,
  SiteFeedbackItem,
  ReportListResponse,
  ReportItem,
  ModerationActionItem,
  WatchStatus,
  PrivacySettings,
  SocialPost,
  PostCommentItem,
  FeedItem,
  UserSearchResult,
  FeedbackStatus,
} from "@/types";

// Re-export da sanção de URL — módulo puro em url.ts; aqui por compat.
export { isValidRemoteUrl, safeImageSrc } from "@/lib/url";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Normaliza a base da API: o backend usa o global prefix `api` (NestJS
 * setGlobalPrefix). Se o NEXT_PUBLIC_API_URL vier sem o sufixo (ex.:
 * "https://api.animesice.app"), a gente acrescenta — um env errado não pode
 * derrubar todas as chamadas (404 em tudo).
 */
function normalizeApiUrl(raw: string | undefined): string {
  const base = (raw ?? "").trim().replace(/\/$/, "");
  if (!base) {
    return isDev
      ? "http://localhost:3001/api"
      : "https://api.animesice.app/api";
  }
  // Aceita origens com path (ex.: /api, /v1/api) — só evita duplicar o sufixo.
  return base.endsWith("/api") ? base : `${base}/api`;
}

export const API_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

export interface User {
  id: string;
  email: string;
  name: string;
  userName: string | null;
  avatar: string | null;
  bio: string | null;
  myAnimeList: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
}

export interface RegisterResponse {
  message: string;
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

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

async function ensureRefresh(): Promise<void> {
  if (isRefreshing && refreshPromise) return refreshPromise;
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new ApiError(res.status, "Sessão expirada.");
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  // Só métodos idempotentes entram no retry de 429 (rate-limit no Cloudflare/
  // backend compartilha IP — um pico no SSR pode estourar o throttler).
  const method = (options.method ?? "GET").toUpperCase();
  const retryable = method === "GET" || method === "HEAD" || method === "OPTIONS";
  const maxAttempts = retryable ? 3 : 1;

  const exec = () =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });

  let res = await exec();
  for (let attempt = 1; res.status === 429 && attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, 400 * attempt));
    res = await exec();
  }

  if (res.status === 401 && !path.startsWith("/auth/")) {
    const hasSession =
      typeof document !== "undefined" &&
      document.cookie.split(";").some((c) => c.trim().startsWith("role="));
    if (!hasSession) {
      throw new ApiError(401, "Sessão expirada.");
    }
    try {
      await ensureRefresh();
      res = await exec();
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
  register: (body: {
    name: string;
    email: string;
    password: string;
    userName?: string;
    turnstileToken?: string;
  }) =>
    request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string; turnstileToken?: string }) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  verifyEmail: (email: string, code: string) =>
    request<{ message: string }>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),

  resendVerification: (email: string) =>
    request<{ message: string }>("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
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

  updateProfile: (body: { name?: string; userName?: string }) =>
    request<User>("/auth/update-profile", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // --- Catálogo (públicos) ---
  listAnimes: (page = 1, limit = 12, search?: string) =>
    request<Paginated<Anime>>(
      `/anime?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`,
    ),

  filterAnimes: (filters: AnimeFilters) => {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));
    if (filters.search) params.set("search", filters.search);
    if (filters.genres) params.set("genres", filters.genres);
    if (filters.status) params.set("status", filters.status);
    if (filters.audio) params.set("audio", filters.audio);
    if (filters.format) params.set("format", filters.format);
    if (filters.year) params.set("year", String(filters.year));
    if (filters.season) params.set("season", filters.season);
    if (filters.ageRating) params.set("ageRating", filters.ageRating);
    if (filters.minScore) params.set("minScore", String(filters.minScore));
    if (filters.maxScore) params.set("maxScore", String(filters.maxScore));
    if (filters.sort) params.set("sort", filters.sort);
    return request<Paginated<Anime>>(`/anime?${params.toString()}`);
  },

  getAnime: (slug: string) => request<Anime>(`/anime/${slug}`),

  getRandomAnime: () => request<Anime | null>(`/anime/random`),

  getTopAnimes: (limit = 20) =>
    request<Anime[]>(`/anime/top?limit=${limit}`),

  getTrendingAnimes: (limit = 20, sinceDays = 7) =>
    request<Anime[]>(`/anime/trending?limit=${limit}&sinceDays=${sinceDays}`),

  getRecentlyAddedAnimes: (limit = 20) =>
    request<Anime[]>(`/anime/recently-added?limit=${limit}`),

  getCalendar: (season?: string, year?: number) =>
    request<CalendarResponse>(
      `/anime/calendar${season ? `?season=${season}` : ""}${year ? `${season ? "&" : "?"}year=${year}` : ""}`,
    ),

  getGenreAnimes: (slug: string, page = 1, limit = 24) =>
    request<GenreAnimesResponse>(`/genre/${slug}/animes?page=${page}&limit=${limit}`),

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
  adminListAnimes: (page = 1, limit = 50, search?: string) =>
    request<Paginated<Anime & { _count: { episodes: number } }>>(
      `/admin/animes?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`,
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

  getContinueWatching: (limit = 12, signal?: AbortSignal) =>
    request<ContinueWatchingItem[]>(`/watch-history/continue?limit=${limit}`, signal ? { signal } : undefined),

  getWatchHistory: (page = 1, limit = 24) =>
    request<Paginated<WatchHistoryItem>>(`/watch-history?page=${page}&limit=${limit}`),

  deleteWatchHistory: (slug: string, episodeNumber: number) =>
    request<{ message: string }>(`/watch-history/${slug}/${episodeNumber}`, { method: "DELETE" }),

  incrementViews: (slug: string, episodeNumber: number) =>
    request<{ message: string }>(`/episode/${slug}/${episodeNumber}/views`, { method: "POST" }),

  listNotifications: (page = 1, limit = 20, unread = false, signal?: AbortSignal) =>
    request<NotificationListResponse>(`/notification?page=${page}&limit=${limit}${unread ? "&unread=true" : ""}`, signal ? { signal } : undefined),

  markNotificationRead: (id: string) =>
    request<NotificationItem>(`/notification/${id}/read`, { method: "PATCH" }),

  markAllNotificationsRead: () =>
    request<{ message: string }>(`/notification/read-all`, { method: "PATCH" }),

  // Aceita userName OU id — o backend resolve o identificador.
  getPublicProfile: (identifier: string) =>
    request<PublicUserProfile>(`/users/${identifier}`),

  // --- Public user endpoints (profile details, comments, ratings, favorites) ---
  // Rotas públicas ficam em /users/:id/* no backend (UsersController);
  // /user/* é o controller autenticado (me, avatar, profile-meta).
  getUserComments: (userId: string, page = 1, limit = 20) =>
    request<Paginated<CommentItem>>(`/users/${userId}/comments?page=${page}&limit=${limit}`),

  getUserRatings: (userId: string, page = 1, limit = 20) =>
    request<Paginated<UserRating>>(`/users/${userId}/ratings?page=${page}&limit=${limit}`),

  getUserFavorites: (userId: string, page = 1, limit = 24) =>
    request<Paginated<PublicFavoriteItem>>(
      `/users/${userId}/favorites?page=${page}&limit=${limit}`,
    ),

  getUserAnimeList: (identifier: string, page = 1, limit = 24, status?: string) =>
    request<Paginated<PublicAnimeListItem>>(
      `/users/${identifier}/anime-list?page=${page}&limit=${limit}${status ? `&status=${status}` : ""}`,
    ),

  getUserActivity: (identifier: string, page = 1, limit = 20) =>
    request<Paginated<PublicActivityEvent>>(
      `/users/${identifier}/activity?page=${page}&limit=${limit}`,
    ),

  updateProfileMeta: (data: { avatar?: string; bio?: string; userName?: string; myAnimeList?: string }) =>
    request<User>(`/user/me/profile-meta`, { method: "POST", body: JSON.stringify(data) }),

  uploadAvatar: async (file: File): Promise<User> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_URL}/user/me/avatar`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new ApiError(res.status, readErrorMessage(data));
    }

    return data as User;
  },

  deleteAvatar: () =>
    request<User>(`/user/me/avatar`, { method: "DELETE" }),

  getRelatedAnime: (slug: string) =>
    request<Anime[]>(`/anime/${slug}/related`),

  getAnimeStats: (slug: string) =>
    request<AnimeStats>(`/anime/${slug}/stats`),

  // --- User Anime List (Watchlist) ---
  upsertAnimeList: (slug: string, body: {
    status?: 'PLANNING' | 'WATCHING' | 'COMPLETED' | 'ON_HOLD' | 'DROPPED';
    episodesWatched?: number;
    score?: number;
    notes?: string;
    private?: boolean;
  }) =>
    request(`/user-anime-list/${slug}`, { method: "POST", body: JSON.stringify(body) }),

  removeAnimeList: (slug: string) =>
    request<{ message: string }>(`/user-anime-list/${slug}`, { method: "DELETE" }),

  listAnimeList: (page = 1, limit = 24, status?: string) =>
    request<Paginated<UserAnimeListItem>>(`/user-anime-list?page=${page}&limit=${limit}${status ? `&status=${status}` : ""}`),

  checkAnimeList: (slug: string) =>
    request<{ inList: boolean; status?: string }>(`/user-anime-list/${slug}/check`),

  // --- Notification preferences ---
  getNotificationPreferences: () =>
    request<NotificationPreference[]>(`/notification/preferences`),

  updateNotificationPreference: (body: {
    typeId: string;
    channel: string;
    enabled: boolean;
  }) =>
    request<NotificationPreference>(`/notification/preferences`, { method: "PATCH", body: JSON.stringify(body) }),

  // --- Privacy settings ---
  getPrivacySettings: () =>
    request<PrivacySettings>(`/settings/privacy`),

  updatePrivacySettings: (body: Partial<Omit<PrivacySettings, "privateAnimeLists">>) =>
    request<PrivacySettings>(`/settings/privacy`, { method: "PATCH", body: JSON.stringify(body) }),

  // --- Recommendations ---
  getRecommendations: (limit = 20) =>
    request<Anime[]>(`/recommendation/me?limit=${limit}`),

  getSimilar: (slug: string, limit = 12) =>
    request<Anime[]>(`/recommendation/similar/${slug}?limit=${limit}`),

  getBecauseYouWatched: (limit = 12) =>
    request<Anime[]>(`/recommendation/because-you-watched?limit=${limit}`),

  // --- Community: Anime requests ---
  listAnimeRequests: (page = 1, limit = 20, status?: string) =>
    request<Paginated<AnimeRequestItem>>(
      `/anime-requests?page=${page}&limit=${limit}${status ? `&status=${status}` : ""}`,
    ),

  createAnimeRequest: (body: { title: string; alternativeTitle?: string; notes?: string }) =>
    request<AnimeRequestItem>(`/anime-requests`, { method: "POST", body: JSON.stringify(body) }),

  voteAnimeRequest: (id: string) =>
    request<{ voted: boolean; voteCount: number }>(`/anime-requests/${id}/vote`, { method: "POST" }),

  // --- Community: Site feedback ---
  listFeedback: (page = 1, limit = 20, type?: string, status?: string) =>
    request<Paginated<SiteFeedbackItem>>(
      `/feedback?page=${page}&limit=${limit}${type ? `&type=${type}` : ""}${status ? `&status=${status}` : ""}`,
    ),

  createFeedback: (body: { type: 'SUGGESTION' | 'BUG' | 'REQUEST'; title: string; description: string }) =>
    request(`/feedback`, { method: "POST", body: JSON.stringify(body) }),

  upvoteFeedback: (id: string) =>
    request(`/feedback/${id}/upvote`, { method: "POST" }),

  // --- Social: posts do feed ---
  createPost: (body: { content: string; animeId?: string }) =>
    request<SocialPost>("/social/posts", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getFeed: (page = 1, limit = 20, scope: "global" | "following" = "global") =>
    request<Paginated<FeedItem>>(
      `/social/feed?page=${page}&limit=${limit}&scope=${scope}`,
    ),

  getPost: (id: string) => request<SocialPost>(`/social/posts/${id}`),

  deletePost: (id: string) =>
    request<{ message: string }>(`/social/posts/${id}`, {
      method: "DELETE",
    }),

  togglePostLike: (id: string) =>
    request<{ liked: boolean }>(`/social/posts/${id}/like`, {
      method: "POST",
    }),

  getPostComments: (id: string, page = 1, limit = 20) =>
    request<Paginated<PostCommentItem>>(
      `/social/posts/${id}/comments?page=${page}&limit=${limit}`,
    ),

  createPostComment: (postId: string, content: string) =>
    request<PostCommentItem>(`/social/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  sharePost: (id: string) =>
    request<{ shared: boolean; shareCount: number }>(
      `/social/posts/${id}/share`,
      { method: "POST" },
    ),

  // --- Social: follow ---
  toggleFollow: (userId: string) =>
    request<{ following: boolean }>(`/social/follow/${userId}`, {
      method: "POST",
    }),

  checkFollow: (userId: string) =>
    request<{ following: boolean }>(`/social/follow/check/${userId}`),

  getFollowing: (page = 1, limit = 20) =>
    request<Paginated<UserSearchResult>>(
      `/social/following?page=${page}&limit=${limit}`,
    ),

  /** Lista pública de seguidores de um usuário (perfil público). */
  getFollowers: (userId: string, page = 1, limit = 20) =>
    request<Paginated<UserSearchResult>>(
      `/social/followers/${userId}?page=${page}&limit=${limit}`,
    ),

  /** Lista pública de quem um usuário segue (perfil público). */
  getFollowingForUser: (userId: string, page = 1, limit = 20) =>
    request<Paginated<UserSearchResult>>(
      `/social/following/${userId}?page=${page}&limit=${limit}`,
    ),

  // --- Social: diretório de usuários ---
  searchUsers: (params: {
    search?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.sort) qs.set("sort", params.sort);
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    return request<Paginated<UserSearchResult>>(`/users?${qs.toString()}`);
  },

  // --- Moderation ---
  createReport: (body: {
    targetType: 'COMMENT' | 'ROOM_MESSAGE' | 'USER' | 'ANIME';
    targetId: string;
    reason: 'SPAM' | 'HARASSMENT' | 'NSFW' | 'SPOILER' | 'ILLEGAL' | 'OTHER';
    notes?: string;
  }) =>
    request(`/report`, { method: "POST", body: JSON.stringify(body) }),

  // --- Admin moderation ---
  adminListReports: (page = 1, limit = 20, status?: string) =>
    request<ReportListResponse>(`/admin/reports?page=${page}&limit=${limit}${status ? `&status=${status}` : ""}`),

  adminResolveReport: (id: string, moderationNote?: string) =>
    request<ReportItem>(`/admin/reports/${id}/resolve`, { method: "PATCH", body: JSON.stringify({ moderationNote }) }),

  adminDismissReport: (id: string, moderationNote?: string) =>
    request<ReportItem>(`/admin/reports/${id}/dismiss`, { method: "PATCH", body: JSON.stringify({ moderationNote }) }),

  adminModerateUser: (userId: string, body: {
    actionType: 'WARN' | 'MUTE' | 'BAN' | 'DELETE_CONTENT';
    reason?: string;
    hours?: number;
  }) =>
    request<ModerationActionItem>(`/admin/users/${userId}/moderate`, { method: "POST", body: JSON.stringify(body) }),

  adminDeleteComment: (id: string) =>
    request<{ message: string }>(`/admin/comments/${id}`, { method: "DELETE" }),

  // --- Admin: dashboard ---
  adminGetDashboardStats: () =>
    request<AdminDashboardStats>(`/settings/admin/dashboard`),

  // --- Admin: user management ---
  adminListUsers: (page = 1, limit = 20, search?: string) =>
    request<Paginated<AdminUserListItem>>(
      `/settings/admin/users?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`,
    ),

  adminGetUser: (id: string) =>
    request<AdminUserDetail>(`/settings/admin/users/${id}`),

  adminDeleteUser: (id: string) =>
    request<{ message: string }>(`/settings/admin/users/${id}`, {
      method: "DELETE",
    }),

  adminUpdateUserRole: (id: string, role: "USER" | "ADMIN" | "SUPERADMIN") =>
    request<AdminUserListItem>(`/settings/admin/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  // --- Admin: posts moderation ---
  adminListPosts: (page = 1, limit = 20, status?: string) =>
    request<Paginated<AdminPostItem>>(
      `/admin/posts?page=${page}&limit=${limit}${status ? `&status=${status}` : ""}`,
    ),

  adminHidePost: (id: string) =>
    request<{ message: string }>(`/admin/posts/${id}/hide`, {
      method: "PATCH",
    }),

  adminDeletePost: (id: string) =>
    request<{ message: string }>(`/admin/posts/${id}`, {
      method: "DELETE",
    }),

  // --- Admin: anime requests ---
  adminUpdateAnimeRequest: (id: string, status: FeedbackStatus, adminNote?: string) =>
    request<AnimeRequestItem>(`/admin/anime-requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, adminNote }),
    }),

  // --- Admin: site feedback ---
  adminUpdateFeedback: (id: string, status: FeedbackStatus, adminNote?: string) =>
    request<SiteFeedbackItem>(`/admin/feedback/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, adminNote }),
    }),

  // --- Admin: site settings ---
  adminGetSiteSettings: () =>
    request<SiteSettings>(`/settings/site`),

  adminUpdateSiteSettings: (body: Partial<SiteSettings>) =>
    request<SiteSettings>(`/settings/site`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  // --- Rooms (watch party) ---
  createRoom: (body: { animeSlug: string; episodeNumber: number; maxParticipants?: number }) =>
    request<RoomInfo>(`/room`, { method: "POST", body: JSON.stringify(body) }),

  getRoom: (slug: string) =>
    request<RoomInfo>(`/room/${slug}`),

  getRoomMessages: (slug: string) =>
    request<RoomMessageItem[]>(`/room/${slug}/messages`),

  deleteRoom: (slug: string) =>
    request<{ message: string }>(`/room/${slug}`, { method: "DELETE" }),

  // --- Admin: audit (SUPERADMIN) ---
  adminGetSensitiveAccess: (resourceType = "User", days = 7, signal?: AbortSignal) =>
    request<AuditLogItem[]>(
      `/admin/audit/sensitive-access?resourceType=${encodeURIComponent(resourceType)}&days=${days}`,
      signal ? { signal } : undefined,
    ),

  // --- Admin: watchtower (SUPERADMIN) ---
  watchtowerStatus: (signal?: AbortSignal) =>
    request<WatchtowerStatus>(
      `/admin/watchtower/status`,
      signal ? { signal } : undefined,
    ),

  watchtowerCheck: (slug: string) =>
    request<{ anime: string; enqueued: boolean }>(
      `/admin/watchtower/check/${encodeURIComponent(slug)}`,
      { method: "POST" },
    ),

  watchtowerRetryJob: (id: string) =>
    request<{ ok: boolean }>(`/admin/watchtower/jobs/${id}/retry`, {
      method: "POST",
    }),

  watchtowerToggleSource: (id: string, disabled: boolean) =>
    request<{ sourceId: string; disabled: boolean }>(
      `/admin/watchtower/sources/${id}/toggle`,
      { method: "POST", body: JSON.stringify({ disabled }) },
    ),

  watchtowerDiscover: () =>
    request<{ created: number }>(`/admin/watchtower/discover`, {
      method: "POST",
    }),

  watchtowerRepair: () =>
    request<{ enqueued: number }>(`/admin/watchtower/repair`, {
      method: "POST",
    }),

  watchtowerScanAll: (force = false) =>
    request<{ enqueued: number; skipped: number }>(
      `/admin/watchtower/scan-all`,
      { method: "POST", body: JSON.stringify({ force }) },
    ),

  watchtowerBackfillAnilist: () =>
    request<{ matched: number }>(`/admin/watchtower/backfill-anilist`, {
      method: "POST",
    }),

  watchtowerSyncSchedules: () =>
    request<{ synced: number }>(`/admin/watchtower/sync-schedules`, {
      method: "POST",
    }),

  // --- Admin: create genre ---
  adminCreateGenre: (body: { slug: string; name: string }) =>
    request<Genre>(`/admin/genre`, { method: "POST", body: JSON.stringify(body) }),
};

export interface RoomInfo {
  id: string;
  slug: string;
  animeSlug: string;
  episodeNumber: number;
  maxParticipants: number;
  expiresAt: string;
  createdAt: string;
}

export interface RoomMessageItem {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    userName: string | null;
    avatar: string | null;
  };
}

export interface AdminUserListItem {
  id: string;
  email: string;
  name: string | null;
  userName: string | null;
  role: "USER" | "ADMIN" | "SUPERADMIN";
  isVerified: boolean;
  suspendedUntil: string | null;
  suspendedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserDetail extends AdminUserListItem {
  avatar: string | null;
  bio: string | null;
  _count: {
    comments: number;
    ratings: number;
    favorites: number;
    watchHistories: number;
    reportsFiled: number;
  };
}

export interface AdminDashboardStats {
  totals: {
    users: number;
    animes: number;
    episodes: number;
    comments: number;
    posts: number;
    ratings: number;
    favorites: number;
    watchHistories: number;
  };
  moderation: {
    pendingReports: number;
    suspendedUsers: number;
    pendingFeedbacks: number;
    pendingAnimeRequests: number;
  };
  weekly: {
    newUsers: number;
    newPosts: number;
    newComments: number;
  };
  admins: number;
}

export interface AdminPostItem {
  id: string;
  content: string;
  status: "VISIBLE" | "HIDDEN_BY_MOD";
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    userName: string | null;
    avatar: string | null;
  };
  anime: {
    id: string;
    slug: string;
    title: string;
  } | null;
  _count: {
    likes: number;
    comments: number;
  };
}

export interface SiteSettings {
  siteName: string;
  siteDescription: string;
  registrationOpen: boolean;
  maintenanceMode: boolean;
}

export interface AuditLogItem {
  id: string;
  action: string;
  resourceType: string;
  admin: {
    email: string;
    role: string;
  };
  ipAddress: string;
  createdAt: string;
}

export interface WatchtowerJobStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  dead: number;
}

export interface WatchtowerSourceHealth {
  id: string;
  sourceId: string;
  disabled: boolean;
  consecutiveFailures: number;
  lastCheckedAt: string | null;
  lastError: string | null;
}

export interface WatchtowerStatus {
  jobs: WatchtowerJobStats;
  sources: WatchtowerSourceHealth[];
}
