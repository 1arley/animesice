/**
 * Regra de papel admin: ADMIN ou SUPERADMIN.
 * Fonte única para middleware (cookie), Footer, SiteNav e páginas /admin/**.
 */

export type Role = "USER" | "ADMIN" | "SUPERADMIN";

export function isPrivilegedRole(role: string | null | undefined): boolean {
  return role === "ADMIN" || role === "SUPERADMIN";
}

export function isPrivileged(user: { role?: string } | null | undefined): boolean {
  return isPrivilegedRole(user?.role);
}
