"use client";

export type ProfileTab =
  | "overview"
  | "activity"
  | "ratings"
  | "collection"
  | "favorites";

const TABS: Array<{ id: ProfileTab; label: string }> = [
  { id: "overview", label: "Visão geral" },
  { id: "activity", label: "Atividade" },
  { id: "ratings", label: "Notas" },
  { id: "collection", label: "Coleção" },
  { id: "favorites", label: "Favoritos" },
];

/**
 * ProfileNav — navegação do perfil. Visual de canal (mono, ice no ativo),
 * rolável horizontalmente no mobile para nunca quebrar em duas linhas.
 */
export function ProfileNav({
  active,
  onNavigate,
}: {
  active: ProfileTab;
  onNavigate: (tab: ProfileTab) => void;
}) {
  return (
    <nav
      aria-label="Seções do perfil"
      className="scrollbar-none -mx-4 overflow-x-auto border-b border-hairline px-4"
    >
      <div className="flex min-w-max gap-1">
        {TABS.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onNavigate(t.id)}
              aria-current={isActive ? "page" : undefined}
              className={`relative whitespace-nowrap px-4 py-3 font-mono text-body-sm uppercase tracking-wider transition-colors ${
                isActive ? "text-ice" : "text-mist hover:text-snow"
              }`}
            >
              {t.label}
              {isActive && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 bg-ice" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
