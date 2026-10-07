"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { safeImageSrc } from "@/lib/url";
import {
  GachaCardGridSkeleton,
  GachaPageSkeleton,
  GachaPanelGridSkeleton,
} from "@/components/gacha/GachaPageSkeleton";
import { useToast } from "@/components/common/ToastProvider";
import type { GachaWishlistResponse } from "@/types";

export default function GachaWishlistPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<GachaWishlistResponse | null>(null);
  const [error, setError] = useState("");
  // Bug #2 fix: derive publicList from isPublic (preferred) or !private as
  // fallback so both API shapes work without ambiguity.
  const [publicList, setPublicList] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  // Bug #5: pagination state
  const [page, setPage] = useState(1);
  const [loadingPage, setLoadingPage] = useState(false);
  const [reload, setReload] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    setError("");
    void api
      .gachaWishlist(user.id, `page=${page}`)
      .then((result) => {
        setData(result);
        // Bug #2 fix: prefer isPublic, fall back to !private
        setPublicList(result.isPublic ?? !result.private);
      })
      .catch(() => setError("Não foi possível carregar sua wishlist."));
  }, [user, page, reload]);

  if (authLoading)
    return <GachaPageSkeleton kind="wishlist" />;
  if (!user) {
    return (
      <main className="mx-auto max-w-shelf px-4 py-12">
        <h1 className="font-display text-display-lg text-snow">Wishlist</h1>
        <p className="mt-3 text-mist">
          Entre para guardar cartas e conjuntos desejados.
        </p>
        <Link href="/login" className="btn-ice mt-6 inline-block px-4 py-3">
          Entrar
        </Link>
      </main>
    );
  }

  async function togglePrivacy() {
    setSavingPrivacy(true);
    try {
      const next = await api.gachaWishlistPrivacy(!publicList);
      const nowPublic = next.gachaWishlistPublic;
      setPublicList(nowPublic);
      // Bug #1 fix: keep data in sync so the conditional render below reflects
      // the new privacy state immediately. Without this the content stayed
      // visible to the owner even after making the wishlist private.
      setData((prev) =>
        prev ? { ...prev, isPublic: nowPublic, private: !nowPublic } : prev,
      );
      toast(nowPublic ? "Wishlist pública." : "Wishlist privada.", "success");
    } catch {
      setError("Não foi possível salvar a privacidade.");
    } finally {
      setSavingPrivacy(false);
    }
  }

  async function goToPage(target: number) {
    setLoadingPage(true);
    try {
      const result = await api.gachaWishlist(user!.id, `page=${target}`);
      setData(result);
      setPage(target);
    } catch {
      setError("Não foi possível carregar a página.");
    } finally {
      setLoadingPage(false);
    }
  }

  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <main className="mx-auto max-w-shelf px-4 pb-24 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-lg text-snow">Wishlist</h1>
          <p className="mt-2 text-body-sm text-mist">
            Cartas e conjuntos que você quer obter.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void togglePrivacy()}
          disabled={savingPrivacy}
          className="btn-ghost px-4 py-3"
        >
          {savingPrivacy
            ? "Salvando..."
            : publicList
              ? "Wishlist pública"
              : "Wishlist privada"}
        </button>
      </div>
      {error && data && (
        <p role="alert" className="mt-6 text-signal">
          {error}
        </p>
      )}
      {!data && error ? (
        <div className="mt-8" role="alert">
          <p className="text-signal">{error}</p>
          <button
            type="button"
            onClick={() => setReload((value) => value + 1)}
            className="btn-ghost mt-4 px-4 py-3"
          >
            Tentar novamente
          </button>
        </div>
      ) : !data ? (
        <>
          <GachaPanelGridSkeleton
            count={3}
            label="Carregando conjuntos da wishlist"
            className="mt-8"
          />
          <GachaCardGridSkeleton
            count={6}
            label="Carregando cartas da wishlist"
            className="mt-8"
          />
        </>
      ) : !publicList ? (
        // Bug #2 fix: use `publicList` (live state) instead of `data.private`
        // (stale initial value) so the owner sees the updated state immediately.
        <p className="mt-8 text-mist">Wishlist privada.</p>
      ) : (
        <>
          <section className="mt-10">
            <h2 className="font-display text-body-lg text-snow">Conjuntos</h2>
            {data.sets.length === 0 ? (
              <p className="mt-3 text-mist">Nenhum conjunto desejado.</p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.sets.map((set) => (
                  <Link
                    key={set.id}
                    href={`/gacha/enciclopedia?view=sets&animeId=${set.animeId}`}
                    className="border border-hairline bg-panel p-4 hover:border-ice"
                  >
                    <h3 className="text-body-md text-snow">
                      {set.anime.title}
                    </h3>
                    <p className="mt-2 text-body-sm text-mist">
                      {set.owned}/{set.total} cartas ·{" "}
                      {set.complete
                        ? "Completo"
                        : `${set.total - set.owned} faltantes`}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
          <section className="mt-10">
            <h2 className="font-display text-body-lg text-snow">Cartas</h2>
            {data.cards.length === 0 ? (
              <p className="mt-3 text-mist">Nenhuma carta desejada.</p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {data.cards.map((entry) => {
                  const image = safeImageSrc(entry.card.image);
                  return (
                    <Link
                      key={entry.id}
                      href={`/gacha/enciclopedia?view=cards&animeId=${entry.card.animeId ?? ""}`}
                      className="border border-hairline bg-panel p-3 hover:border-ice"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-ink">
                        {image && (
                          <Image
                            src={image}
                            alt={entry.card.name}
                            fill
                            sizes="20vw"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <h3 className="mt-2 text-body-sm text-snow">
                        {entry.card.name}
                      </h3>
                      <p className="mt-1 text-caption text-mist">
                        {entry.complete ? "Concluída" : entry.priority}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Bug #5 fix: render pagination controls when totalPages > 1 */}
          {totalPages > 1 && (
            <nav
              aria-label="Paginação da wishlist"
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <button
                type="button"
                onClick={() => void goToPage(page - 1)}
                disabled={page <= 1 || loadingPage}
                className="btn-ghost px-4 py-3 disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-body-sm text-mist">
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => void goToPage(page + 1)}
                disabled={page >= totalPages || loadingPage}
                className="btn-ghost px-4 py-3 disabled:opacity-40"
              >
                Próxima
              </button>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
