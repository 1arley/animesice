import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { serverFetchJson } from "@/lib/api-server";
import type { Episode, Anime } from "@/types";
import { isHentaiAnime, hentaisPath } from "@/lib/hentai";
import { WatchClient } from "@/components/common/WatchClient";

export const revalidate = 60;

// Getter compartilhado (generateMetadata + page) com cache ISR. Antes cada
// render de página de episódio batia 2x na API sem cache — com o backend atrás
// do Cloudflare, isso estourava o throttle (429) e transformava a página num
// not-found 200 + noindex para o Google. force-cache + revalidate 60 reduz
// drasticamente os hits de origem.
const getEpisode = cache((slug: string, number: string) =>
  serverFetchJson<Episode & { anime: Anime }>(`/episode/${slug}/${number}`, {
    cache: "force-cache",
    next: { revalidate: 60, tags: [`episode:${slug}:${number}`] },
  }),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; number: string }>;
}): Promise<Metadata> {
  const { slug, number } = await params;
  const ep = await getEpisode(slug, number);
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

  const episode = await getEpisode(slug, numberParam);
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