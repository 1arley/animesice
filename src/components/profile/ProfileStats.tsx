import type { PublicUserProfile } from "@/types";
import type { ProfileTab } from "./ProfileNav";

interface StatItem {
  label: string;
  value: number;
  /** Tab para onde a estatística navega. */
  tab: ProfileTab;
}

/**
 * ProfileStats — faixa de identidade com os números do usuário.
 * Cada estatística navega para a seção correspondente quando existe.
 */
export function ProfileStats({
  counts,
  onNavigate,
}: {
  counts: PublicUserProfile["_count"];
  onNavigate: (tab: ProfileTab) => void;
}) {
  const items: StatItem[] = [
    { label: "Episódios", value: counts.watchHistories ?? 0, tab: "activity" },
    { label: "Avaliações", value: counts.ratings ?? 0, tab: "ratings" },
    { label: "Favoritos", value: counts.favorites ?? 0, tab: "favorites" },
    { label: "Comentários", value: counts.comments ?? 0, tab: "activity" },
  ];

  return (
    <div className="grid grid-cols-2 gap-px bg-hairline sm:grid-cols-4">
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          onClick={() => onNavigate(it.tab)}
          className="group flex flex-col gap-0.5 bg-panel px-4 py-5 text-left transition-colors hover:bg-slate"
        >
          <span className="font-mono text-caption uppercase tracking-wider text-mist">
            {it.label}
          </span>
          <span className="font-display text-display-lg text-snow tabular-nums transition-colors group-hover:text-ice">
            {it.value}
          </span>
        </button>
      ))}
    </div>
  );
}
