"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api, type User } from "@/lib/api";
import { displayName } from "@/lib/displayName";
import { Avatar } from "@/components/common/Avatar";
import type {
  PublicUserProfile,
  CommentItem,
  PublicFavoriteItem,
} from "@/types";

type DashStats = Pick<
  PublicUserProfile["_count"],
  "comments" | "ratings" | "favorites" | "watchHistories"
>;

/**
 * Dashboard "gerencie seu perfil" (estilo ko-fi /Manage): prévia do perfil
 * público + estatísticas + conteúdo recente (curtidos, comentários).
 */
export function ProfileDashboard({ user }: { user: User }) {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [favorites, setFavorites] = useState<PublicFavoriteItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [mal, setMal] = useState(user.myAnimeList ?? "");
  const [malMsg, setMalMsg] = useState("");
  const [malErr, setMalErr] = useState("");
  const [malLoading, setMalLoading] = useState(false);

  const identifier = user.userName ?? user.id;
  const profileUrl = `/users/${user.userName ?? user.id}`;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const prof = await api.getPublicProfile(identifier);
        if (!active) return;
        setStats(prof._count);
      } catch {}
      try {
        const fav = await api.getUserFavorites(identifier, 1, 6);
        if (active) setFavorites(fav.data ?? []);
      } catch {}
      try {
        const cm = await api.getUserComments(identifier, 1, 5);
        if (active) {
          const items = cm.data ?? [];
          setComments(
            items.map((c) => ({
              ...c,
              userId: user.id,
              user: {
                id: user.id,
                name: user.name,
                userName: user.userName,
                avatar: user.avatar,
              },
            })),
          );
        }
      } catch {}
    })();
    return () => {
      active = false;
    };
  }, [identifier, user.avatar, user.id, user.name, user.userName]);

  async function handleMalSave(e: React.FormEvent) {
    e.preventDefault();
    setMalMsg("");
    setMalErr("");
    setMalLoading(true);
    try {
      await api.updateProfileMeta({ myAnimeList: mal });
      setMalMsg("MyAnimeList atualizado.");
    } catch (err) {
      setMalErr(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setMalLoading(false);
    }
  }

  return (
    <section className="border border-hairline bg-panel p-6">
      <div className="mb-4">
        <h2 className="font-display text-display-lg text-snow">
          Seu perfil público
        </h2>
        <p className="text-body-sm text-mist">
          O que os outros veem em{" "}
          <code className="font-mono text-ice">{profileUrl}</code> — sem doações,
          só seu conteúdo.
        </p>
      </div>

      <div className="flex items-center gap-4 border-b border-hairline pb-4">
        <Avatar
          name={displayName(user)}
          src={user.avatar}
          size={64}
        />
        <div className="min-w-0 flex-1">
          <div className="font-display text-display-lg text-ice">
            {user.userName ?? user.name ?? "Usuário"}
          </div>
          {user.userName && user.name && (
            <div className="text-body-sm text-mist">{user.name}</div>
          )}
          {user.bio && (
            <div className="mt-1 line-clamp-2 text-body-sm text-mist">
              {user.bio}
            </div>
          )}
        </div>
        <Link href={profileUrl} className="btn-ice shrink-0">
          Ver perfil público
        </Link>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <DashStat label="Comentários" value={stats?.comments} href={`${profileUrl}?tab=comments`} />
        <DashStat label="Avaliações" value={stats?.ratings} href={`${profileUrl}?tab=ratings`} />
        <DashStat label="Favoritos" value={stats?.favorites} href={`${profileUrl}?tab=favorites`} />
        <DashStat label="Episódios" value={stats?.watchHistories} />
      </dl>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 font-display text-lg text-ice">
            Animes curtidos recentes
          </h3>
          {favorites.length === 0 ? (
            <div className="border border-hairline p-3 text-body-sm text-mist">
              Nenhum favorito ainda.{" "}
              <Link href="/buscar" className="text-ice underline">
                Buscar animes
              </Link>
              .
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {favorites.map((f) => (
                <Link
                  key={f.anime.id}
                  href={`/animes/${f.anime.slug}`}
                  className="shrink-0"
                  title={f.anime.title}
                >
                  <div className="h-24 w-16 overflow-hidden">
                    <Image
                      src={f.anime.coverImage ?? "/images/animesice-mascot.svg"}
                      alt={f.anime.title || "cover"}
                      width={64}
                      height={96}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 font-display text-lg text-ice">
            Comentários recentes
          </h3>
          {comments.length === 0 ? (
            <div className="border border-hairline p-3 text-body-sm text-mist">
              Nenhum comentário ainda. Comente nos episódios para aparecer aqui.
            </div>
          ) : (
            <ul className="space-y-2">
              {comments.map((c) => (
                <li key={c.id} className="border border-hairline p-3">
                  <p className="line-clamp-2 text-body-sm text-mist">{c.content}</p>
                  {c.anime?.title && (
                    <Link
                      href={`/animes/${c.anime.slug}`}
                      className="mt-1 block font-mono text-caption text-ice"
                    >
                      {c.anime.title}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <form onSubmit={handleMalSave} className="mt-6 border-t border-hairline pt-4">
        <label className="block">
          <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
            Usuário MyAnimeList (opcional)
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={mal}
              onChange={(e) =>
                setMal(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9_-]/g, "")
                    .slice(0, 20),
                )
              }
              placeholder="ex: iarley"
              className="field max-w-xs"
            />
            <button type="submit" disabled={malLoading} className="btn-ice">
              {malLoading ? "Salvando..." : "Salvar"}
            </button>
            {mal && (
              <a
                href={`https://myanimelist.net/profile/${encodeURIComponent(mal)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-caption text-ice underline decoration-hairline"
              >
                myanimelist.net/profile/{mal}
              </a>
            )}
          </div>
        </label>
        <p className="mt-2 text-caption text-mist/70">
          Aparece no seu perfil público como link externo.
        </p>
        {malMsg && (
          <p className="mt-2 text-body-sm text-ice">{malMsg}</p>
        )}
        {malErr && (
          <p className="mt-2 text-body-sm text-signal">{malErr}</p>
        )}
      </form>
    </section>
  );
}

function DashStat({
  label,
  value,
  href,
}: {
  label: string;
  value?: number;
  href?: string;
}) {
  const body = (
    <>
      <dt className="font-mono text-caption uppercase text-mist">{label}</dt>
      <dd className="font-display text-body font-semibold text-ice">
        {value ?? "—"}
      </dd>
    </>
  );
  if (!href) {
    return <div>{body}</div>;
  }
  return <Link href={href}>{body}</Link>;
}
