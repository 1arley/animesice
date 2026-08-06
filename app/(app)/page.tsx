import { AnimeCard } from "@/components/common/AnimeCard";
import { EpisodeCard } from "@/components/common/EpisodeCard";
import { safeImageSrc } from "@/lib/url";
import { AdSlot } from "@/components/ads/AdSlot";
import { serverFetchJson } from "@/lib/api-server";
import { isOnAir } from "@/lib/status";
import type { Anime, Episode, Paginated } from "@/types";

export default async function HomePage() {
  const animesRes = await serverFetchJson<Paginated<Anime>>(
    "/anime?page=1&limit=12",
    60,
  );
  const latestRes = await serverFetchJson<(Episode & { anime: Anime })[]>(
    "/episode/latest?limit=12",
    60,
  );

  const animes = animesRes?.data ?? [];
  const latest = latestRes ?? [];

  // "No ar agora": lançamentos (status LANCAMENTO), únicos por slug.
  const onAir = new Map<string, Anime>();
  for (const a of animes) {
    if (isOnAir(a.status)) onAir.set(a.slug, a);
  }
  const onAirList = [...onAir.values()];

  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      {/* Signature: a programação de agora, como um broadcast bug.
          Hero = conteúdo (episódios correntes), não headline+gradient. */}
      {onAirList.length > 0 && (
            <section className="mb-8" aria-label="No ar agora">
              <Rail label="No ar agora" count={onAirList.length}>
                {onAirList.map((anime) => (
                  <article
                    key={anime.id}
                    className="min-w-[140px] shrink-0 snap-start"
                  >
                    <a
                      href={`/animes/${anime.slug}`}
                      className="group block"
                      title={`${anime.title} — em lançamento`}
                    >
                      <div
                        className="relative overflow-hidden bg-panel"
                        style={{ aspectRatio: "2 / 3" }}
                      >
                        {safeImageSrc(anime.coverImage) ? (
                          <img
                            src={safeImageSrc(anime.coverImage)}
                            loading="lazy"
                            alt={anime.title}
                            className="absolute inset-0 h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-hairline" />
                        )}
                        {/* Carimbo de "no ar" — a única nota cyan viva. */}
                        <span className="absolute left-0 top-0 bg-ice px-1.5 py-0.5 font-display text-caption font-semibold uppercase tracking-wider text-ink">
                          No ar
                        </span>
                      </div>
                      <h3 className="mt-1.5 line-clamp-1 font-sans text-body-sm font-medium text-mist transition-colors group-hover:text-ice">
                        {anime.title}
                      </h3>
                    </a>
                  </article>
                ))}
              </Rail>
            </section>
          )}

          <section className="mb-8" aria-label="Em lançamento">
            <h1 className="shelf-label">
              Em lançamento{" "}
              <span className="shelf-label-data">{animes.length} títulos</span>
            </h1>
            {animes.length === 0 ? (
              <p className="text-body-sm text-mist">
                Nenhum anime no catálogo ainda. Rode o seed do backend.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {animes.map((anime) => (
                  <AnimeCard key={anime.id} anime={anime} />
                ))}
              </div>
            )}
          </section>

          <section className="mb-8" aria-label="Últimos episódios">
            <h2 className="shelf-label">
              Últimos episódios{" "}
              <span className="shelf-label-data">{latest.length} novos</span>
            </h2>
            {latest.length === 0 ? (
              <p className="text-body-sm text-mist">Sem episódios recentes.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {latest.map((ep) => (
                  <EpisodeCard key={ep.id} episode={ep} />
                ))}
              </div>
            )}
          </section>

          <AdSlot
            slot="0000000001"
            format="horizontal"
            className="mb-8 min-h-[90px]"
            label="Publicidade"
          />

          {animes.length > 0 && (
            <section aria-label="Destaques da semana">
              <h2 className="shelf-label">Destaques da semana</h2>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {animes.slice(0, 6).map((anime) => (
                  <AnimeCard key={`week-${anime.id}`} anime={anime} />
                ))}
              </div>
            </section>
          )}

          <AdSlot
            slot="0000000002"
            format="horizontal"
            className="mt-8 min-h-[90px]"
            label="Publicidade"
          />
      </div>
  );
}

/** Rail horizontal scroll-x com snap. Section label flexível p/ selo de contagem. */
function Rail({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <>
      <h1 className="shelf-label">
        {label} <span className="shelf-label-data">{count}</span>
      </h1>
      <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:thin]">
        <div className="flex gap-3 snap-x">{children}</div>
      </div>
    </>
  );
}
