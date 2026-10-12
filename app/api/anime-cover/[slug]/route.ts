import { API_URL } from "@/lib/api-server";

// Segment config precisa de literal — Next aborta o build com expressão.
export const revalidate = 604800;

const CACHE_SECONDS = revalidate;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAL_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const MAL_FORMAT: Record<string, string> = {
  TV: "TV",
  MOVIE: "Movie",
  OVA: "OVA",
  ONA: "ONA",
  SPECIAL: "Special",
  MUSIC: "Music",
};

type AnimeLookup = {
  title?: string;
  coverImage?: string | null;
  bannerImage?: string | null;
  malId?: number | null;
  format?: string | null;
  year?: number | null;
};

type MalSearchItem = {
  id?: number;
  name?: string;
  payload?: { media_type?: string; start_year?: number };
};

type FetchedImage = { body: ArrayBuffer; contentType: string };

function failed(status: number) {
  return new Response(null, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function normalizeTitle(title: string) {
  return title
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function chooseMalId(items: MalSearchItem[], anime: AnimeLookup) {
  const query = normalizeTitle(
    (anime.title ?? "").replace(/\s+(dublado|legendado)$/i, ""),
  );
  if (!query) return null;

  const exactMatches = items.filter(
    (item) => item.id && item.name && normalizeTitle(item.name) === query,
  );
  let matches = exactMatches;
  if (!matches.length) {
    matches = items.filter(
      (item) =>
        item.id &&
        item.name &&
        normalizeTitle(item.name).startsWith(`${query} `),
    );
  }

  const mediaType = anime.format ? MAL_FORMAT[anime.format] : undefined;
  if (mediaType) {
    const sameFormat = matches.filter(
      (item) => item.payload?.media_type === mediaType,
    );
    if (sameFormat.length) matches = sameFormat;
    else if (
      !exactMatches.length &&
      matches.some((item) => item.payload?.media_type)
    ) {
      return null;
    }
  }

  if (anime.year) {
    const sameYear = matches.filter(
      (item) => item.payload?.start_year === anime.year,
    );
    if (sameYear.length) matches = sameYear;
    else if (
      !exactMatches.length &&
      matches.some(
        (item) => item.payload?.start_year && item.payload.start_year > 0,
      )
    ) {
      return null;
    }
  }

  return matches.length === 1 ? matches[0].id ?? null : null;
}

async function findMalId(anime: AnimeLookup) {
  if (Number.isSafeInteger(anime.malId) && (anime.malId ?? 0) > 0) {
    return anime.malId as number;
  }

  const title = (anime.title ?? "")
    .replace(/\s+(dublado|legendado)$/i, "")
    .trim();
  if (!title) return null;

  const searchUrl = new URL("https://myanimelist.net/search/prefix.json");
  searchUrl.search = new URLSearchParams({
    type: "anime",
    keyword: title,
    v: "1",
  }).toString();

  const response = await fetch(searchUrl, {
    headers: { "user-agent": MAL_USER_AGENT, accept: "application/json" },
    next: { revalidate: CACHE_SECONDS },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;

  const result = (await response.json()) as {
    categories?: Array<{ type?: string; items?: MalSearchItem[] }>;
  };
  const items = (result.categories ?? [])
    .filter((category) => category.type === "anime")
    .flatMap((category) => category.items ?? []);
  return chooseMalId(items, anime);
}

function extractMalCover(html: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const tag = tags.find((value) => /\bproperty=["']og:image["']/i.test(value));
  const raw = tag?.match(/\bcontent=["']([^"']+)["']/i)?.[1];
  if (!raw) return null;

  try {
    const url = new URL(raw.replace(/&amp;/g, "&"));
    return url.protocol === "https:" &&
      url.hostname === "cdn.myanimelist.net" &&
      url.pathname.startsWith("/images/anime/")
      ? url
      : null;
  } catch {
    return null;
  }
}

function isBlogCoverUrl(url: URL) {
  const isBlogHost =
    url.hostname === "meusanimes.blog" ||
    url.hostname.endsWith(".meusanimes.blog");
  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    !url.port &&
    isBlogHost &&
    url.pathname.startsWith("/wp-content/uploads/") &&
    /\.(?:jpe?g|png|webp|avif|gif)$/i.test(url.pathname)
  );
}

async function fetchImage(
  url: URL,
  isAllowedUrl: (url: URL) => boolean,
): Promise<FetchedImage | null> {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": MAL_USER_AGENT, accept: "image/*" },
      redirect: "manual",
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(10_000),
    });
    const contentType = response.headers
      .get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();
    const contentLength = Number(response.headers.get("content-length"));

    if (
      !response.ok ||
      !isAllowedUrl(new URL(response.url)) ||
      !["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"].includes(
        contentType ?? "",
      ) ||
      (contentLength > 0 && contentLength > MAX_IMAGE_BYTES)
    ) {
      return null;
    }

    const body = await response.arrayBuffer();
    return body.byteLength > 0 && body.byteLength <= MAX_IMAGE_BYTES
      ? { body, contentType: contentType as string }
      : null;
  } catch {
    return null;
  }
}

function imageResponse(image: FetchedImage) {
  return new Response(image.body, {
    headers: {
      "Content-Type": image.contentType,
      "Content-Length": String(image.body.byteLength),
      "Cache-Control":
        "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) return failed(400);

  try {
    const animeResponse = await fetch(
      `${API_URL}/anime/${encodeURIComponent(slug)}`,
      { next: { revalidate: CACHE_SECONDS } },
    );
    if (!animeResponse.ok) {
      return failed(animeResponse.status === 404 ? 404 : 502);
    }

    const anime = (await animeResponse.json()) as AnimeLookup;
    const requestUrl = new URL(request.url);
    if (requestUrl.searchParams.has("source")) {
      const source = requestUrl.searchParams.get("source") ?? "";
      let blogUrl: URL;
      try {
        blogUrl = new URL(source);
      } catch {
        return failed(400);
      }
      if (!isBlogCoverUrl(blogUrl)) {
        return failed(400);
      }

      let isKnownImage =
        source === anime.coverImage || source === anime.bannerImage;
      const episodeNumber = requestUrl.searchParams.get("episode");
      if (!isKnownImage && episodeNumber !== null) {
        if (!/^[1-9]\d*$/.test(episodeNumber)) return failed(400);
        const episodeResponse = await fetch(
          `${API_URL}/episode/${encodeURIComponent(slug)}/${episodeNumber}`,
          { next: { revalidate: CACHE_SECONDS } },
        );
        if (!episodeResponse.ok) {
          return failed(episodeResponse.status === 404 ? 404 : 502);
        }
        const episode = (await episodeResponse.json()) as {
          thumbnailUrl?: string | null;
        };
        isKnownImage = source === episode.thumbnailUrl;
      }
      if (!isKnownImage) return failed(400);

      const blogImage = await fetchImage(blogUrl, isBlogCoverUrl);
      if (blogImage) return imageResponse(blogImage);
    }

    const malId = await findMalId(anime);
    if (!malId) return failed(404);

    const malPage = await fetch(`https://myanimelist.net/anime/${malId}`, {
      headers: { "user-agent": MAL_USER_AGENT, accept: "text/html" },
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(10_000),
    });
    if (!malPage.ok) return failed(502);

    const coverUrl = extractMalCover(await malPage.text());
    if (!coverUrl) return failed(502);

    const malImage = await fetchImage(
      coverUrl,
      (url) =>
        url.protocol === "https:" &&
        url.hostname === "cdn.myanimelist.net" &&
        url.pathname.startsWith("/images/anime/"),
    );
    return malImage ? imageResponse(malImage) : failed(502);
  } catch {
    return failed(502);
  }
}
