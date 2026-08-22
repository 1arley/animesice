import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { serverFetchJson } from "@/lib/api-server";
import type { Episode, Anime } from "@/types";
import { isHentaiAnime, hentaisPath } from "@/lib/hentai";
import { WatchClient } from "@/components/common/WatchClient";
import { SITE_URL } from "@/lib/site";

/**
 * Converte formatos comuns de duração para ISO 8601 (PT{minutos}M).
 * A base de dados armazena valores como "24 min", "23 min".
 * Falls back para "PT24M" quando não consegue interpretar.
 */
function toIso8601Duration(raw: string | null | undefined): string {
  if (!raw) return "PT24M";
  const s = raw.trim();
  if (!s) return "PT24M";

  // Já está em ISO 8601
  if (/^PT\d/i.test(s)) return s.toUpperCase();

  // "HH:MM:SS" ou "MM:SS"
  const colon = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (colon) {
    const h = Number(colon[1]);
    const m = Number(colon[2]);
    const sec = Number(colon[3] ?? 0);
    if (h > 0) return sec > 0 ? `PT${h}H${m}M${sec}S` : `PT${h}H${m}M`;
    return sec > 0 ? `PT${m}M${sec}S` : `PT${m}M`;
  }

  // "24 min", "24m", "24 minutes", "23 min"
  const minOnly = s.match(/^(\d+)\s*(?:min|minutes?|m)(?:\s|$)/i);
  if (minOnly) return `PT${Number(minOnly[1])}M`;

  // "1h 30min", "1h30", "1h 30m"
  const hourMin = s.match(/^(\d+)\s*h\s*(?:(\d+)\s*(?:min|m))?/i);
  if (hourMin) {
    const h = Number(hourMin[1]);
    const m = Number(hourMin[2] ?? 0);
    return m > 0 ? `PT${h}H${m}M` : `PT${h}H`;
  }

  // "1h" (apenas hora)
  const hourOnly = s.match(/^(\d+)\s*h/i);
  if (hourOnly) return `PT${Number(hourOnly[1])}H`;

  return "PT24M";
}

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
  const audioText = ep.anime.audio === "DUBLADO" ? "dublado" : "legendado";
  const description = `Assistir ${ep.anime.title} episódio ${ep.number} ${audioText} online em HD no AnimesIce. ${ep.anime.synopsis?.slice(0, 80) ?? ""}`;

  return {
    title,
    description: description.slice(0, 160),
    alternates: { canonical: `/animes/${slug}/${number}` },
    openGraph: {
      title,
      description: description.slice(0, 160),
      type: "video.episode",
      ...(ep.thumbnailUrl ? { images: [{ url: ep.thumbnailUrl }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description.slice(0, 160),
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
    url: `${SITE_URL}/animes/${slug}/${number}`,
    partOfSeries: {
      "@type": "TVSeries",
      name: episode.anime.title,
      url: `${SITE_URL}/animes/${slug}`,
      ...(episode.anime.coverImage ? { image: episode.anime.coverImage } : {}),
      ...(episode.anime.genres?.length ? { genre: episode.anime.genres.map((g) => g.name) } : {}),
      ...(episode.anime.studios?.length ? { productionCompany: episode.anime.studios.map((s) => ({ "@type": "Organization", name: s })) } : {}),
    },
    ...(episode.thumbnailUrl ? { thumbnailUrl: episode.thumbnailUrl } : {}),
    ...(episode.anime.synopsis ? { description: episode.anime.synopsis.slice(0, 200) } : {}),
  };

  // VideoObject — rich result de vídeo no Google. Complementa o TVEpisode
  // acima (que descreve a relação com a série); o VideoObject descreve o
  // vídeo em si (duração, thumbnail, idioma, views).
  const videoJsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: `${episode.anime.title} — Episódio ${episode.number}`,
    description: `Assistir ${episode.anime.title} episódio ${episode.number} ${
      episode.anime.audio === "DUBLADO" ? "dublado" : "legendado"
    } online em HD no AnimesIce.`,
    ...(episode.thumbnailUrl ? { thumbnailUrl: episode.thumbnailUrl } : {}),
    uploadDate: episode.dateModified ?? episode.createdAt,
    duration: toIso8601Duration(episode.duration),
    embedUrl: `${SITE_URL}/animes/${slug}/${number}`,
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: { "@type": "WatchAction" },
      userInteractionCount: episode.views,
    },
    inLanguage: "ja",
    isPartOf: {
      "@type": "TVSeries",
      name: episode.anime.title,
      url: `${SITE_URL}/animes/${slug}`,
      ...(episode.anime.coverImage ? { image: episode.anime.coverImage } : {}),
      ...(episode.anime.genres?.length
        ? { genre: episode.anime.genres.map((g) => g.name) }
        : {}),
    },
  };

  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }} />
      <WatchClient slug={slug} number={number} initialEpisode={episode} />
    </div>
  );
}