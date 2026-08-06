import { NextResponse, type NextRequest } from "next/server";
import { isPrivilegedRole } from "@/lib/role";

/**
 * Server-side gate for /admin/**.
 * Backend must set a readable (non-httpOnly) cookie `role` alongside the
 * httpOnly auth cookie on login/refresh. We deny early here — the form DOM
 * is never shipped to non-admins. True authority remains the backend
 * (endpoints re-validate via the httpOnly auth cookie).
 */
export async function middleware(req: NextRequest) {
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
  matcher: ["/admin/:path*"],
};
