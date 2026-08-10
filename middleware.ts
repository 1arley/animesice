import { NextResponse, type NextRequest } from "next/server";
import { isPrivilegedRole } from "@/lib/role";

/**
 * Server-side gate para rotas autenticadas (/admin/**, /settings, /biblioteca).
 * Backend deve setar um cookie `role` legível (não-httpOnly) junto do cookie
 * httpOnly de auth no login/refresh. Negamos cedo aqui — a authority final
 * continua no backend (endpoints re-validam via cookie httpOnly).
 *
 * /settings/confirm-email fica de fora: o link chega por email e pode ser
 * aberto sem sessão ativa.
 */
export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/settings/confirm-email")) {
    return NextResponse.next();
  }

  const role = req.cookies.get("role")?.value;

  if (!isPrivilegedRole(role)) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
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
