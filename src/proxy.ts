import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Padroniza slugs de temporada para o formato numérico.
 */
export function proxy(request: NextRequest) {
  const match = request.nextUrl.pathname.match(
    /^\/animes\/(.+?)-(?:([0-9]+)(?:st|nd|rd|th)-season|season-([0-9]+))(-dublado)?(\/.*)?$/,
  );
  if (match) {
    const base = match[1];
    const num = match[2] || match[3];
    const audio = match[4] || "";
    const rest = match[5] || "";
    const url = request.nextUrl.clone();
    url.pathname = `/animes/${base}-${num}${audio}${rest}`;
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/animes/:path*",
};
