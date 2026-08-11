/**
 * Nome de exibição com fallback único — usado pela navbar (SiteNav),
 * AuthButtons e página de configurações.
 */

export interface DisplayNameUser {
  userName: string | null;
  name: string | null;
}

export function displayName(user: DisplayNameUser): string {
  return user.userName || user.name || "Usuário";
}