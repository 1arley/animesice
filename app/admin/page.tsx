"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { isPrivileged } from "@/lib/role";
import type { AdminDashboardStats } from "@/lib/api";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPrivileged(user)) return;
    api
      .adminGetDashboardStats()
      .then((data) => setStats(data))
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Erro ao carregar estatísticas."),
      )
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <p className="text-body-sm text-mist">Carregando estatísticas...</p>;
  }

  if (error) {
    return (
      <div className="border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: "Usuários", value: stats.totals.users, href: "/admin/usuarios", weekly: `+${stats.weekly.newUsers} esta semana` },
    { label: "Animes", value: stats.totals.animes, href: "/admin/catalogo" },
    { label: "Episódios", value: stats.totals.episodes, href: "/admin/catalogo" },
    { label: "Comentários", value: stats.totals.comments, weekly: `+${stats.weekly.newComments} esta semana` },
    { label: "Posts", value: stats.totals.posts, href: "/admin/posts", weekly: `+${stats.weekly.newPosts} esta semana` },
    { label: "Avaliações", value: stats.totals.ratings },
    { label: "Favoritos", value: stats.totals.favorites },
    { label: "Histórico", value: stats.totals.watchHistories },
  ];

  const modCards = [
    { label: "Denúncias Pendentes", value: stats.moderation.pendingReports, href: "/admin/moderacao", alert: stats.moderation.pendingReports > 0 },
    { label: "Usuários Suspensos", value: stats.moderation.suspendedUsers, href: "/admin/usuarios" },
    { label: "Feedbacks Pendentes", value: stats.moderation.pendingFeedbacks, href: "/admin/feedbacks", alert: stats.moderation.pendingFeedbacks > 0 },
    { label: "Pedidos Pendentes", value: stats.moderation.pendingAnimeRequests, href: "/admin/pedidos", alert: stats.moderation.pendingAnimeRequests > 0 },
  ];

  return (
    <>
      <h1 className="font-display text-display-xl text-snow">Dashboard</h1>
      <p className="mt-1 text-body-sm text-mist">
        Visão geral do site · Logado como <span className="text-ice">{user?.email}</span> ({user?.role})
      </p>

      <section className="mt-6">
        <h2 className="shelf-label">Estatísticas gerais</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
 className={`border border-hairline bg-panel p-4 ${card.href ? "transition-colors hover:border-ice/40" : ""}`}
            >
              {card.href ? (
                <Link href={card.href}>
                  <p className="font-mono text-caption uppercase tracking-wider text-mist">
                    {card.label}
                  </p>
                  <p className="mt-1 font-display text-display-lg text-snow tabular-nums">
                    {card.value.toLocaleString("pt-BR")}
                  </p>
                  {card.weekly && (
                    <p className="mt-0.5 text-caption text-ice/60">{card.weekly}</p>
                  )}
                </Link>
              ) : (
                <>
                  <p className="font-mono text-caption uppercase tracking-wider text-mist">
                    {card.label}
                  </p>
                  <p className="mt-1 font-display text-display-lg text-snow tabular-nums">
                    {card.value.toLocaleString("pt-BR")}
                  </p>
                  {card.weekly && (
                    <p className="mt-0.5 text-caption text-ice/60">{card.weekly}</p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="shelf-label">Moderação</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {modCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className={`border bg-panel p-4 transition-colors hover:border-ice/40 ${
                card.alert ? "border-signal/60" : "border-hairline"
              }`}
            >
              <p className="font-mono text-caption uppercase tracking-wider text-mist">
                {card.label}
              </p>
              <p className={`mt-1 font-display text-display-lg tabular-nums ${
                card.alert ? "text-signal" : "text-snow"
              }`}>
                {card.value.toLocaleString("pt-BR")}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="shelf-label">Atalhos</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/admin/catalogo" className="btn-ice">Gerenciar Catálogo</Link>
          <Link href="/admin/usuarios" className="btn-ice">Gerenciar Usuários</Link>
          <Link href="/admin/moderacao" className="btn-ghost">Moderação</Link>
          <Link href="/admin/config" className="btn-ghost">Configurações do Site</Link>
        </div>
      </section>
    </>
  );
}