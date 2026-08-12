"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type {
  PublicUserProfile,
  CommentItem,
  UserRating,
  PublicFavoriteItem,
  PublicAnimeListItem,
  WatchStatus,
  ReportReason,
} from "@/types";
import { CommentRow } from "@/components/common/CommentSection";
import { Modal } from "@/components/common/Modal";

const STATUS_LABELS: Record<string, string> = {
  WATCHING: "Assistindo",
  COMPLETED: "Completo",
  PLANNING: "Planejado",
  ON_HOLD: "Pausado",
  DROPPED: "Dropado",
};

const STATUS_FILTERS: Array<WatchStatus | "ALL"> = [
  "ALL",
  "WATCHING",
  "COMPLETED",
  "PLANNING",
  "ON_HOLD",
  "DROPPED",
];

const REPORT_REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: "SPAM", label: "SPAM" },
  { value: "HARASSMENT", label: "ASSÉDIO" },
  { value: "NSFW", label: "NSFW" },
  { value: "SPOILER", label: "SPOILER" },
  { value: "ILLEGAL", label: "ILLEGAL" },
  { value: "OTHER", label: "OUTRO" },
];

type Tab = "overview" | "comments" | "ratings" | "favorites" | "biblioteca";

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ userName: string }>;
}) {
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [error, setError] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsHasMore, setCommentsHasMore] = useState(false);

  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [ratingsPage, setRatingsPage] = useState(1);
  const [ratingsHasMore, setRatingsHasMore] = useState(false);

  const [favorites, setFavorites] = useState<PublicFavoriteItem[]>([]);
  const [favoritesPage, setFavoritesPage] = useState(1);
  const [favoritesHasMore, setFavoritesHasMore] = useState(false);

  const [list, setList] = useState<PublicAnimeListItem[]>([]);
  const [listStatus, setListStatus] = useState<WatchStatus | "ALL">("ALL");
  const [listPage, setListPage] = useState(1);
  const [listHasMore, setListHasMore] = useState(false);

  const [loadingList, setLoadingList] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>("SPAM");
  const [reportNotes, setReportNotes] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { userName } = await params;
        if (!userName) throw new Error("missing userName");
        const prof = await api.getPublicProfile(userName);
        if (cancelled) return;
        setProfile(prof);
        // URL canônica: /users/:userName. Quando o perfil tem apelido e a
        // URL veio por id (ou por um apelido antigo), redireciona para o
        // apelido atual — sem loop, pois a próxima carga usa o userName.
        if (prof.userName && prof.userName !== userName) {
          router.replace(`/users/${prof.userName}`);
        }
      } catch (e) {
        if (!cancelled) setError(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  useEffect(() => {
    if (!profile) return;
    const uid = profile.id;
    const withAuthor = (list: CommentItem[]): CommentItem[] =>
      list.map((c) => ({
        ...c,
        userId: profile.id,
        user: {
          id: profile.id,
          name: profile.name,
          userName: profile.userName,
          avatar: profile.avatar,
        },
      }));
    async function load() {
      setLoadingList(true);
      try {
        if (activeTab === "comments") {
          const res = await api.getUserComments(uid, 1, 20);
          setComments(withAuthor(res.data ?? []));
          setCommentsPage(1);
          setCommentsHasMore((res.data ?? []).length >= 20);
        } else if (activeTab === "ratings") {
          const res = await api.getUserRatings(uid, 1, 20);
          setRatings(res.data ?? []);
          setRatingsPage(1);
          setRatingsHasMore((res.data ?? []).length >= 20);
        } else if (activeTab === "favorites") {
          const res = await api.getUserFavorites(uid, 1, 24);
          setFavorites(res.data ?? []);
          setFavoritesPage(1);
          setFavoritesHasMore((res.data ?? []).length >= 24);
        } else if (activeTab === "biblioteca") {
          const res = await api.getUserAnimeList(
            uid,
            1,
            24,
            listStatus === "ALL" ? undefined : listStatus,
          );
          setList(res.data ?? []);
          setListPage(1);
          setListHasMore((res.data ?? []).length >= 24);
        }
      } catch (e) {
        // ignore list errors
      } finally {
        setLoadingList(false);
      }
    }
    load();
  }, [activeTab, profile, listStatus]);

  if (error)
    return (
      <div className="mx-auto max-w-shelf px-4 py-8 text-mist">
        Perfil não encontrado.
      </div>
    );
  if (!profile)
    return (
      <div className="mx-auto max-w-shelf px-4 py-8 text-mist">
        Carregando...
      </div>
    );

  const malUrl = profile.myAnimeList
    ? `https://myanimelist.net/profile/${encodeURIComponent(profile.myAnimeList)}`
    : null;

  async function handleReportSubmit() {
    if (!profile) return;
    const uid = profile.id;
    setReportSubmitting(true);
    try {
      await api.createReport({
        targetType: "USER",
        targetId: uid,
        reason: reportReason,
        notes: reportNotes || undefined,
      });
      setReportSubmitting(false);
      setReportOpen(false);
      setReportNotes("");
      window.alert("Denúncia enviada. Obrigado.");
    } catch (e) {
      setReportSubmitting(false);
      window.alert(
        e instanceof ApiError ? e.message : "Erro ao enviar denúncia.",
      );
    }
  }

  return (
    <>
      <div className="mx-auto max-w-shelf px-4 py-8">
        <section className="max-w-2xl border border-hairline bg-panel p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden bg-hairline font-mono text-display-lg text-mist">
              {profile.avatar ? (
                <Image
                  src={profile.avatar}
                  alt={profile.userName ?? profile.name ?? "avatar"}
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              ) : (
                (profile.userName ?? profile.name ?? "?")[0]?.toUpperCase()
              )}
            </div>
            <div>
              <h1 className="font-display text-display-lg text-ice">
                {profile.userName ?? profile.name ?? "Usuário"}
              </h1>
              {profile.userName && profile.name && (
                <p className="text-body-sm text-mist">{profile.name}</p>
              )}
              <p className="text-body-sm text-mist">
                Membro desde{" "}
                {new Date(profile.createdAt).toLocaleDateString("pt-BR")}
              </p>
              {malUrl && (
                <a
                  href={malUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block font-mono text-body-sm text-ice underline decoration-hairline underline-offset-2 hover:text-snow"
                >
                  MyAnimeList: {profile.myAnimeList}
                </a>
              )}
            </div>
          </div>
          {profile.bio && (
            <p className="mt-5 whitespace-pre-line text-body text-mist">
              {profile.bio}
            </p>
          )}
          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-hairline pt-4 sm:grid-cols-4">
            <Stat label="Comentários" value={profile._count.comments} />
            <Stat label="Avaliações" value={profile._count.ratings} />
            <Stat label="Favoritos" value={profile._count.favorites} />
            <Stat label="Episódios" value={profile._count.watchHistories} />
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <TabButton
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
            >
              Visão
            </TabButton>
            <TabButton
              active={activeTab === "comments"}
              onClick={() => setActiveTab("comments")}
            >
              Comentários
            </TabButton>
            <TabButton
              active={activeTab === "ratings"}
              onClick={() => setActiveTab("ratings")}
            >
              Avaliações
            </TabButton>
            <TabButton
              active={activeTab === "favorites"}
              onClick={() => setActiveTab("favorites")}
            >
              Favoritos
            </TabButton>
            <TabButton
              active={activeTab === "biblioteca"}
              onClick={() => setActiveTab("biblioteca")}
            >
              Biblioteca
            </TabButton>
            <div className="flex-1" />
            <button className="btn-ghost" onClick={() => setReportOpen(true)}>
              Denunciar usuário
            </button>
          </div>
        </section>

        <section className="mt-6 max-w-2xl">
          {activeTab === "overview" && (
            <div className="border border-hairline bg-panel p-4 text-mist">
              {profile.bio ? (
                <span className="whitespace-pre-line">{profile.bio}</span>
              ) : (
                "Sem descrição."
              )}
            </div>
          )}

          {activeTab === "comments" && (
            <div className="space-y-3">
              {loadingList && <div className="text-mist">Carregando...</div>}
              {!loadingList && comments.length === 0 && (
                <div className="border border-hairline bg-panel p-4 text-mist">
                  Nenhum comentário público.
                </div>
              )}

              {comments.map((c: CommentItem) => (
                <CommentRow
                  key={c.id}
                  comment={c}
                  currentUserId={undefined}
                  onDelete={async (id: string) => {
                    try {
                      await api.deleteComment(id);
                      setComments((prev) =>
                        prev.filter((x) => x.id !== id),
                      );
                    } catch {}
                  }}
                  onLike={async (id: string) => {
                    try {
                      const res = await api.toggleCommentLike(id);
                      setComments((prev) =>
                        prev.map((c) =>
                          c.id === id
                            ? {
                                ...c,
                                _count: {
                                  ...(c._count ?? { likes: 0, replies: 0 }),
                                  likes: Math.max(
                                    0,
                                    (c._count?.likes ?? 0) + (res.liked ? 1 : -1),
                                  ),
                                },
                              }
                            : c,
                        ),
                      );
                    } catch {}
                  }}
                />
              ))}

              {commentsHasMore && (
                <button
                  onClick={async () => {
                    const next = commentsPage + 1;
                    setCommentsPage(next);
                    setLoadingList(true);
                    try {
                      const res = await api.getUserComments(profile!.id, next, 20);
                      setComments((prev) => [
                        ...prev,
                        ...(res.data ?? []).map((c) => ({
                          ...c,
                          userId: profile!.id,
                          user: {
                            id: profile!.id,
                            name: profile!.name,
                            userName: profile!.userName,
                            avatar: profile!.avatar,
                          },
                        })),
                      ]);
                      setCommentsHasMore((res.data ?? []).length >= 20);
                    } catch {}
                    setLoadingList(false);
                  }}
                  className="btn-ghost"
                >
                  Carregar mais
                </button>
              )}
            </div>
          )}

          {activeTab === "ratings" && (
            <div className="space-y-3">
              {loadingList && <div className="text-mist">Carregando...</div>}
              {!loadingList && ratings.length === 0 && (
                <div className="border border-hairline bg-panel p-4 text-mist">
                  Nenhuma avaliação pública.
                </div>
              )}
              {ratings.map((r: UserRating) => (
                <div
                  key={r.anime?.id ?? r.anime?.slug}
                  className="border border-hairline bg-panel p-4"
                >
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/animes/${r.anime?.slug}`}
                      className="h-16 w-11 shrink-0 overflow-hidden"
                    >
                      {r.anime?.coverImage ? (
                        <Image
                          src={r.anime.coverImage}
                          alt={r.anime.title ?? "cover"}
                          width={44}
                          height={64}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </Link>
                    <div className="flex-1">
                      <div className="font-semibold text-ice">
                        {r.anime?.title ?? "—"}
                      </div>
                      <div className="text-mist text-sm">
                        Nota: {r.score} •{" "}
                        {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {ratingsHasMore && (
                <button
                  onClick={async () => {
                    const next = ratingsPage + 1;
                    setRatingsPage(next);
                    setLoadingList(true);
                    try {
                      const res = await api.getUserRatings(profile!.id, next, 20);
                      setRatings((prev) => [...prev, ...(res.data ?? [])]);
                      setRatingsHasMore((res.data ?? []).length >= 20);
                    } catch {}
                    setLoadingList(false);
                  }}
                  className="btn-ghost"
                >
                  Carregar mais
                </button>
              )}
            </div>
          )}

          {activeTab === "favorites" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {loadingList && <div className="text-mist">Carregando...</div>}
              {!loadingList && favorites.length === 0 && (
                <div className="col-span-full border border-hairline bg-panel p-4 text-mist">
                  Nenhum favorito público.
                </div>
              )}
              {favorites.map((f) => (
                <Link
                  key={f.anime.id}
                  href={`/animes/${f.anime.slug}`}
                  className="border border-hairline bg-panel p-3"
                >
                  <div className="aspect-[2/3] w-full overflow-hidden">
                    <Image
                      src={f.anime.coverImage ?? "/images/animesice-mascot.svg"}
                      alt={f.anime.title || "cover"}
                      width={160}
                      height={240}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="mt-2 line-clamp-2 font-semibold text-ice">
                    {f.anime.title}
                  </div>
                  <div className="text-mist text-sm">
                    {f.anime.year ?? ""} {f.anime.format ?? ""}
                  </div>
                </Link>
              ))}

              {favoritesHasMore && (
                <div className="col-span-full">
                  <button
                    onClick={async () => {
                      const next = favoritesPage + 1;
                      setFavoritesPage(next);
                      setLoadingList(true);
                      try {
                        const res = await api.getUserFavorites(profile!.id, next, 24);
                        setFavorites((prev) => [...prev, ...(res.data ?? [])]);
                        setFavoritesHasMore((res.data ?? []).length >= 24);
                      } catch {}
                      setLoadingList(false);
                    }}
                    className="btn-ghost"
                  >
                    Carregar mais
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "biblioteca" && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setListStatus(s)}
                    className={`px-3 py-1 text-caption ${
                      listStatus === s
                        ? "bg-ice text-panel"
                        : "bg-panel text-mist border border-hairline"
                    }`}
                  >
                    {s === "ALL" ? "Tudo" : STATUS_LABELS[s]}
                  </button>
                ))}
              </div>

              {loadingList && <div className="text-mist">Carregando...</div>}
              {!loadingList && list.length === 0 && (
                <div className="border border-hairline bg-panel p-4 text-mist">
                  Nenhum anime público na biblioteca.
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {list.map((item) => (
                  <Link
                    key={item.animeId}
                    href={`/animes/${item.anime.slug}`}
                    className="border border-hairline bg-panel p-3"
                  >
                    <div className="aspect-[2/3] w-full overflow-hidden">
                      <Image
                        src={item.anime.coverImage ?? "/images/animesice-mascot.svg"}
                        alt={item.anime.title || "cover"}
                        width={160}
                        height={240}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="mt-2 line-clamp-2 font-semibold text-ice">
                      {item.anime.title}
                    </div>
                    <div className="text-mist text-sm">
                      {STATUS_LABELS[item.status] ?? item.status}
                      {item.score != null ? ` • Nota ${item.score}` : ""}
                    </div>
                  </Link>
                ))}
              </div>

              {listHasMore && (
                <button
                  onClick={async () => {
                    const next = listPage + 1;
                    setListPage(next);
                    setLoadingList(true);
                    try {
                      const res = await api.getUserAnimeList(
                        profile!.id,
                        next,
                        24,
                        listStatus === "ALL" ? undefined : listStatus,
                      );
                      setList((prev) => [...prev, ...(res.data ?? [])]);
                      setListHasMore((res.data ?? []).length >= 24);
                    } catch {}
                    setLoadingList(false);
                  }}
                  className="btn-ghost"
                >
                  Carregar mais
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Denunciar usuário">
        <div>
          <label className="mb-2 block">
            <span className="text-caption text-mist">Motivo</span>
            <select
              className="field mt-1"
              value={reportReason}
              onChange={(e) => {
                const reason = REPORT_REASONS.find(
                  (r) => r.value === e.target.value,
                );
                if (reason) setReportReason(reason.value);
              }}
            >
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-caption text-mist">Observações (opcional)</span>
            <textarea
              value={reportNotes}
              onChange={(e) => setReportNotes(e.target.value)}
              className="field mt-1 w-full resize-none"
              rows={4}
            />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setReportOpen(false)} className="btn-ghost">
              Cancelar
            </button>
            <button
              onClick={handleReportSubmit}
              disabled={reportSubmitting}
              className="btn-ice"
            >
              {reportSubmitting ? "Enviando..." : "Enviar denúncia"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div>
      <dt className="font-mono text-caption uppercase text-mist">{label}</dt>
      <dd className="font-display text-body font-semibold text-ice">
        {value ?? "—"}
      </dd>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`px-3 py-1 rounded ${
        active
          ? "bg-ice text-panel"
          : "bg-panel text-mist border border-hairline"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
