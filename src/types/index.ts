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

/** Episódio populado com o anime pai — usar em listas de "últimos episódios". */
export interface EpisodeWithAnime extends Episode {
  anime: Anime;
}
