import { NextResponse, type NextRequest } from "next/server";
import { ASSET_URL, SITE_URL } from "@/lib/site";

/**
 * NOTA DE SEGURANÇA:
 * Cookies manipuláveis no client-side (como `role`) não fornecem garantia
 * de autorização. As rotas protegidas validam a sessão na API/backend.
 */
export function proxy(req: NextRequest) {
  // O domínio de assets serve chunks, mas não deve oferecer uma cópia do site.
  const requestHost = req.headers.get("host")?.split(":")[0];
  const assetHost = new URL(ASSET_URL).hostname;
  const canonical = new URL(SITE_URL);
  if (requestHost === assetHost && assetHost !== canonical.hostname) {
    const destination = new URL(req.nextUrl.pathname + req.nextUrl.search, canonical);
    return NextResponse.redirect(destination, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|assets/|icons/|images/|favicon.ico|api/).*)"],
};
