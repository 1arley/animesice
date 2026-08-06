import { notFound } from "next/navigation";
import { Header } from "@/components/common/Header";
import { SiteNav } from "@/components/common/SiteNav";
import { Footer } from "@/components/common/Footer";
import type { Anime } from "@/types";
import { safeImageSrc } from "@/lib/api";
import { AdSlot } from "@/components/ads/AdSlot";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

async function fetchAnime(slug: string): Promise<Anime | null> {
  try {
    const res = await fetch(`${API_URL}/anime/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as Anime;
  } catch {
    return null;
  }
}

export default async function AnimeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const anime = await fetchAnime(slug);
  if (!anime) notFound();

  const episodes = (anime.episodes ?? []).slice().sort((a, b) => a.number - b.number);
  const ongoing = anime.status?.toUpperCase().includes("LANC");
  const dub = anime.audio === "DUBLADO";

  return (
    <>
      <Header />
      <SiteNav />

      <main id="body-content">
        <article className="mx-auto max-w-shelf px-4 py-6">
          <p className="mb-4">
            <a href="/" className="text-body-sm text-mist transition-colors hover:text-ice">
              ← Voltar à prateleira
            </a>
          </p>

          {/* Cabeça: capa + identidade. UI emoldura a arte, não compete. */}
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="shrink-0 md:w-56 lg:w-64">
              <div className="overflow-hidden bg-panel" style={{ aspectRatio: "2 / 3" }}>
                {safeImageSrc(anime.coverImage) ? (
                  <img
                    src={safeImageSrc(anime.coverImage)}
                    alt={anime.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-hairline">
                    <span className="font-display text-caption uppercase tracking-wider text-mist">
                      sem capa
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1">
              <h1 className="font-display text-display-xl text-ink">{anime.title}</h1>

              {/* Placar de fatos — binários que merecem signposting, não 5 chips. */}
              <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-3 border-y border-hairline py-3">
                {anime.rating != null && (
                  <div>
                    <dt className="font-display text-caption uppercase tracking-wider text-mist">
                      Nota
                    </dt>
                    <dd className="font-display text-body font-semibold text-ice tabular-nums">
                      {anime.rating.toFixed(2)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="font-display text-caption uppercase tracking-wider text-mist">
                    Status
                  </dt>
                  <dd className="font-sans text-body-sm font-medium text-ink">
                    {ongoing ? "Em lançamento" : anime.status || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="font-display text-caption uppercase tracking-wider text-mist">
                    Áudio
                  </dt>
                  <dd className="font-sans text-body-sm font-medium text-ink">
                    {dub ? "Dublado" : "Legendado"}
                  </dd>
                </div>
                {anime.ageRating && (
                  <div>
                    <dt className="font-display text-caption uppercase tracking-wider text-mist">
                      Classe
                    </dt>
                    <dd className="font-sans text-body-sm font-medium text-ink">
                      {anime.ageRating}
                    </dd>
                  </div>
                )}
              </dl>

              {anime.genres && anime.genres.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {anime.genres.map((g) => (
                    <li
                      key={g.id}
                      className="border border-hairline px-2 py-1 font-sans text-caption text-mist"
                    >
                      {g.name}
                    </li>
                  ))}
                </ul>
              )}

              <section className="mt-5">
                <h2 className="mb-2 font-sans text-caption font-semibold uppercase tracking-wider text-mist">
                  Sinopse
                </h2>
                <p className="whitespace-pre-line max-w-2xl text-body text-mist">
                  {anime.synopsis || "Sem sinopse disponível."}
                </p>
              </section>
            </div>
          </div>

          <AdSlot
            slot="0000000003"
            format="horizontal"
            className="mt-10 min-h-[90px]"
          />

          {/* Lista de episódios: grid de números, não cards de card-img.
              Nº é conteúdo, tipográfico. */}
          <section className="mt-10">
            <h2 className="shelf-label">
              Episódios{" "}
              {episodes.length > 0 && (
                <span className="shelf-label-data">{episodes.length}</span>
              )}
            </h2>
            {episodes.length === 0 ? (
              <p className="text-body-sm text-mist">Sem episódios cadastrados.</p>
            ) : (
              <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
                {episodes.map((ep) => {
                  const available = ep.videoUrl ?? ep.embedUrl;
                  return (
                    <li key={ep.id}>
                      <a
                        href={`/animes/${slug}/${ep.number}`}
                        className={`group block border border-hairline bg-panel px-1 py-2 text-center transition-colors hover:border-ice ${
                          available ? "" : "opacity-40"
                        }`}
                        title={`Episódio ${ep.number}${available ? "" : " — sem vídeo"}`}
                      >
                        <span className="font-display text-body font-semibold text-mist tabular-nums transition-colors group-hover:text-ice">
                          {ep.number}
                        </span>
                        <span className="block font-display text-caption uppercase tracking-wider text-mist">
                          ep
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </article>
      </main>

      <Footer />
    </>
  );
}
