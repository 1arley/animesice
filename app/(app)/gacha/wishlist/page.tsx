"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { safeImageSrc } from "@/lib/url";
import { useToast } from "@/components/common/ToastProvider";
import type { GachaWishlistResponse } from "@/types";

export default function GachaWishlistPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<GachaWishlistResponse | null>(null);
  const [error, setError] = useState("");
  const [publicList, setPublicList] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    void api
      .gachaWishlist(user.id)
      .then((result) => {
        setData(result);
        setPublicList(result.isPublic);
      })
      .catch(() => setError("Não foi possível carregar sua wishlist."));
  }, [user]);

  if (authLoading)
    return (
      <main className="mx-auto max-w-shelf px-4 py-12 text-mist">
        Carregando...
      </main>
    );
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
      setPublicList(next.gachaWishlistPublic);
      toast(
        next.gachaWishlistPublic ? "Wishlist pública." : "Wishlist privada.",
        "success",
      );
    } catch {
      setError("Não foi possível salvar a privacidade.");
    } finally {
      setSavingPrivacy(false);
    }
  }

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
      {error && (
        <p role="alert" className="mt-6 text-signal">
          {error}
        </p>
      )}
      {!data ? (
        <div className="skeleton mt-8 h-64" />
      ) : data.private ? (
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
        </>
      )}
    </main>
  );
}
