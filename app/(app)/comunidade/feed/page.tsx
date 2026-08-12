"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FeedComposer } from "@/components/social/FeedComposer";
import { FeedPost } from "@/components/social/FeedPost";
import { FeedActivityItem } from "@/components/social/FeedActivityItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageTitle } from "@/components/ui/PageTitle";
import type { FeedItem, SocialPost } from "@/types";

const LIMIT = 20;
type Scope = "global" | "following";

const SCOPE_TABS: { key: Scope; label: string }[] = [
  { key: "global", label: "Global" },
  { key: "following", label: "Seguindo" },
];

export default function FeedPage() {
  const { user } = useAuth();
  const [scope, setScope] = useState<Scope>("global");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(
    async (targetPage: number, reset: boolean) => {
      setLoading(true);
      setError(false);
      try {
        const res = await api.getFeed(targetPage, LIMIT, scope);
        setItems((prev) => (reset ? res.data ?? [] : [...prev, ...(res.data ?? [])]));
        setPage(targetPage);
        setTotalPages(res.meta?.totalPages ?? 1);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [scope],
  );

  useEffect(() => {
    load(1, true);
  }, [load]);

  function handlePosted(post: SocialPost) {
    if (scope === "following") {
      // O feed "Seguindo" não inclui o próprio usuário — voltar ao Global
      // (recarrega e o post novo aparece, pois é o mais recente).
      setScope("global");
      return;
    }
    setItems((prev) => [{ type: "post", post }, ...prev]);
  }

  function handleDeleted(id: string) {
    setItems((prev) => prev.filter((i) => i.type !== "post" || i.post.id !== id));
  }

  function handleShared(id: string, shareCount: number) {
    setItems((prev) =>
      prev.map((i) =>
        i.type === "post" && i.post.id === id
          ? { ...i, post: { ...i.post, shareCount } }
          : i,
      ),
    );
  }

  const followingTab = scope === "following";
  const needsLogin = followingTab && !user;

  // Agrupa itens de atividade consecutivos em um único container com divisórias
  // — evita bordas duplicadas entre linhas e dá chaves estáveis.
  const groups = useMemo(() => {
    const result: Array<
      | { kind: "post"; item: Extract<FeedItem, { type: "post" }> }
      | { kind: "activity"; items: Extract<FeedItem, { type: "activity" }>[] }
    > = [];
    for (const item of items) {
      const last = result[result.length - 1];
      if (item.type === "post") {
        result.push({ kind: "post", item });
      } else if (last && last.kind === "activity") {
        last.items.push(item);
      } else {
        result.push({ kind: "activity", items: [item] });
      }
    }
    return result;
  }, [items]);

  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <PageTitle text="Feed da comunidade" badge="o que o pessoal anda vendo" />

      {/* Tabs: Global | Seguindo */}
      <div className="mt-4 flex items-center gap-1 border-b border-hairline">
        {SCOPE_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setScope(tab.key)}
            aria-pressed={scope === tab.key}
            className={`border-b-2 px-4 py-2 font-mono text-body-sm uppercase tracking-wider transition-colors ${
              scope === tab.key
                ? "border-ice text-ice"
                : "border-transparent text-mist hover:text-snow"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6 max-w-2xl space-y-5">
        <FeedComposer onPosted={handlePosted} />

        {needsLogin ? (
          <EmptyState
            text="Entre para ver o feed de quem você segue."
            action={
              <Link href="/login" className="btn-ice">
                Entrar
              </Link>
            }
          />
        ) : error ? (
          <EmptyState text="Não foi possível carregar o feed. Tente novamente." />
        ) : loading && items.length === 0 ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-32" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            text={
              followingTab
                ? "Você ainda não segue ninguém — ou eles ainda não postaram. Explore a seção Usuários!"
                : "Nenhuma atividade por aqui ainda. Seja o primeiro a postar!"
            }
            action={
              followingTab ? (
                <Link href="/comunidade/usuarios" className="btn-ghost">
                  Encontrar usuários
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-5">
            {groups.map((group) =>
              group.kind === "post" ? (
                <FeedPost
                  key={`post-${group.item.post.id}`}
                  post={group.item.post}
                  onDelete={handleDeleted}
                  onShare={handleShared}
                />
              ) : (
                <div
                  key={`activity-${group.items[0].event.createdAt}-${group.items.length}`}
                  className="divide-y divide-hairline border-y border-hairline"
                >
                  {group.items.map((item) => (
                    <FeedActivityItem
                      key={`${item.event.type}-${item.event.createdAt}-${item.user.id}`}
                      event={item.event}
                      user={item.user}
                    />
                  ))}
                </div>
              ),
            )}

            {page < totalPages && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => load(page + 1, false)}
                  disabled={loading}
                  className="btn-ghost"
                >
                  {loading ? "Carregando…" : "Carregar mais"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
