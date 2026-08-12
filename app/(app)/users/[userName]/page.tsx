"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type {
  PublicUserProfile,
  PublicActivityEvent,
  UserRating,
  PublicFavoriteItem,
  PublicAnimeListItem,
  WatchStatus,
} from "@/types";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { ProfileNav, type ProfileTab } from "@/components/profile/ProfileNav";
import { ProfileAbout } from "@/components/profile/ProfileAbout";
import { ProfileCurrentlyWatching } from "@/components/profile/ProfileCurrentlyWatching";
import { ProfileTaste, buildTaste } from "@/components/profile/ProfileTaste";
import { ProfileActivity } from "@/components/profile/ProfileActivity";
import { ProfileFavorites } from "@/components/profile/ProfileFavorites";
import { ProfileRatings } from "@/components/profile/ProfileRatings";
import { ProfileCollection } from "@/components/profile/ProfileCollection";

const LIMIT = 24;

/** Mapa de ?tab= legado (ProfileDashboard) para as tabs novas. */
const TAB_ALIASES: Record<string, ProfileTab> = {
  comments: "activity",
  ratings: "ratings",
  favorites: "favorites",
  biblioteca: "collection",
  overview: "overview",
  activity: "activity",
  collection: "collection",
};

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ userName: string }>;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");

  // --- Dados da visão geral (carregados em paralelo) ---
  const [list, setList] = useState<PublicAnimeListItem[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [activity, setActivity] = useState<PublicActivityEvent[]>([]);
  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [ratingsTotal, setRatingsTotal] = useState(0);
  const [favorites, setFavorites] = useState<PublicFavoriteItem[]>([]);
  const [favoritesTotal, setFavoritesTotal] = useState(0);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // --- Dados das tabs (lazy, sob demanda) ---
  const [tabLoading, setTabLoading] = useState(false);
  const [tabActivity, setTabActivity] = useState<PublicActivityEvent[]>([]);
  const [tabActivityTotal, setTabActivityTotal] = useState(0);
  const [tabActivityPage, setTabActivityPage] = useState(1);
  const [tabActivityHasMore, setTabActivityHasMore] = useState(false);
  const [tabRatings, setTabRatings] = useState<UserRating[]>([]);
  const [tabRatingsTotal, setTabRatingsTotal] = useState(0);
  const [tabRatingsPage, setTabRatingsPage] = useState(1);
  const [tabRatingsHasMore, setTabRatingsHasMore] = useState(false);
  const [tabFavorites, setTabFavorites] = useState<PublicFavoriteItem[]>([]);
  const [tabFavoritesTotal, setTabFavoritesTotal] = useState(0);
  const [tabFavoritesPage, setTabFavoritesPage] = useState(1);
  const [tabFavoritesHasMore, setTabFavoritesHasMore] = useState(false);
  const [collectionStatus, setCollectionStatus] = useState<WatchStatus | "ALL">("ALL");
  const [tabList, setTabList] = useState<PublicAnimeListItem[]>([]);
  const [tabListTotal, setTabListTotal] = useState(0);
  const [tabListPage, setTabListPage] = useState(1);
  const [tabListHasMore, setTabListHasMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { userName } = await params;
        if (!userName) throw new Error("missing userName");
        const prof = await api.getPublicProfile(userName);
        if (cancelled) return;
        setProfile(prof);
        // URL canônica: /users/:userName.
        if (prof.userName && prof.userName !== userName) {
          router.replace(`/users/${prof.userName}`);
        }

        // Visão geral em paralelo — sem cascata de requests.
        const uid = prof.id;
        const [l, a, r, f] = await Promise.all([
          api.getUserAnimeList(uid, 1, 100),
          api.getUserActivity(uid, 1, 8),
          api.getUserRatings(uid, 1, 4),
          api.getUserFavorites(uid, 1, 12),
        ]);
        if (cancelled) return;
        setList(l.data ?? []);
        setListTotal(l.meta?.total ?? 0);
        setActivity(a.data ?? []);
        setRatings(r.data ?? []);
        setRatingsTotal(r.meta?.total ?? 0);
        setFavorites(f.data ?? []);
        setFavoritesTotal(f.meta?.total ?? 0);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  // ?tab= legado + rolagem suave ao trocar de aba.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && TAB_ALIASES[t]) setActiveTab(TAB_ALIASES[t]);
  }, []);

  useEffect(() => {
    if (activeTab === "overview") return;
    document
      .getElementById("profile-content")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeTab]);

  const watching = useMemo(
    () => list.filter((i) => i.status === "WATCHING"),
    [list],
  );
  const taste = useMemo(() => buildTaste(list), [list]);

  if (error) {
    return (
      <div className="mx-auto max-w-shelf px-4 py-16 text-center">
        <h1 className="font-display text-display-lg text-mist">
          Perfil não encontrado.
        </h1>
      </div>
    );
  }

  if (!profile) {
    return <ProfileSkeleton />;
  }

  const displayName = profile.name?.trim() || profile.userName || "Usuário";

  async function loadMoreActivity() {
    const next = tabActivityPage + 1;
    try {
      const res = await api.getUserActivity(profile!.id, next, LIMIT);
      setTabActivity((prev) => [...prev, ...(res.data ?? [])]);
      setTabActivityPage(next);
      setTabActivityHasMore(next < (res.meta?.totalPages ?? 1));
    } catch {}
  }

  async function loadMoreRatings() {
    const next = tabRatingsPage + 1;
    try {
      const res = await api.getUserRatings(profile!.id, next, LIMIT);
      setTabRatings((prev) => [...prev, ...(res.data ?? [])]);
      setTabRatingsPage(next);
      setTabRatingsHasMore(next < (res.meta?.totalPages ?? 1));
    } catch {}
  }

  async function loadMoreFavorites() {
    const next = tabFavoritesPage + 1;
    try {
      const res = await api.getUserFavorites(profile!.id, next, LIMIT);
      setTabFavorites((prev) => [...prev, ...(res.data ?? [])]);
      setTabFavoritesPage(next);
      setTabFavoritesHasMore(next < (res.meta?.totalPages ?? 1));
    } catch {}
  }

  async function loadMoreList() {
    const next = tabListPage + 1;
    try {
      // Respeita o filtro de status ativo — o servidor filtra e pagina.
      const res = await api.getUserAnimeList(
        profile!.id,
        next,
        LIMIT,
        collectionStatus === "ALL" ? undefined : collectionStatus,
      );
      setTabList((prev) => [...prev, ...(res.data ?? [])]);
      setTabListPage(next);
      setTabListHasMore(next < (res.meta?.totalPages ?? 1));
    } catch {}
  }

  // Abas carregam sob demanda (primeira ativação), reutilizando os dados
  // da visão geral quando possível — sem requests duplicados.
  async function ensureTab(tab: ProfileTab) {
    if (!profile) return;
    setTabLoading(true);
    try {
      if (tab === "activity" && tabActivity.length === 0) {
        const res = await api.getUserActivity(profile.id, 1, LIMIT);
        setTabActivity(res.data ?? []);
        setTabActivityTotal(res.meta?.total ?? 0);
        setTabActivityPage(1);
        setTabActivityHasMore(1 < (res.meta?.totalPages ?? 1));
      }
      if (tab === "ratings" && tabRatings.length === 0) {
        const res = await api.getUserRatings(profile.id, 1, LIMIT);
        setTabRatings(res.data ?? []);
        setTabRatingsTotal(res.meta?.total ?? 0);
        setTabRatingsPage(1);
        setTabRatingsHasMore(1 < (res.meta?.totalPages ?? 1));
      }
      if (tab === "favorites" && tabFavorites.length === 0) {
        const res = await api.getUserFavorites(profile.id, 1, LIMIT);
        setTabFavorites(res.data ?? []);
        setTabFavoritesTotal(res.meta?.total ?? 0);
        setTabFavoritesPage(1);
        setTabFavoritesHasMore(1 < (res.meta?.totalPages ?? 1));
      }
      if (tab === "collection" && tabList.length === 0) {
        const res = await api.getUserAnimeList(
          profile.id,
          1,
          LIMIT,
          collectionStatus === "ALL" ? undefined : collectionStatus,
        );
        setTabList(res.data ?? []);
        setTabListTotal(res.meta?.total ?? 0);
        setTabListPage(1);
        setTabListHasMore(1 < (res.meta?.totalPages ?? 1));
      }
    } catch {
      // falha silenciosa — a tab mostra o estado vazio
    } finally {
      setTabLoading(false);
    }
  }

  async function handleCollectionStatus(s: WatchStatus | "ALL") {
    setCollectionStatus(s);
    if (!profile) return;
    setTabLoading(true);
    try {
      const res = await api.getUserAnimeList(
        profile.id,
        1,
        LIMIT,
        s === "ALL" ? undefined : s,
      );
      setTabList(res.data ?? []);
      setTabListTotal(res.meta?.total ?? 0);
      setTabListPage(1);
      setTabListHasMore(1 < (res.meta?.totalPages ?? 1));
    } catch {
      // falha silenciosa
    } finally {
      setTabLoading(false);
    }
  }

  function handleNavigate(tab: ProfileTab) {
    setActiveTab(tab);
    ensureTab(tab);
  }

  return (
    <>
      <ProfileHero profile={profile} />

      <div
        id="profile-content"
        className="mx-auto max-w-shelf px-4 pb-16 pt-4"
      >
        <ProfileStats counts={profile._count} onNavigate={handleNavigate} />

        <div className="mt-6">
          <ProfileNav active={activeTab} onNavigate={handleNavigate} />
        </div>

        <div className="mt-8">
          {activeTab === "overview" && (
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-8">
              {/* Coluna de identidade */}
              <div className="space-y-10">
                <ProfileAbout profile={profile} />
                {taste.length > 0 && <ProfileTaste genres={taste} />}
              </div>

              {/* Coluna de atividade social */}
              <div className="space-y-10">
                {overviewLoading ? (
                  <OverviewSkeleton />
                ) : (
                  <>
                    <ProfileCurrentlyWatching items={watching} />
                    <ProfileActivity
                      events={activity}
                      userName={displayName}
                    />
                    <ProfileRatings items={ratings} total={ratingsTotal} />
                    <ProfileFavorites items={favorites} total={favoritesTotal} />
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <ProfileActivity
              events={tabActivity}
              userName={displayName}
              title="Atividade"
              total={tabActivityTotal}
              loading={tabLoading && tabActivity.length === 0}
            >
              {tabActivityHasMore && (
                <button onClick={loadMoreActivity} className="btn-ghost mt-4">
                  Carregar mais
                </button>
              )}
            </ProfileActivity>
          )}

          {activeTab === "ratings" && (
            <>
              <ProfileRatings items={tabRatings} total={tabRatings.length} />
              {tabRatingsHasMore && (
                <button onClick={loadMoreRatings} className="btn-ghost mt-4">
                  Carregar mais
                </button>
              )}
            </>
          )}

          {activeTab === "favorites" && (
            <>
              <ProfileFavorites items={tabFavorites} total={tabFavorites.length} />
              {tabFavoritesHasMore && (
                <button onClick={loadMoreFavorites} className="btn-ghost mt-4">
                  Carregar mais
                </button>
              )}
            </>
          )}

          {activeTab === "collection" && (
            <>
              <ProfileCollection
                items={tabList}
                total={tabListTotal}
                status={collectionStatus}
                onStatusChange={handleCollectionStatus}
                loading={tabLoading}
              />
              {tabListHasMore && !tabLoading && (
                <button onClick={loadMoreList} className="btn-ghost mt-4">
                  Carregar mais
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-shelf px-4 py-16" aria-busy="true">
      <div className="skeleton h-56 w-full" />
      <div className="mt-6 flex items-center gap-4">
        <div className="skeleton h-24 w-24 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-6 w-48" />
          <div className="skeleton h-4 w-32" />
        </div>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-px bg-hairline sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-20" />
        ))}
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="skeleton h-28" />
      <div className="skeleton h-28" />
      <div className="skeleton h-28" />
    </div>
  );
}
