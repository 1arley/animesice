import { NextResponse, type NextRequest } from "next/server";
import { API_URL, serverStreamSourceAsync } from "@/lib/api-server";

const ANIME_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESOLVED_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=300";
const NO_STORE = "no-store";

export async function GET(request: NextRequest) {
  const animeSlug = request.nextUrl.searchParams.get("anime") ?? "";
  const episodeParam = request.nextUrl.searchParams.get("episode") ?? "";
  const episodeNumber = Number(episodeParam);
  const refresh = request.nextUrl.searchParams.get("refresh") === "1";

  if (
    !ANIME_SLUG.test(animeSlug) ||
    !/^\d+$/.test(episodeParam) ||
    !Number.isSafeInteger(episodeNumber) ||
    episodeNumber < 1
  ) {
    return NextResponse.json(
      { message: "Anime ou episódio inválido." },
      { status: 400, headers: { "Cache-Control": NO_STORE } },
    );
  }

  const result = refresh
    ? await fetch(
        `${API_URL}/stream/source?anime=${encodeURIComponent(animeSlug)}&episode=${episodeNumber}&refresh=1`,
        {
          headers: { cookie: request.headers.get("cookie") ?? "" },
          cache: "no-store",
        },
      )
        .then(async (res) => {
          const data = await res.json().catch(() => null);
          return res.ok ? data : null;
        })
        .catch(() => null)
    : await serverStreamSourceAsync(animeSlug, episodeNumber).catch(() => null);
  if (!result) {
    return NextResponse.json(
      { message: "Não foi possível obter o vídeo deste episódio." },
      { status: 502, headers: { "Cache-Control": NO_STORE } },
    );
  }

  const resolved = "src" in result;
  return NextResponse.json(result, {
    status: resolved ? 200 : 202,
    headers: {
      "Cache-Control": resolved ? RESOLVED_CACHE_CONTROL : NO_STORE,
    },
  });
}
