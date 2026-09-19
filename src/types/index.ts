// Animesice - Tipos alinhados com o Prisma (backend animesice-back/schema.prisma)

export type AnimeFormat = "TV" | "MOVIE" | "OVA" | "ONA" | "SPECIAL" | "MUSIC";
export type AnimeSeason = "WINTER" | "SPRING" | "SUMMER" | "FALL";
export type SortMode = "recentlyAdded" | "rating" | "views" | "year" | "title";

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
  season: number;
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
  audio: "LEGENDADO" | "DUBLADO";
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
  anilistId?: number | null;
  malId?: number | null;
  published?: boolean;
  editorialSynopsis?: string | null;
  editorialWhereToWatch?: string | null;
  editorialDubbingInfo?: string | null;
  editorialSeasonsInfo?: string | null;
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

/** Artigo editorial do blog. O conteúdo é HTML sanitizado antes da renderização. */
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  category: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Payload compartilhado pelas operações de criação e edição do CMS. */
export interface BlogPostInput {
  slug: string;
  title: string;
  description: string;
  content: string;
  category: string;
  published: boolean;
  publishedAt: string | null;
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
    /** Contadores de follow — sempre presentes em /users/:id. */
    followers: number;
    following: number;
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
export type WatchStatus =
  "PLANNING" | "WATCHING" | "COMPLETED" | "ON_HOLD" | "DROPPED";

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
export type NotificationType =
  | "NEW_EPISODE"
  | "COMMENT_REPLY"
  | "COMMENT_LIKE"
  | "MODERATION_ACTION"
  | "SYSTEM"
  | "POST_LIKE"
  | "POST_COMMENT"
  | "NEW_FOLLOW";
export type NotificationChannel = "IN_APP" | "EMAIL";

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
  showGacha: boolean;
  privateAnimeLists: number;
}

/** Moderation report. */
export type ReportTargetType =
  "COMMENT" | "CHAT_MESSAGE" | "USER" | "ANIME" | "POST" | "POST_COMMENT";
export type ReportReason =
  "SPAM" | "HARASSMENT" | "NSFW" | "SPOILER" | "ILLEGAL" | "OTHER";
export type ReportStatusType = "PENDING" | "RESOLVED" | "DISMISSED";
export type ModerationActionType = "WARN" | "MUTE" | "BAN" | "DELETE_CONTENT";

