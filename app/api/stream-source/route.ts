import { NextResponse, type NextRequest } from "next/server";
import { serverStreamSourceAsync } from "@/lib/api-server";

const ANIME_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESOLVED_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=300";
const NO_STORE = "no-store";

export async function GET(request: NextRequest) {
  const animeSlug = request.nextUrl.searchParams.get("anime") ?? "";
  const episodeParam = request.nextUrl.searchParams.get("episode") ?? "";
  const episodeNumber = Number(episodeParam);
  // Forced refresh is intentionally not exposed through this public
  // same-origin route: without authentication it permits unbounded
  // re-extraction loops. Use the protected backend operation instead.
  if (request.nextUrl.searchParams.get("refresh") === "1") {
    return NextResponse.json(
      { message: "Refresh não disponível neste endpoint." },
      { status: 400, headers: { "Cache-Control": NO_STORE } },
    );
  }

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

  const result = await serverStreamSourceAsync(animeSlug, episodeNumber).catch(
    () => null,
  );
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
