"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { PublicUserProfile } from "@/types";
import { CommentItem } from "@/components/common/CommentSection";
import { Modal } from "@/components/common/Modal";
import Image from "next/image";

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [error, setError] = useState(false);

  const [activeTab, setActiveTab] = useState<'overview'|'comments'|'ratings'|'favorites'>('overview');
  const [comments, setComments] = useState<any[]>([]);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsHasMore, setCommentsHasMore] = useState(false);

  const [ratings, setRatings] = useState<any[]>([]);
  const [ratingsPage, setRatingsPage] = useState(1);
  const [ratingsHasMore, setRatingsHasMore] = useState(false);

  const [favorites, setFavorites] = useState<any[]>([]);
  const [favoritesPage, setFavoritesPage] = useState(1);
  const [favoritesHasMore, setFavoritesHasMore] = useState(false);

  const [loadingList, setLoadingList] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("SPAM");
  const [reportNotes, setReportNotes] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  useEffect(() => {
    params.then(({ id }) => api.getPublicProfile(id).then(setProfile).catch(() => setError(true)));
  }, [params]);

  useEffect(() => {
    if (!profile) return;
    const uid = profile.id;
    async function load() {
      setLoadingList(true);
      try {
        if (activeTab === 'comments') {
          const res = await api.getUserComments(uid, 1, 20);
          setComments(res || []);
          setCommentsPage(1);
          setCommentsHasMore((res || []).length >= 20);
        } else if (activeTab === 'ratings') {
          const res = await api.getUserRatings(uid, 1, 20);
          setRatings(res || []);
          setRatingsPage(1);
          setRatingsHasMore((res || []).length >= 20);
        } else if (activeTab === 'favorites') {
          const res = await api.getUserFavorites(uid, 1, 24);
          setFavorites(res.data ?? []);
          setFavoritesPage(1);
          setFavoritesHasMore((res.data ?? []).length >= 24);
        }
      } catch (e) {
        // ignore list errors
      } finally {
        setLoadingList(false);
      }
    }
    load();
  }, [activeTab, profile]);

  if (error) return <div className="mx-auto max-w-shelf px-4 py-8 text-mist">Perfil não encontrado.</div>;
  if (!profile) return <div className="mx-auto max-w-shelf px-4 py-8 text-mist">Carregando...</div>;

  async function handleReportSubmit() {
    if (!profile) return;
    const uid = profile.id;
    setReportSubmitting(true);
    try {
      await api.createReport({ targetType: 'USER', targetId: uid, reason: reportReason as any, notes: reportNotes || undefined });
      setReportSubmitting(false);
      setReportOpen(false);
      setReportNotes("");
      window.alert('Denúncia enviada. Obrigado.');
    } catch (e: any) {
      setReportSubmitting(false);
      window.alert(e?.message || 'Erro ao enviar denúncia.');
    }
  }


  return (
    <>
      <div className="mx-auto max-w-shelf px-4 py-8">
      <section className="max-w-2xl border border-hairline bg-panel p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden bg-hairline font-mono text-display-lg text-mist">
            {profile.avatar ? <Image src={profile.avatar} alt={profile.userName ?? profile.name ?? 'avatar'} width={64} height={64} className="h-full w-full object-cover" /> : (profile.userName ?? profile.name ?? "?")[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-display-lg text-ice">{profile.userName ?? profile.name ?? "Usuário"}</h1>
            {profile.userName && profile.name && (
              <p className="text-body-sm text-mist">{profile.name}</p>
            )}
            <p className="text-body-sm text-mist">Membro desde {new Date(profile.createdAt).toLocaleDateString("pt-BR")}</p>
          </div>
        </div>
        {profile.bio && <p className="mt-5 whitespace-pre-line text-body text-mist">{profile.bio}</p>}
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-hairline pt-4 sm:grid-cols-4">
          <Stat label="Comentários" value={profile._count.comments} />
          <Stat label="Avaliações" value={profile._count.ratings} />
          <Stat label="Favoritos" value={profile._count.favorites} />
          <Stat label="Episódios" value={profile._count.watchHistories} />
        </dl>

        <div className="mt-4 flex gap-2">
          <button className={`px-3 py-1 rounded ${activeTab==='overview'? 'bg-ice text-panel':'bg-panel text-mist border border-hairline'}`} onClick={()=>setActiveTab('overview')}>Visão</button>
          <button className={`px-3 py-1 rounded ${activeTab==='comments'? 'bg-ice text-panel':'bg-panel text-mist border border-hairline'}`} onClick={()=>setActiveTab('comments')}>Comentários</button>
          <button className={`px-3 py-1 rounded ${activeTab==='ratings'? 'bg-ice text-panel':'bg-panel text-mist border border-hairline'}`} onClick={()=>setActiveTab('ratings')}>Avaliações</button>
          <button className={`px-3 py-1 rounded ${activeTab==='favorites'? 'bg-ice text-panel':'bg-panel text-mist border border-hairline'}`} onClick={()=>setActiveTab('favorites')}>Favoritos</button>
          <div className="flex-1" />
          <button className="btn-ghost" onClick={()=>setReportOpen(true)}>Denunciar usuário</button>
        </div>
      </section>

      <section className="mt-6 max-w-2xl">
        {activeTab === 'overview' && (
          <div className="border border-hairline bg-panel p-4 text-mist">{profile.bio ? <span className="whitespace-pre-line">{profile.bio}</span> : 'Sem descrição.'}</div>
        )}

        {activeTab === 'comments' && (
          <div className="space-y-3">
            {loadingList && <div className="text-mist">Carregando...</div>}
            {!loadingList && comments.length === 0 && <div className="border border-hairline bg-panel p-4 text-mist">Nenhum comentário público.</div>}

            {comments.map((c: any) => (
              <CommentItem
                key={c.id}
                comment={c}
                currentUserId={undefined}
                onDelete={async (id: string) => {
                  try {
                    await api.deleteComment(id);
                    setComments((prev) => prev.filter((x) => x.id !== id));
                  } catch {}
                }}
                onLike={async (id: string) => {
                  try {
                    await api.toggleCommentLike(id);
                    setComments((prev) => prev.map((x) => x.id === id ? x : x));
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
                    setComments((prev) => [...prev, ...(res || [])]);
                    setCommentsHasMore((res || []).length >= 20);
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

        {activeTab === 'ratings' && (
          <div className="space-y-3">
            {loadingList && <div className="text-mist">Carregando...</div>}
            {!loadingList && ratings.length === 0 && <div className="border border-hairline bg-panel p-4 text-mist">Nenhuma avaliação pública.</div>}
            {ratings.map((r: any) => (
              <div key={r.id || r.anime?.id} className="border border-hairline bg-panel p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="font-semibold text-ice">{r.anime?.title ?? r.animeTitle ?? '—'}</div>
                    <div className="text-mist text-sm">Nota: {r.score} • {new Date(r.createdAt).toLocaleDateString()}</div>
                    {r.review && <div className="mt-2 text-body text-mist whitespace-pre-line">{r.review}</div>}
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
                    setRatings((prev) => [...prev, ...(res || [])]);
                    setRatingsHasMore((res || []).length >= 20);
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

        {activeTab === 'favorites' && (
          <div className="grid grid-cols-2 gap-3">
            {loadingList && <div className="text-mist">Carregando...</div>}
            {!loadingList && favorites.length === 0 && <div className="border border-hairline bg-panel p-4 text-mist">Nenhum favorito público.</div>}
            {favorites.map((a: any) => (
              <div key={a.id} className="border border-hairline bg-panel p-3 flex items-center gap-3">
                <Image src={a.coverImage ?? '/images/animesice-mascot.svg'} alt={a.title || 'cover'} width={48} height={72} className="object-cover" />
                <div>
                  <div className="font-semibold text-ice">{a.title}</div>
                  <div className="text-mist text-sm">{a.year ?? ''} {a.format ?? ''}</div>
                </div>
              </div>
            ))}

            {favoritesHasMore && (
              <div className="col-span-2">
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
      </section>
    </div>

      <Modal open={reportOpen} onClose={()=>setReportOpen(false)} title="Denunciar usuário">
        <div>
          <label className="block mb-2">
            <span className="text-caption text-mist">Motivo</span>
            <select className="field mt-1" value={reportReason} onChange={(e)=>setReportReason(e.target.value)}>
              <option value="SPAM">SPAM</option>
              <option value="HARASSMENT">ASSÉDIO</option>
              <option value="NSFW">NSFW</option>
              <option value="SPOILER">SPOILER</option>
              <option value="ILLEGAL">ILLEGAL</option>
              <option value="OTHER">OUTRO</option>
            </select>
          </label>
          <label className="block">
            <span className="text-caption text-mist">Observações (opcional)</span>
            <textarea value={reportNotes} onChange={(e)=>setReportNotes(e.target.value)} className="field mt-1 w-full resize-none" rows={4} />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={()=>setReportOpen(false)} className="btn-ghost">Cancelar</button>
            <button onClick={handleReportSubmit} disabled={reportSubmitting} className="btn-ice">{reportSubmitting ? 'Enviando...' : 'Enviar denúncia'}</button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div><dt className="font-mono text-caption uppercase text-mist">{label}</dt><dd className="font-display text-body font-semibold text-ice">{value}</dd></div>;
}