export interface ReportItem {
  id: string;
  reporterId: string;
  reporter: { id: string; name: string | null; userName: string | null };
  moderatorId: string | null;
  moderator: {
    id: string;
    name: string | null;
    userName: string | null;
  } | null;
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

/** Autor compacto (post do feed / comentário de post). */
export interface SocialUser {
  id: string;
  name: string | null;
  userName: string | null;
  avatar: string | null;
  gachaCosmetics?: string[];
  gachaCardBack?: string | null;
}

/** Anime referenciado em um post do feed. */
export interface PostAnime {
  id: string;
  slug: string;
  title: string;
  coverImage: string | null;
  malId?: number | null;
}

/** Post do feed social (GET /social/posts). */
export interface SocialPost {
  id: string;
  content: string;
  kind: string;
  meta: GachaPullMeta | null;
  animeId: string | null;
  anime: PostAnime | null;
  user: SocialUser;
  _count: { likes: number; comments: number };
  hasLiked: boolean;
  shareCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Comentário em um post do feed. */
export interface PostCommentItem {
  id: string;
  postId: string;
  content: string;
  user: SocialUser;
  createdAt: string;
}

/** Meta de um post GACHA_PULL (pull Épico+ publicado no feed). */
export interface GachaPullMeta {
  userCardId: string;
  cardId: string;
  name: string;
  image: string | null;
  imageHidden?: boolean;
  rarity: string;
  foil: string;
  condition: number;
  edition: number;
  value: number;
}

/** Carta do gacha (personagem cacheado do AniList). */
export interface AdminGachaCard {
  id: string;
  name: string;
  image: string | null;
  imageHidden: boolean;
  rarity: string;
  favourites: number;
  animeId: string | null;
  animeTitle: string | null;
  createdAt: string;
  updatedAt: string;
  status: "DRAFT" | "REVIEW" | "ACTIVE" | "ARCHIVED";
  source: "MAL" | "MANUAL";
  variantName: string | null;
  variantType: string;
  anime?: PostAnime | null;
}

export interface GachaCardInfo {
  id: string;
  name: string;
  image: string | null;
  imageHidden: boolean;
  rarity: string;
  favourites: number;
  animeId: string | null;
  animeTitle: string | null;
  anime: PostAnime | null;
}

/** Cópia de carta de um usuário. */
export interface GachaPull {
  id: string;
  condition: number;
  conditionLabel?: string;
  foil: string;
  edition: number;
  value: number;
  valueOverride?: number | null;
  obtainedAt: string;
  user: SocialUser;
  card: GachaCardInfo;
  originalUser?: SocialUser | null;
  skin?: Pick<GachaSkin, "id" | "name" | "imageUrl"> | null;
}

/** Status do roll diário + giros/claim (campos novos opcionais p/ compat). */
export interface GachaStatus {
  canRoll: boolean;
  rollsLeft: number;
  nextRollAt: string | null;
  pityDaysLeft: number;
  pityDue: boolean;
  spinsLeft?: number;
  canSpin?: boolean;
  nextSpinAt?: string | null;
  canClaim?: boolean;
  nextClaimAt?: string | null;
  claimWarning?: string | null;
  bypassPriceCents?: number | null;
  pointsBalance?: number;
  pointsCosmetics?: string[];
  crystalBalance?: number;
}

export interface GachaSkin {
  id: string;
  characterId: string;
  name: string;
  imageUrl: string;
  owned: boolean;
  equipped: boolean;
  sourceUrl?: string | null;
  acquiredAt?: string | null;
}

export interface GachaSkinsResponse {
  skins: GachaSkin[];
  owned: GachaSkin[];
  equippedSkinId: string | null;
  crystalBalance: number;
  canSpin: boolean;
  nextSpinAt: string | null;
  spinPrice: number;
  cooldownHours: number;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface GachaShopItem {
  key: string;
  label: string;
  description: string;
  price: number;
  owned: boolean;
}

export interface GachaShop {
  balance: number;
  cosmetics: GachaShopItem[];
  activeCardBack?: string | null;
}

/** Anúncio do mercado — buy-now por Crystais, expira em 48h. */
export interface GachaListing {
  id: string;
  userId: string;
  price: number;
  status: "ACTIVE" | "SOLD" | "CANCELLED" | "EXPIRED";
  expiresAt: string;
  createdAt: string;
  user: SocialUser;
  userCard: GachaPull;
  interestedCount?: number;
}

export interface GachaListingPage {
  data: GachaListing[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface GachaInterestedUser {
  id: string;
  name: string | null;
  userName: string | null;
  avatar: string | null;
}

export type GachaPointEventType = "MINT" | "SPEND" | "SALE" | "TAX" | "ADMIN";

export interface GachaPointEvent {
  id: string;
  delta: number;
  type: GachaPointEventType;
  refId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface GachaPointsPage {
  balance: number;
  events: GachaPointEvent[];
  meta: { page: number; limit: number; total: number };
}

export type CrystalEventType =
  | "INITIAL"
  | "MINT"
  | "DAILY"
  | "SPEND"
  | "PURCHASE"
  | "SALE"
  | "TAX"
  | "ADMIN"
  | "BURN";

export interface CrystalEvent {
  id: string;
  delta: number;
  type: CrystalEventType;
  refId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface CrystalPage {
  balance: number;
  events: CrystalEvent[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** Preview de giro — sorteio sem ownership (sem edition, sem dono). */
export interface GachaSpinPreview {
  id: string;
  hour: string;
  slot: number;
  condition: number;
  conditionLabel?: string;
  foil: string;
  value: number;
  claimedAt: string | null;
  expiresAt: string;
  createdAt: string;
  pityDue?: boolean;
  card: GachaCardInfo;
}

export interface GachaBypassCheckout {
  reference: string;
  checkoutUrl: string;
  amountCents: number;
}

export type GachaBypassStatus = "PENDING" | "PAID" | "EXPIRED";

/** Coleção de cartas com stats. */
export interface GachaCollectionResponse {
  data: GachaPull[];
  stats: {
    total: number;
    totalValue: number;
    medals: Array<{ id: string; name: string; version: number }>;
  };
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** Linha do ranking de colecionadores. */
export interface GachaRankingEntry {
  user: SocialUser;
  totalValue: number;
  pulls: number;
}

export interface GachaEncyclopediaCard {
  id: string;
  name: string;
  image: string | null;
  rarity: string;
  animeId: string | null;
  animeTitle: string | null;
  owned: boolean;
  wishlisted: boolean;
  wishlistPriority: string | null;
}

export interface GachaEncyclopediaSet {
  animeId: string | null;
  animeTitle: string;
  animeSlug: string | null;
  total: number;
  owned: number;
  complete: boolean;
  wishlisted: boolean;
}

export interface GachaEncyclopedia {
  view: "cards" | "sets";
  cards: GachaEncyclopediaCard[];
  sets: GachaEncyclopediaSet[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export type WishlistPriority = "LOW" | "NORMAL" | "HIGH";

export interface GachaWishlistCard {
  id: string;
  cardId: string;
  priority: WishlistPriority;
  acceptedFoils: string[];
  minCondition: string | null;
  maxEdition: number | null;
  complete: boolean;
  card: GachaEncyclopediaCard & {
    anime: { id: string; slug: string; title: string } | null;
  };
}

export interface GachaWishlistSet {
  id: string;
  animeId: string;
  priority: WishlistPriority;
  total: number;
  owned: number;
  complete: boolean;
  anime: { id: string; slug: string; title: string; coverImage: string | null };
}

export interface GachaWishlistResponse {
  private: boolean;
  isPublic: boolean;
  cards: GachaWishlistCard[];
  sets: GachaWishlistSet[];
  meta: {
    cards: number;
    sets: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

/** Carta destaque — setComplete sinaliza conjunto completo (prestígio no perfil). */
export type GachaFeatured = GachaPull & {
  setComplete?: boolean;
  featured?: {
    enabled: boolean;
    claimed: number;
    startedAt: string | null;
    settledAt: string | null;
    ratePercentPerTwoHours: number;
    dailyCapPercent: number;
    accumulationDays: number;
    medal: { id: string; name: string } | null;
  };
};

export interface GachaCollectionProgress {
  id: string;
  name: string;
  slug: string;
  version: number;
  total: number;
  discovered: number;
  percent: number;
  rewards: {
    reward25At: string | null;
    reward50At: string | null;
    reward100At: string | null;
  };
  favorite: boolean;
  pinned: boolean;
}

export interface GachaEngagementPilotDashboard {
  config: { percent: number; startedAt: string };
  cohort: { assigned: number; totalUsers: number };
  economy: {
    emitted: number;
    sinks: number;
    ratio: number | null;
    pause: boolean;
  };
  behavior: {
    earners: number;
    meaningfulUsers: number;
    rewardOnlyUsers: number;
    rewardOnlyRate: number;
    sharedCards: number;
    pause: boolean;
  };
  satisfaction: { measured: boolean };
}

export type GachaTradeStatus =
  "PENDING" | "COMPLETED" | "CANCELLED" | "EXPIRED";

export interface GachaTrade {
  id: string;
  status: GachaTradeStatus;
  expiresAt: string;
  createdAt: string;
  completedAt: string | null;
  offeredUserId: string;
  requestedUserId: string;
  offeredUserCardId: string;
  requestedUserCardId: string;
  offeredUserCard: GachaPull;
  requestedUserCard: GachaPull;
  offeredUserCards: GachaPull[];
  requestedUserCards: GachaPull[];
}

/**
 * Item do feed social — união discriminada por `type`:
 *  - post: texto livre de um usuário
 *  - activity: evento público (watch/rating/favorite/comment) com o autor
 */
export type FeedItem =
  | { type: "post"; post: SocialPost }
  | { type: "activity"; event: PublicActivityEvent; user: SocialUser };

/** Resultado da busca/diretório de usuários (GET /users). */
export interface UserSearchResult {
  id: string;
  name: string | null;
  userName: string | null;
  avatar: string | null;
  bio: string | null;
  createdAt: string;
  _count: {
    comments: number;
    ratings: number;
    favorites: number;
    /** Ausente nas listas de follow (/social/followers, /social/following/:id). */
    watchHistories?: number;
  };
  isFollowing: boolean;
}

/** Anime request (community). */
export type FeedbackStatus =
  "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "WONT_FIX" | "COMPLETED" | "REJECTED";

export interface AnimeRequestItem {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    userName: string | null;
    avatar: string | null;
  };
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
export type FeedbackType = "SUGGESTION" | "BUG" | "REQUEST";

export interface SiteFeedbackItem {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    userName: string | null;
    avatar: string | null;
  };
  type: FeedbackType;
  title: string;
  description: string;
  status: FeedbackStatus;
  adminNote: string | null;
  upvotes: number;
  createdAt: string;
  updatedAt: string;
}
