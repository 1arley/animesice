import type { Anime, CalendarResponse } from "@/types";
import { serverFetchJson } from "@/lib/api-server";
import { safeImageSrc } from "@/lib/url";

export const dynamic = "force-dynamic";

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
    300,
  );

  const byDay = data?.byDay ?? [];
  const unscheduled = data?.unscheduled ?? [];

  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <h1 className="shelf-label">
        Calendário{" "}
        <span className="shelf-label-data">
          {byDay.reduce((acc, d) => acc + d.animes.length, 0)} títulos
        </span>
      </h1>

      <div className="mb-6 flex flex-wrap gap-2">
        {(["WINTER", "SPRING", "SUMMER", "FALL"] as const).map((s) => (
          <a
            key={s}
            href={`/calendario?season=${s}`}
            className={`btn-ghost ${season === s ? "border-ice text-ice" : ""}`}
          >
            {s === "WINTER" ? "Inverno" : s === "SPRING" ? "Primavera" : s === "SUMMER" ? "Verão" : "Outono"}
          </a>
        ))}
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
                    <a
                      href={`/animes/${anime.slug}`}
                      className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-ink"
                    >
                      {safeImageSrc(anime.coverImage) ? (
                        <div className="h-12 w-8 shrink-0 overflow-hidden bg-hairline">
                          <img
                            src={safeImageSrc(anime.coverImage)}
                            alt={anime.title}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-12 w-8 shrink-0 bg-hairline" />
                      )}
                      <div className="min-w-0">
                        <p className="line-clamp-1 font-sans text-body-sm font-medium text-mist transition-colors hover:text-ice">
                          {anime.title}
                        </p>
                        {(anime.animeSchedules?.find((s) => s.dayOfWeek === day.day)?.time) && (
                          <p className="font-display text-caption text-mist tabular-nums">
                            {anime.animeSchedules!.find((s) => s.dayOfWeek === day.day)!.time}
                          </p>
                        )}
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {unscheduled.length > 0 && (
        <section className="mt-8">
          <h2 className="shelf-label">
            Sem horário fixo{" "}
            <span className="shelf-label-data">{unscheduled.length}</span>
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {unscheduled.map((anime) => (
              <a
                key={anime.id}
                href={`/animes/${anime.slug}`}
                className="line-clamp-1 border border-hairline bg-panel px-2 py-1 font-sans text-body-sm text-mist transition-colors hover:text-ice"
              >
                {anime.title}
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
