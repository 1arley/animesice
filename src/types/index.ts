// Tipos alinhados com o Prisma (backend animesice-back/schema.prisma)

export interface Genre {
  id: string;
  slug: string;
  name: string;
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
  genres?: Genre[];
  episodes?: Episode[];
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

export interface ChatMessage {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
  animeSlug: string;
  episodeNumber: number;
  content: string;
  createdAt: string;
}

export interface CommentItem {
  id: string;
  content: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
  animeId: string | null;
  episodeId: string | null;
  parentId: string | null;
  edited: boolean;
  createdAt: string;
  updatedAt: string;
  replies?: CommentItem[];
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
  avatar: string | null;
  bio: string | null;
  createdAt: string;
  _count: {
    comments: number;
    ratings: number;
    favorites: number;
    watchHistories: number;
  };
}

/** Episódio populado com o anime pai — usar em listas de "últimos episódios". */
export interface EpisodeWithAnime extends Episode {
  anime: Anime;
}
