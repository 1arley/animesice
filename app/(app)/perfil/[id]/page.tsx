import { redirect } from "next/navigation";

/**
 * Rota legada: /perfil/:id era a página pública antiga de perfil.
 * O sistema de perfis (rede social) agora vive em /users/:userName e o
 * backend aceita tanto o userName quanto o id em /users/:identifier —
 * então este redirect é instantâneo, sem fetch. A canonicalização
 * (id → userName) é responsabilidade da própria página /users.
 */
export default async function LegacyProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/users/${encodeURIComponent(id)}`);
}
