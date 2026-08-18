import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { serverFetchJson } from "@/lib/api-server";
import type { Episode, Anime } from "@/types";
import { isHentaiAnime, hentaisPath } from "@/lib/hentai";
import { WatchClient } from "@/components/common/WatchClient";
import { SITE_URL } from "@/lib/site";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; number: string }>;
}): Promise<Metadata> {
  const { slug, number } = await params;
  const ep = await serverFetchJson<Episode & { anime: Anime }>(`/episode/${slug}/${number}`);
  if (!ep) return {};

  const title = `${ep.anime.title} — Episódio ${ep.number}`;
  const description = `Assistir ${ep.anime.title} episódio ${ep.number} online em HD.`;

  return {
    title,
    description,
    alternates: { canonical: `/animes/${slug}/${number}` },
    openGraph: {
      title,
      description,
      type: "video.episode",
      ...(ep.thumbnailUrl ? { images: [{ url: ep.thumbnailUrl }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ep.thumbnailUrl ? { images: [ep.thumbnailUrl] } : {}),
    },
  };
}

export default async function WatchPage({
  params,
}: {
  params: Promise<{ slug: string; number: string }>;
}) {
  const { slug, number: numberParam } = await params;
  const number = Number(numberParam);
  if (Number.isNaN(number)) notFound();

  const episode = await serverFetchJson<Episode & { anime: Anime }>(`/episode/${slug}/${number}`);
  if (!episode) notFound();

  if (isHentaiAnime(episode.anime)) permanentRedirect(hentaisPath(slug, number));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TVEpisode",
    name: `${episode.anime.title} — Episódio ${episode.number}`,
    episodeNumber: episode.number,
    partOfSeason: { "@type": "TVSeason", partOfSeries: { "@type": "TVSeries", name: episode.anime.title } },
    ...(episode.thumbnailUrl ? { thumbnailUrl: episode.thumbnailUrl } : {}),
  };

  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <WatchClient slug={slug} number={number} initialEpisode={episode} />
    </div>
  );
}