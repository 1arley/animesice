"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { Avatar } from "@/components/common/Avatar";
import Image from "next/image";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { blur } from "@/lib/blur";
import { formatDate, formatDateTime } from "@/lib/time";
import type { WatchHistoryItem } from "@/types";

export default function MyProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setHistoryLoading(true);
    api.getWatchHistory(1, 6)
      .then((res) => setHistory(res.data ?? []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [user]);

  if (loading) return <div className="flex min-h-screen items-center justify-center">Carregando...</div>;
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm border border-hairline bg-panel p-8 text-center">
          <p className="text-body mb-4 text-mist">Você precisa estar logado para ver seu perfil.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main id="body-content">
        <div className="mx-auto max-w-shelf px-4 py-8">
          <h1 className="shelf-label">Meu perfil</h1>

          <section className="max-w-2xl border border-hairline bg-panel p-6">
            <div className="flex items-center gap-4">
              <Avatar name={user.name ?? user.userName ?? "Usuário"} src={user.avatar} size={72} />
              <div>
                <h2 className="font-display text-display-lg text-ice">{user.userName ?? user.name ?? "Usuário"}</h2>
                {user.userName && user.name && <p className="text-body-sm text-mist">{user.name}</p>}
                <p className="text-body-sm text-mist">Membro desde {formatDate(user.createdAt)}</p>
              </div>
            </div>

            {user.bio && <p className="mt-5 whitespace-pre-line text-body text-mist">{user.bio}</p>}

            <div className="mt-6 flex gap-3">
              <Link href="/settings" className="btn-ice">Editar perfil</Link>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => router.push(`/users/${user.userName ?? user.id}`)}
              >
                Ver como público
              </button>
            </div>
          </section>

          <section className="mt-6 max-w-2xl">
            <h3 className="font-display text-lg text-ice mb-3">Atividade recente</h3>
            <div className="space-y-3">
              {historyLoading && <div className="text-mist">Carregando...</div>}
              {!historyLoading && history.length === 0 && (
                <div className="border border-hairline bg-panel p-4 text-mist">Nenhuma atividade recente.</div>
              )}

              {history.map((h) => (
                <div key={h.episodeId} className="border border-hairline bg-panel p-4">
                  <div className="flex items-center gap-4">
                    <Image src={h.anime.coverImage ?? "/images/animesice-mascot.svg"} alt={h.anime.title || 'cover'} width={48} height={72} sizes="48px" placeholder="blur" blurDataURL={blur.portrait} className="object-cover" quality={80} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <Link href={`/animes/${h.anime.slug}`} className="font-semibold text-ice">{h.anime.title}</Link>
                          <div className="text-mist text-sm">Episódio {h.episode.number} • {formatDateTime(h.watchedAt)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
