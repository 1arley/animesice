"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { GachaCard } from "@/components/gacha/GachaCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionLabel } from "@/components/common/SectionLabel";
import type { GachaListing } from "@/types";

const PAGE_SIZE = 24;

function humansLeft(expiresAt: string): string {
  const left = new Date(expiresAt).getTime() - Date.now();
  if (left <= 0) return "expirado";
  const h = Math.ceil(left / 3_600_000);
  if (h >= 24) return `${Math.floor(h / 24)}d`;
  return `${h}h`;
}

export default function GachaMarketPage() {
  const { user } = useAuth();
  const [sort, setSort] = useState("price");

  const [listings, setListings] = useState<GachaListing[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [mine, setMine] = useState<GachaListing[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.gachaListings(1, PAGE_SIZE, sort);
      setListings(data.data);
      setMeta({ page: data.meta.page, totalPages: data.meta.totalPages, total: data.meta.total });
    } catch {
      setError("Não foi possível carregar o mercado.");
    } finally {
      setLoading(false);
    }
  }, [sort]);

  const loadMine = useCallback(async () => {
    if (!user) return;
    try {
      const [my, shop] = await Promise.all([
        api.gachaMyListings(),
        api.gachaShop().catch(() => null),
      ]);
      setMine(my);
      if (shop) setBalance(shop.balance);
    } catch {}
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadMine();
  }, [loadMine]);

  async function act(id: string, fn: () => Promise<unknown>) {
    setBusy(id);
    setError("");
    try {
      await fn();
      await Promise.all([load(), loadMine()]);
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "Não foi possível concluir.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto max-w-shelf px-4 pb-16 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-lg text-snow">Mercado</h1>
          <p className="text-body-sm text-mist">
            Cartas anunciadas por Crystais — compra direta, taxa de 10%.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {balance != null && (
            <span className="font-mono text-caption text-mist">
              {balance.toLocaleString("pt-BR")} 💎
            </span>
          )}
          <Link href="/gacha" className="btn-ghost px-4 py-2">
            Voltar ao gacha
          </Link>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal"
        >
          {error}
        </div>
      )}

      {user && mine.length > 0 && (
        <section className="mt-8">
          <SectionLabel level={2}>Meus anúncios ({mine.length}/5)</SectionLabel>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {mine.map((listing) => (
              <li key={listing.id}>
                <GachaCard pull={listing.userCard} linkAnime={false} />
                <p className="mt-1 text-center font-mono text-caption text-mist">
                  {listing.price.toLocaleString("pt-BR")} 💎 ·{" "}
                  {humansLeft(listing.expiresAt)}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    void act(listing.id, () => api.gachaListCancel(listing.id))
                  }
                  disabled={busy !== null}
                  className="btn-ghost mt-1 w-full px-2 py-1 text-caption disabled:opacity-50"
                >
                  {busy === listing.id ? "…" : "Desanunciar"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionLabel level={2}>
            {loading ? "Carregando…" : `Anúncios (${meta.total})`}
          </SectionLabel>
          <div className="flex gap-2">
            {(["price", "value", "newest"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                className={`px-3 py-1 font-mono text-caption ${
                  sort === s
                    ? "border border-ice/60 text-snow"
                    : "border border-hairline text-mist hover:text-snow"
                }`}
              >
                {s === "price" ? "preço" : s === "value" ? "valor" : "novos"}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="skeleton mt-3 h-64" aria-busy="true" />
        ) : listings.length === 0 ? (
          <EmptyState
            text="Ninguém anunciou cartas ainda. Seja o primeiro — anuncie pelo botão da carta."
            variant="compact"
          />
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {listings.map((listing) => (
              <li key={listing.id}>
                <GachaCard pull={listing.userCard} linkAnime={false} />
                <p className="mt-1 truncate text-center font-mono text-caption text-mist">
                  {listing.user.name?.trim() || listing.user.userName} ·{" "}
                  {humansLeft(listing.expiresAt)}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    void act(listing.id, () => api.gachaListBuy(listing.id))
                  }
                  disabled={!user || busy !== null || listing.userId === user.id}
                  className="btn-ice mt-1 w-full px-2 py-1.5 font-mono text-caption disabled:opacity-50"
                >
                  {busy === listing.id
                    ? "…"
                    : `Comprar · ${listing.price.toLocaleString("pt-BR")} 💎`}
                </button>
              </li>
            ))}
          </ul>
        )}
        {meta.totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setLoading(true);
                  void api
                    .gachaListings(p, PAGE_SIZE, sort)
                    .then((data) => {
                      setListings(data.data);
                      setMeta({
                        page: data.meta.page,
                        totalPages: data.meta.totalPages,
                        total: data.meta.total,
                      });
                    })
                    .finally(() => setLoading(false));
                }}
                className={`px-3 py-1 font-mono text-caption ${
                  p === meta.page
                    ? "border border-ice/60 text-snow"
                    : "border border-hairline text-mist hover:text-snow"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
