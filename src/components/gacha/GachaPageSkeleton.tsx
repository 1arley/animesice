type GachaSkeletonKind =
  | "spin"
  | "cards"
  | "loadout"
  | "economy"
  | "night-market"
  | "skins"
  | "crystals"
  | "wishlist"
  | "encyclopedia";

const labels: Record<GachaSkeletonKind, string> = {
  spin: "Carregando Gacha",
  cards: "Carregando coleção",
  loadout: "Carregando cosméticos equipados",
  economy: "Carregando ofertas",
  "night-market": "Carregando Mercado Noturno",
  skins: "Carregando skins",
  crystals: "Carregando cristais",
  wishlist: "Carregando wishlist",
  encyclopedia: "Carregando enciclopédia",
};

function Block({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

function CardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-2">
          <Block className="aspect-[3/4]" />
          <Block className="h-4 w-4/5" />
          <Block className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function GachaCardGridSkeleton({
  count = 6,
  label = "Carregando cartas",
  className = "mt-6",
}: {
  count?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={className}
    >
      <CardGrid count={count} />
    </div>
  );
}

export function GachaOfferGridSkeleton({
  count = 3,
  label = "Carregando ofertas",
  className = "mt-6",
}: {
  count?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={`grid grid-cols-2 gap-4 sm:grid-cols-3 ${className}`}
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-3 border border-hairline bg-panel p-3">
          <Block className="aspect-[3/4]" />
          <Block className="h-4 w-3/4" />
          <Block className="h-3 w-1/2" />
          <Block className="h-11 w-full" />
        </div>
      ))}
    </div>
  );
}

export function GachaPanelGridSkeleton({
  count = 3,
  label = "Carregando coleção",
  className = "mt-6",
}: {
  count?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="border border-hairline bg-panel p-4">
          <Block className="h-40" />
          <Block className="mt-4 h-4 w-3/4" />
          <Block className="mt-2 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function GachaRowsSkeleton({
  count = 4,
  label = "Carregando itens",
  className = "mt-4",
}: {
  count?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={`space-y-3 ${className}`}
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex items-center gap-3 border border-hairline p-3">
          <Block className="h-10 w-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <Block className="h-4 w-2/3" />
            <Block className="h-3 w-1/3" />
          </div>
          <Block className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function GachaPageSkeleton({
  kind,
}: {
  kind: GachaSkeletonKind;
}) {
  return (
    <main
      id="body-content"
      className="mx-auto max-w-shelf px-4 pb-24 pt-8"
      role="status"
      aria-label={labels[kind]}
      aria-busy="true"
    >
      <Block className="mb-3 h-3 w-28" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-xl space-y-3">
          <Block className="h-9 w-2/3 sm:h-12" />
          <Block className="h-4 w-full max-w-md" />
        </div>
        {(kind === "spin" || kind === "skins" || kind === "crystals") && (
          <Block className="h-20 w-full sm:w-48" />
        )}
      </div>

      {kind === "spin" && (
        <>
          <Block className="mt-8 h-64 sm:h-80" />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Block className="h-28" />
            <Block className="h-28" />
            <Block className="h-28" />
          </div>
        </>
      )}

      {(kind === "cards" || kind === "encyclopedia" || kind === "wishlist") && (
        <>
          {kind === "encyclopedia" && <Block className="mt-8 h-12 w-64" />}
          <div className="my-6 flex flex-wrap gap-3">
            <Block className="h-11 w-40" />
            <Block className="h-11 w-36" />
            <Block className="h-11 w-32" />
          </div>
          <CardGrid count={kind === "wishlist" ? 4 : 6} />
        </>
      )}

      {kind === "loadout" && (
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Block className="h-72" />
          <Block className="h-72" />
          <Block className="h-72" />
        </div>
      )}

      {(kind === "economy" || kind === "night-market" || kind === "skins") && (
        <>
          <Block className="mt-8 h-14 w-full" />
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: kind === "economy" ? 3 : 6 }, (_, index) => (
              <div key={index} className="space-y-3 border border-hairline p-3">
                <Block className="aspect-[3/4]" />
                <Block className="h-4 w-3/4" />
                <Block className="h-10 w-full" />
              </div>
            ))}
          </div>
        </>
      )}

      {kind === "crystals" && (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <Block key={index} className="h-32" />
            ))}
          </div>
          <div className="mt-8 space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <Block key={index} className="h-14" />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
