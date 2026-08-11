import { NextResponse, type NextRequest } from "next/server";

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
  if (req.nextUrl.pathname.startsWith("/settings/confirm-email")) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/settings/:path*",
    "/biblioteca",
  ],
};
