// Animesice - Tipos alinhados com o Prisma (backend animesice-back/schema.prisma)

export type AnimeFormat = 'TV' | 'MOVIE' | 'OVA' | 'ONA' | 'SPECIAL' | 'MUSIC';
export type AnimeSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';
export type SortMode = 'recentlyAdded' | 'rating' | 'views' | 'year' | 'title';

export interface AnimeSchedule {
  id: string;
  animeId: string;
  dayOfWeek: number;
  time: string | null;
}

export interface Genre {
  id: string;
  slug: string;
  name: string;
  _count?: { animes: number };
}

export interface Episode {
  id: string;
  number: number;
  title: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  embedUrl: string | null;
  duration: string | null;
  views: number;
  dateModified: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Anime {
  id: string;
  slug: string;
  title: string;
  synopsis: string | null;
  coverImage: string | null;
  bannerImage: string | null;
  rating: number | null;
  ageRating: string | null;
  status: string;
  audio: 'LEGENDADO' | 'DUBLADO';
  format?: AnimeFormat | null;
  year?: number | null;
  season?: AnimeSeason | null;
  studios?: string[];
  themes?: string[];
  alternativeTitles?: string[];
  japaneseTitle?: string | null;
  source?: string | null;
  releaseDate?: string | null;
  endDate?: string | null;
  episodeCount?: number | null;
  published?: boolean;
  genres?: Genre[];
  episodes?: Episode[];
  animeSchedules?: AnimeSchedule[];
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface Rating {
  userId: string;
  animeId: string;
  score: number;
  createdAt: string;
  updatedAt: string;
}

export interface RatingStats {
  average: number | null;
  count: number;
  min: number | null;
  max: number | null;
}

/** Avaliação de um usuário em perfil público (com o anime pai).
 *  Rating usa chave composta (userId + animeId) — não tem id nem review. */
export interface UserRating {
  score: number;
  createdAt: string;
  updatedAt: string;
  anime: {
    id: string;
    slug: string;
    title: string;
    coverImage: string | null;
  };
}

export interface AnimeStats {
  favorites: number;
  ratingAverage: number | null;
  ratingCount: number;
  ratingMin: number | null;
  ratingMax: number | null;
}

export interface ToggleFavoriteResponse {
  favorited: boolean;
  message: string;
}

export interface CheckFavoriteResponse {
  favorited: boolean;
}

export interface ToggleLikeResponse {
  liked: boolean;
}

export interface ContinueWatchingItem {
  episodeId: string;
  progress: number;
  duration: number | null;
  watchedAt: string;
  completed: boolean;
  episode: {
    id: string;
    number: number;
    title: string | null;
    thumbnailUrl: string | null;
    duration: string | null;
  };
  anime: Anime;
}

export interface WatchHistoryItem {
  episodeId: string;
  progress: number;
  completed: boolean;
  watchedAt: string;
  episode: {
    id: string;
    number: number;
    title: string | null;
  };
  anime: {
    id: string;
    slug: string;
    title: string;
    coverImage: string | null;
  };
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  data: NotificationItem[];
  unreadCount: number;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CommentItem {
  id: string;
  content: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    userName: string | null;
    avatar: string | null;
  };
  animeId: string | null;
  episodeId: string | null;
  parentId: string | null;
  edited: boolean;
  createdAt: string;
  updatedAt: string;
  replies?: CommentItem[];
  anime?: { slug: string; title: string } | null;
  _count?: {
    likes: number;
    replies: number;
  };
}

export interface CommentRepliesResponse {
  data: CommentItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PublicUserProfile {
  id: string;
  name: string | null;
  userName: string | null;
  avatar: string | null;
  bio: string | null;
  myAnimeList: string | null;
  createdAt: string;
  _count: {
    comments: number;
    ratings: number;
    favorites: number;
    watchHistories: number;
  };
}

/** Item de favorito público (registro do favorito + anime pai). */
export interface PublicFavoriteItem {
  createdAt: string;
  anime: {
    id: string;
    slug: string;
    title: string;
    coverImage: string | null;
    year: number | null;
    format: AnimeFormat | null;
  };
}

/** Item da biblioteca (anime list) pública de um usuário. */
export interface PublicAnimeListItem {
  userId: string;
  animeId: string;
  status: WatchStatus;
  episodesWatched: number;
  score: number | null;
  rewatchCount: number;
  private: boolean;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  anime: {
    id: string;
    slug: string;
    title: string;
    coverImage: string | null;
    year: number | null;
    format: AnimeFormat | null;
    genres?: Genre[];
    /** Total de episódios do anime — progresso real do usuário (ep. assistidos / total). */
    episodeCount?: number | null;
  };
}

/** Anime pai compacto dentro de um evento de atividade. */
export interface ActivityAnime {
  slug: string;
  title: string;
  coverImage: string | null;
}

/**
 * Evento do feed público de atividade de um usuário (GET /users/:id/activity).
 * União discriminada por `type` — cada forma carrega só os dados do evento.
 */
export type PublicActivityEvent =
  | {
      type: "watch";
      episodeNumber: number;
      anime: ActivityAnime;
      createdAt: string;
    }
  | {
      type: "rating";
      score: number;
      anime: ActivityAnime;
      createdAt: string;
    }
  | {
      type: "favorite";
      anime: ActivityAnime;
      createdAt: string;
    }
  | {
      type: "comment";
      id: string;
      content: string;
      edited: boolean;
      likeCount: number;
      anime: { slug: string; title: string } | null;
      createdAt: string;
    };

/** Episódio populado com o anime pai — usar em listas de "últimos episódios". */
export interface EpisodeWithAnime extends Episode {
  anime: Anime;
}

/** Resposta do calendário semanal. */
export interface CalendarResponse {
  byDay: Array<{
    day: number;
    label: string;
    animes: Anime[];
  }>;
  unscheduled: Anime[];
}

/** Resposta de animes por gênero. */
export interface GenreAnimesResponse {
  genre: { id: string; name: string; slug: string };
  data: Anime[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/** Filtros de busca avançada. */
export interface AnimeFilters {
  page?: number;
  limit?: number;
  search?: string;
  genres?: string;
  status?: string;
  audio?: string;
  format?: string;
  year?: number;
  season?: string;
  ageRating?: string;
  minScore?: number;
  maxScore?: number;
  sort?: SortMode;
}

/** Watchlist item (UserAnimeList). */
export type WatchStatus = 'PLANNING' | 'WATCHING' | 'COMPLETED' | 'ON_HOLD' | 'DROPPED';

export interface UserAnimeListItem {
  userId: string;
  animeId: string;
  status: WatchStatus;
  episodesWatched: number;
  score: number | null;
  notes: string | null;
  rewatchCount: number;
  private: boolean;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  anime: Anime;
}

export interface CheckListResponse {
  inList: boolean;
  status?: WatchStatus;
}

/** Notification preferences. */
export type NotificationType = 'NEW_EPISODE' | 'COMMENT_REPLY' | 'COMMENT_LIKE' | 'MODERATION_ACTION' | 'SYSTEM';
export type NotificationChannel = 'IN_APP' | 'EMAIL';

export interface NotificationPreference {
  id: string;
  userId: string;
  typeId: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
}

/** Privacidade do perfil público (backend /settings/privacy). */
export interface PrivacySettings {
  profilePublic: boolean;
  showActivity: boolean;
  showFavorites: boolean;
  showRatings: boolean;
  privateAnimeLists: number;
}

/** Moderation report. */
export type ReportTargetType = 'COMMENT' | 'CHAT_MESSAGE' | 'USER' | 'ANIME';
export type ReportReason = 'SPAM' | 'HARASSMENT' | 'NSFW' | 'SPOILER' | 'ILLEGAL' | 'OTHER';
export type ReportStatusType = 'PENDING' | 'RESOLVED' | 'DISMISSED';
export type ModerationActionType = 'WARN' | 'MUTE' | 'BAN' | 'DELETE_CONTENT';

export interface ReportItem {
  id: string;
  reporterId: string;
  reporter: { id: string; name: string | null; userName: string | null };
  moderatorId: string | null;
  moderator: { id: string; name: string | null; userName: string | null } | null;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  notes: string | null;
  status: ReportStatusType;
  moderationNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportListResponse {
  data: ReportItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ModerationActionItem {
  id: string;
  userId: string;
  user: { id: string; name: string | null; userName: string | null };
  moderatorId: string;
  moderator: { id: string; name: string | null; userName: string | null };
  actionType: ModerationActionType;
  reason: string | null;
  expiresAt: string | null;
  createdAt: string;
}

/** Anime request (community). */
export type FeedbackStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'WONT_FIX' | 'COMPLETED' | 'REJECTED';

export interface AnimeRequestItem {
  id: string;
  userId: string;
  user: { id: string; name: string | null; userName: string | null; avatar: string | null };
  title: string;
  alternativeTitle: string | null;
  notes: string | null;
  status: FeedbackStatus;
  voteCount: number;
  hasVoted: boolean;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Site feedback (suggestion/bug). */
export type FeedbackType = 'SUGGESTION' | 'BUG' | 'REQUEST';

export interface SiteFeedbackItem {
  id: string;
  userId: string;
  user: { id: string; name: string | null; userName: string | null; avatar: string | null };
  type: FeedbackType;
  title: string;
  description: string;
  status: FeedbackStatus;
  adminNote: string | null;
  upvotes: number;
  createdAt: string;
  updatedAt: string;
}
