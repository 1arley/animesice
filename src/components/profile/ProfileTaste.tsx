import type { PublicAnimeListItem } from "@/types";
import { SectionLabel } from "@/components/common/SectionLabel";

export interface TasteGenre {
  name: string;
  count: number;
}

/**
 * ProfileTaste — representação do gosto do usuário a partir dos gêneros
 * reais da coleção pública. Barras proporcionais ao topo de gêneros.
 */
export function ProfileTaste({ genres }: { genres: TasteGenre[] }) {
  if (genres.length === 0) return null;
  const max = genres[0].count;

  return (
    <section>
      <SectionLabel level={2}>Seu gosto</SectionLabel>
      <div className="space-y-3">
        {genres.map((g) => (
          <div key={g.name} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate font-mono text-caption uppercase tracking-wider text-mist">
              {g.name}
            </span>
            <div className="h-1 flex-1 bg-hairline">
              <div
                className="h-full bg-ice/80 origin-left transition-transform duration-500"
                style={{ transform: `scaleX(${max ? g.count / max : 0})` }}
              />
            </div>
            <span className="w-6 shrink-0 text-right font-mono text-caption tabular-nums text-mist-soft">
              {g.count}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Agrega os gêneros da coleção pública em ranking (top 6, count>0). */
export function buildTaste(
  items: PublicAnimeListItem[] | undefined,
): TasteGenre[] {
  if (!items || items.length < 2) return [];
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const g of item.anime.genres ?? []) {
      counts.set(g.name, (counts.get(g.name) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}
