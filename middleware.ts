import { NextResponse, type NextRequest } from "next/server";
import { ASSET_URL, SITE_URL } from "@/lib/site";

/**
 * Middleware para rotas do Next.js.
 *
 * NOTA DE SEGURANÇA:
 * Cookies manipuláveis no client-side (como `role`) não fornecem garantia
 * de autorização e criam uma falsa sensação de segurança se usados no Edge/Middleware.
 *
 * A autorização das rotas administrativas (`/admin/**`) e protegidas (`/settings`, `/biblioteca`)
 * é delegada com segurança para:
 * 1. O Client Component `AdminGate` (ou validação de contexto/SWR no client), que verifica a sessão do usuário via API segura.
 * 2. As rotas de API do Backend, que re-validam obrigatoriamente os tokens em cookies `httpOnly` / JWT em cada request.
 *
 * Mantemos o middleware limpo e performático sem verificações ingênuas baseadas em cookies não-httpOnly.
 */
export async function middleware(req: NextRequest) {
  // O domínio da Vercel continua servindo os chunks referenciados por
  // `assetPrefix`, mas não deve oferecer uma segunda cópia navegável do site.
  // A comparação vem das URLs configuráveis, não de uma lista de hosts.
  const requestHost = req.headers.get("host")?.split(":")[0];
  const assetHost = new URL(ASSET_URL).hostname;
  const canonical = new URL(SITE_URL);
  if (requestHost === assetHost && assetHost !== canonical.hostname) {
    const destination = new URL(req.nextUrl.pathname + req.nextUrl.search, canonical);
    return NextResponse.redirect(destination, 308);
  }

  if (req.nextUrl.pathname.startsWith("/settings/confirm-email")) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|assets/|icons/|images/|favicon.ico|api/).*)"],
};
