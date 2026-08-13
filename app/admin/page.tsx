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
    return (
      <div className="admin-empty">Carregando estatísticas...</div>
    );
  }

  if (error) {
    return (
      <div className="mt-2 border border-signal/40 bg-signal/10 p-4 text-body-sm text-signal">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: "Usuários", value: stats.totals.users, href: "/admin/usuarios", weekly: `+${stats.weekly.newUsers} esta semana`, icon: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a3 3 0 10-3-3 3 3 0 003 3z" },
    { label: "Animes", value: stats.totals.animes, href: "/admin/catalogo", icon: "M4 6a2 2 0 012-2h2v12H6a2 2 0 01-2-2V6zM10 4h4v12h-4zM16 4h2a2 2 0 012 2v8a2 2 0 01-2 2h-2V4z" },
    { label: "Episódios", value: stats.totals.episodes, href: "/admin/catalogo", icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
    { label: "Comentários", value: stats.totals.comments, weekly: `+${stats.weekly.newComments} esta semana`, icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
    { label: "Posts", value: stats.totals.posts, href: "/admin/posts", weekly: `+${stats.weekly.newPosts} esta semana`, icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-5-9l5 5m0 0l-3.5 3.5M17 7l1.5-1.5" },
    { label: "Avaliações", value: stats.totals.ratings, icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.519-4.674z" },
    { label: "Favoritos", value: stats.totals.favorites, icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
    { label: "Histórico", value: stats.totals.watchHistories, icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  const modCards = [
    { label: "Denúncias Pendentes", value: stats.moderation.pendingReports, href: "/admin/moderacao", alert: stats.moderation.pendingReports > 0, icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
    { label: "Usuários Suspensos", value: stats.moderation.suspendedUsers, href: "/admin/usuarios", alert: false, icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" },
    { label: "Feedbacks Pendentes", value: stats.moderation.pendingFeedbacks, href: "/admin/feedbacks", alert: stats.moderation.pendingFeedbacks > 0, icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" },
    { label: "Pedidos Pendentes", value: stats.moderation.pendingAnimeRequests, href: "/admin/pedidos", alert: stats.moderation.pendingAnimeRequests > 0, icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  ];

  return (
    <>
      <div className="mb-2 flex items-center gap-3">
        <h1 className="font-display text-display-xl text-snow">Dashboard</h1>
        <span className="badge badge-muted">
          <span className="badge-dot bg-ice" />
          {user?.role}
        </span>
      </div>
      <p className="text-body-sm text-mist">
        Visão geral · Logado como <span className="text-ice">{user?.email}</span>
      </p>

      <section className="mt-6">
        <h2 className="shelf-label">Estatísticas gerais</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="admin-stat">
              {card.href ? (
                <Link href={card.href} className="block">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-caption uppercase tracking-wider text-mist">
                      {card.label}
                    </p>
                    <svg className="h-4 w-4 text-mist/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={card.icon} />
                    </svg>
                  </div>
                  <p className="mt-1.5 font-display text-display-lg text-snow tabular-nums">
                    {card.value.toLocaleString("pt-BR")}
                  </p>
                  {card.weekly && (
                    <p className="mt-0.5 text-caption text-ice/60">{card.weekly}</p>
                  )}
                </Link>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-caption uppercase tracking-wider text-mist">
                      {card.label}
                    </p>
                    <svg className="h-4 w-4 text-mist/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={card.icon} />
                    </svg>
                  </div>
                  <p className="mt-1.5 font-display text-display-lg text-snow tabular-nums">
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {modCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className={`admin-card ${card.alert ? "admin-card-alert" : ""} p-4`}
            >
              <div className="flex items-center justify-between">
                <p className="font-mono text-caption uppercase tracking-wider text-mist">
                  {card.label}
                </p>
                {card.alert && <span className="badge-dot bg-signal animate-blink" />}
              </div>
              <p className={`mt-1.5 font-display text-display-lg tabular-nums ${
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
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/catalogo" className="btn-ice">Gerenciar Catálogo</Link>
          <Link href="/admin/usuarios" className="btn-ice">Gerenciar Usuários</Link>
          <Link href="/admin/moderacao" className="btn-ghost">Moderação</Link>
          <Link href="/admin/config" className="btn-ghost">Configurações</Link>
        </div>
      </section>
    </>
  );
}
