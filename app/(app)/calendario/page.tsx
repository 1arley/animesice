import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { Anime, CalendarResponse } from "@/types";
import { serverFetchJson } from "@/lib/api-server";
import { safeImageSrc } from "@/lib/url";
import { blur } from "@/lib/blur";
import { YearFilter } from "@/components/calendario/YearFilter";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Calendário de animes — Programação semanal de episódios",
  description: "Calendário semanal de animes — saiba quando cada episódio sai. Acompanhe a programação completa no AnimesIce.",
  alternates: { canonical: "/calendario" },
  openGraph: {
    title: "Calendário de animes | AnimesIce",
    description: "Calendário semanal de animes — saiba quando cada episódio sai.",
  },
};

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; year?: string }>;
}) {
  const sp = await searchParams;
  const season = sp.season ?? "";
  const year = sp.year ?? "";

  const query = new URLSearchParams();
  if (season) query.set("season", season);
  if (year) query.set("year", year);

  const data = await serverFetchJson<CalendarResponse>(
    `/anime/calendar?${query.toString()}`,
    { cache: "force-cache", next: { revalidate: 300, tags: ["calendario"] } },
  );

  const byDay = data?.byDay ?? [];

  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <nav className="mb-4 text-caption text-mist" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1">
          <li><a href="/" className="hover:text-ice">Início</a></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ice">Calendário</li>
        </ol>
      </nav>

      <h1 className="shelf-label">
        Calendário{" "}
        <span className="shelf-label-data">
          {byDay.reduce((acc, d) => acc + d.animes.length, 0)} títulos
        </span>
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {(["WINTER", "SPRING", "SUMMER", "FALL"] as const).map((s) => (
          <Link
            key={s}
            href={`/calendario?season=${s}${year ? `&year=${year}` : ""}`}
            className={`btn-ghost ${season === s ? "border-ice text-ice" : ""}`}
          >
            {s === "WINTER" ? "Inverno" : s === "SPRING" ? "Primavera" : s === "SUMMER" ? "Verão" : "Outono"}
          </Link>
        ))}

        <label className="ml-auto flex items-center gap-2">
          <span className="font-mono text-caption uppercase tracking-wider text-mist">
            Ano
          </span>
          <YearFilter season={season} year={year} />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {byDay.map((day) => (
          <section key={day.day} className="border border-hairline bg-panel">
            <h2 className="border-b border-hairline px-3 py-2 font-display text-body font-semibold text-ice">
              {day.label}{" "}
              <span className="font-sans text-caption text-mist">({day.animes.length})</span>
            </h2>
            {day.animes.length === 0 ? (
              <p className="px-3 py-2 text-body-sm text-mist">—</p>
            ) : (
              <ul className="divide-y divide-hairline">
                {day.animes.map((anime) => (
                  <li key={anime.id}>
                    <Link
                      href={`/animes/${anime.slug}`}
                      className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-ink"
                    >
                      <PosterThumb anime={anime} />
                      <div className="min-w-0">
                        <p className="line-clamp-1 font-sans text-body-sm font-medium text-mist transition-colors hover:text-ice">
                          {anime.title}
                        </p>
                        {(anime.animeSchedules?.find((s) => s.dayOfWeek === day.day)?.time) && (
                          <p className="font-mono text-caption text-mist tabular-nums">
                            {anime.animeSchedules!.find((s) => s.dayOfWeek === day.day)!.time}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

/** Miniatura 2:3 do calendário (next/image, lazy, dimensões fixas — zero CLS). */
function PosterThumb({ anime }: { anime: Anime }) {
  const cover = safeImageSrc(anime.coverImage);
  return cover ? (
    <div className="h-12 w-8 shrink-0 overflow-hidden bg-hairline">
      <Image
        src={cover}
        alt={anime.title}
        width={32}
        height={48}
        sizes="32px"
        loading="lazy"
        placeholder="blur"
        blurDataURL={blur.portrait}
        className="h-full w-full object-cover"
        quality={80}
      />
    </div>
  ) : (
    <div className="h-12 w-8 shrink-0 bg-hairline" />
  );
}
