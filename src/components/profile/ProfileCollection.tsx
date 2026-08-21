import type { PublicAnimeListItem, WatchStatus } from "@/types";
import { SectionLabel } from "@/components/common/SectionLabel";
import { PosterTile } from "./PosterTile";
import { EmptyState } from "@/components/ui/EmptyState";

export const STATUS_LABELS: Record<WatchStatus, string> = {
  WATCHING: "Assistindo",
  COMPLETED: "Completo",
  PLANNING: "Planejado",
  ON_HOLD: "Pausado",
  DROPPED: "Dropado",
};

const STATUS_FILTERS: Array<{ id: WatchStatus | "ALL"; label: string }> = [
  { id: "ALL", label: "Tudo" },
  { id: "WATCHING", label: "Assistindo" },
  { id: "COMPLETED", label: "Completo" },
  { id: "PLANNING", label: "Planejado" },
  { id: "ON_HOLD", label: "Pausado" },
  { id: "DROPPED", label: "Dropado" },
];

/**
 * ProfileCollection — a coleção em capas, com estados visuais claros.
 * O filtro é server-side (status chega via prop); a página controla o estado
 * e busca com `getUserAnimeList(status)`, então a contagem é sempre real.
 */
export function ProfileCollection({
  items,
  total,
  status,
  onStatusChange,
  loading,
}: {
  items: PublicAnimeListItem[];
  total: number;
  status: WatchStatus | "ALL";
  onStatusChange: (s: WatchStatus | "ALL") => void;
  loading?: boolean;
}) {
  if (items.length === 0 && !loading) {
    return (
      <section>
        <SectionLabel level={2}>Coleção</SectionLabel>
        <EmptyState
          text="Nenhum anime na coleção ainda."
          variant="compact"
        />
      </section>
    );
  }

  return (
    <section>
      <SectionLabel level={2}>
        Coleção <span className="shelf-label-data">{total}</span>
      </SectionLabel>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => {
          const active = status === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onStatusChange(f.id)}
              aria-pressed={active}
              className={`px-3 py-1.5 font-mono text-caption uppercase tracking-wider transition-colors ${
                active
                  ? "bg-ice text-ink"
                  : "border border-hairline text-mist hover:border-ice/50 hover:text-ice"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10" aria-busy="true">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-ice border-t-transparent" />
          <span className="ml-2 text-body-sm text-mist">Carregando...</span>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          text="Nada aqui com esse estado."
          variant="compact"
        />
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {items.map((item) => {
            const totalEp = item.anime.episodeCount;
            const pct =
              totalEp && totalEp > 0
                ? Math.min(
                    100,
                    Math.round((item.episodesWatched / totalEp) * 100),
                  )
                : null;
            return (
              <PosterTile
                key={item.animeId}
                slug={item.anime.slug}
                title={item.anime.title}
                coverImage={item.anime.coverImage}
                progress={pct}
                statusLabel={STATUS_LABELS[item.status]}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
