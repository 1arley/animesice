"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { useToast } from "@/components/common/ToastProvider";
import { SkinReveal } from "@/components/gacha/SkinReveal";
import type { GachaSkin, GachaSkinsResponse } from "@/types";

const PAGE_LIMIT = 48;

function countdown(target: string | null): string | null {
  if (!target) return null;
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h ? `${h}h ${m}m` : `${m}m`;
}

export default function GachaSkinsPage() {
  const reduceMotion = usePrefersReducedMotion();
  const [data, setData] = useState<GachaSkinsResponse | null>(null);
  const [catalog, setCatalog] = useState<GachaSkin[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [revealedSkin, setRevealedSkin] = useState<GachaSkin | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const { toast } = useToast();

  const load = useCallback(
    async (page: number, term = search) => {
      setLoading(true);
      setError("");
      try {
        const res = await api.gachaSkins(page, PAGE_LIMIT, term);
        const owned = res.owned ?? res.skins.filter((s) => s.owned);
        const meta = res.meta ?? {
          total: res.skins.length,
          page: 1,
          limit: res.skins.length,
          totalPages: 1,
        };
        setData({ ...res, owned, meta });
        setCatalog(res.skins);
      } catch (e: unknown) {
        setError(
          e instanceof ApiError
            ? e.message
            : "Não foi possível carregar skins.",
        );
      } finally {
        setLoading(false);
      }
    },
    [search],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(1), 300);
    return () => window.clearTimeout(timeout);
  }, [load]);
  useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 30000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = countdown(data?.nextSpinAt ?? null);
  const owned = data?.owned ?? [];
  const totalPages = data?.meta.totalPages ?? 1;
  const currentPage = data?.meta.page ?? 1;

  async function spin() {
    if (!data?.canSpin || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await api.gachaSkinSpin();
      const fresh: GachaSkin = { ...res.skin, owned: true, equipped: false };
      setData((prev) =>
        prev
          ? {
              ...prev,
              crystalBalance: res.crystalBalance,
              canSpin: false,
              nextSpinAt: res.nextSpinAt,
              owned: [fresh, ...prev.owned.filter((s) => s.id !== fresh.id)],
            }
          : prev,
      );
      setCatalog((prev) =>
        prev.map((s) => (s.id === fresh.id ? { ...s, ...fresh } : s)),
      );
      setRevealedSkin(fresh);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Giro indisponível.");
    } finally {
      setBusy(false);
    }
  }

  async function equip(skin: GachaSkin | null) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await api.gachaEquipSkin(skin?.id ?? null);
      setData((prev) =>
        prev
          ? {
              ...prev,
              equippedSkinId: res.equippedSkinId,
              owned: prev.owned.map((s) => ({
                ...s,
                equipped: s.id === res.equippedSkinId,
              })),
            }
          : prev,
      );
      setCatalog((prev) =>
        prev.map((s) => ({ ...s, equipped: s.id === res.equippedSkinId })),
      );
      toast(skin ? "Skin equipada." : "Skin removida.", "success");
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Não foi possível equipar skin.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!data)
    return (
      <main
        id="body-content"
        className="mx-auto max-w-shelf px-4 py-12 text-mist"
      >
        {error ? (
          <div>
            <p role="alert" className="mb-4 text-sm text-red-300">
              {error}
            </p>
            <button
              type="button"
              className="btn-ice"
              onClick={() => void load(1)}
            >
              Tentar de novo
            </button>
          </div>
        ) : (
          "Carregando skins…"
        )}
      </main>
    );

  return (
    <main id="body-content" className="mx-auto max-w-shelf px-4 py-10">
      {revealedSkin && (
        <SkinReveal
          skin={revealedSkin}
          reduceMotion={reduceMotion}
          onClose={() => setRevealedSkin(null)}
        />
      )}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="shelf-label">Gacha / Skins</p>
          <h1 className="font-display text-display-lg text-ice">Girar skin</h1>
          <p className="mt-2 text-mist">
            Colecione retratos de personagens do MyAnimeList.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-mist">
            Cristais
          </p>
          <p className="font-display text-2xl text-ice">
            {data.crystalBalance.toLocaleString("pt-BR")}
          </p>
        </div>
      </div>
      <section className="mb-10 flex flex-wrap items-center justify-between gap-4 border border-hairline bg-panel p-5">
        <div>
          <p className="font-semibold text-ice">1 giro grátis por semana</p>
          <p className="text-sm text-mist">
            O giro é gratuito e volta a ficar disponível após o tempo indicado.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void spin()}
          disabled={!data.canSpin || busy}
          className="btn-ice disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy
            ? "Girando…"
            : data.canSpin
              ? "Girar agora"
              : `Disponível em ${remaining ?? "breve"}`}
        </button>
      </section>
      {error && (
        <p role="alert" className="mb-5 text-sm text-red-300">
          {error}
        </p>
      )}
      {owned.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl text-ice">
              Sua coleção ({owned.length})
            </h2>
            {owned.some((s) => s.equipped) && (
              <button
                type="button"
                className="btn-ghost text-sm"
                onClick={() => void equip(null)}
              >
                Usar meu avatar
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {owned.map((skin) => (
              <SkinTile
                key={skin.id}
                skin={skin}
                busy={busy}
                onEquip={() => void equip(skin)}
              />
            ))}
          </div>
        </section>
      )}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-xl text-ice">
            Catálogo ({data.meta.total.toLocaleString("pt-BR")})
          </h2>
          <label className="w-full sm:w-72">
            <span className="sr-only">Buscar skin</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              name="skin-search"
              autoComplete="off"
              placeholder="Buscar por nome…"
              className="min-h-11 w-full border border-hairline bg-panel px-3 py-2 text-sm text-ice outline-none focus-visible:border-ice focus-visible:ring-2 focus-visible:ring-ice/40"
              type="search"
            />
          </label>
        </div>
        <div aria-live="polite" aria-busy={loading}>
          {catalog.length === 0 ? (
            <p className="border border-hairline bg-panel p-6 text-center text-sm text-mist">
              Nenhuma skin encontrada. Tente outro nome.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {catalog.map((skin) => (
                <SkinTile
                  key={skin.id}
                  skin={skin}
                  busy={busy}
                  onEquip={() => void equip(skin)}
                />
              ))}
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={loading || currentPage === 1}
              onClick={() => void load(currentPage - 1)}
              className="btn-ghost disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-sm text-mist">
              Página {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              disabled={loading || currentPage === totalPages}
              onClick={() => void load(currentPage + 1)}
              className="btn-ghost disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        )}
      </section>
      <p className="mt-8 text-xs text-mist">
        <Link href="/gacha" className="text-ice underline">
          Voltar ao gacha
        </Link>
      </p>
    </main>
  );
}

function SkinTile({
  skin,
  busy,
  onEquip,
}: {
  skin: GachaSkin;
  busy: boolean;
  onEquip: () => void;
}) {
  return (
    <article
      className={`overflow-hidden border bg-panel ${skin.equipped ? "border-ice" : "border-hairline"}`}
    >
      <div className="relative aspect-square">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={skin.imageUrl}
          alt={skin.name}
          width={320}
          height={320}
          loading="lazy"
          decoding="async"
          className="object-cover"
        />
      </div>
      <div className="p-3">
        <p className="truncate text-sm text-ice">{skin.name}</p>
        {skin.owned ? (
          <button
            type="button"
            disabled={busy}
            onClick={onEquip}
            className="mt-2 text-xs uppercase tracking-wider text-mist hover:text-ice"
          >
            {skin.equipped ? "Equipado" : "Equipar"}
          </button>
        ) : (
          <p className="mt-2 text-xs uppercase tracking-wider text-mist">
            Bloqueada
          </p>
        )}
      </div>
    </article>
  );
}
