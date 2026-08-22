import { FeedView } from "@/components/social/FeedView";
import { serverFetchJson } from "@/lib/api-server";
import type { FeedItem, Paginated } from "@/types";

const LIMIT = 20;

export const revalidate = 30;

/**
 * Feed da comunidade — primeira página renderizada no servidor (ISR 30s),
 * então o mobile não espera o fetch pós-hidratação (LCP imediato). A
 * paginação e o escopo "Seguindo" continuam client-side no FeedView.
 */
export default async function FeedPage() {
  const data = await serverFetchJson<Paginated<FeedItem>>(
    `/social/feed?page=1&limit=${LIMIT}&scope=global`,
    { cache: "force-cache", next: { revalidate: 30, tags: ["community-feed"] } },
  );

  return (
    <FeedView
      initialItems={data?.data ?? []}
      initialTotalPages={data?.meta?.totalPages ?? 1}
    />
  );
}
