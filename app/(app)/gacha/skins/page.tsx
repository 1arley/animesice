"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { SkinReveal } from "@/components/gacha/SkinReveal";
import { RecentSkinSpins } from "@/components/gacha/RecentSkinSpins";
import { GachaPageSkeleton } from "@/components/gacha/GachaPageSkeleton";
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
  const [busy, setBusy] = useState(false);
  const [revealedSkin, setRevealedSkin] = useState<GachaSkin | null>(null);
  const [error, setError] = useState("");
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await api.gachaSkins(1, PAGE_LIMIT);
      const owned = res.owned ?? res.skins.filter((s) => s.owned);
      const meta = res.meta ?? {
        total: res.skins.length,
        page: 1,
        limit: res.skins.length,
        totalPages: 1,
      };
      setData({ ...res, owned, meta });
    } catch (e: unknown) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Não foi possível carregar skins.",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 30000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = countdown(data?.nextSpinAt ?? null);
  const owned = data?.owned ?? [];

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
      setRevealedSkin(fresh);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Giro indisponível.");
    } finally {
      setBusy(false);
    }
  }

  if (!data)
    return error ? (
      <main id="body-content" className="mx-auto max-w-shelf px-4 py-12">
        <p role="alert" className="mb-4 text-sm text-red-300">
          {error}
        </p>
        <button type="button" className="btn-ice" onClick={() => void load()}>
          Tentar de novo
        </button>
      </main>
    ) : (
      <GachaPageSkeleton kind="skins" />
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
          <h1 className="font-display text-display-lg text-ice">Giro de skins</h1>
          <p className="mt-2 text-mist">
            Colecione retratos de personagens do MyAnimeList.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-mist">
            Cristais
          </p>
          <p className="font-display text-2xl text-ice">
            {(data.crystalBalance - data.crystalReserved).toLocaleString(
              "pt-BR",
            )}
          </p>
          {!!data.crystalReserved && (
            <p className="text-caption text-mist">
              {data.crystalReserved.toLocaleString("pt-BR")} reservados em
              trocas
            </p>
          )}
        </div>
      </div>
      <section className="mb-10 flex flex-wrap items-center justify-between gap-4 border border-hairline bg-panel p-5">
        <div>
          <p className="font-semibold text-ice">1 giro grátis por semana</p>
          <p className="text-sm text-mist">
            O giro é gratuito e volta a ficar disponível após o tempo indicado.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
            <Link
              href="/gacha/enciclopedia?view=skins"
              className="inline-flex min-h-11 items-center text-sm text-ice underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
            >
              Explorar catálogo ({data.meta.total.toLocaleString("pt-BR")})
            </Link>
            <Link
              href="/gacha/colecao#skins"
              className="inline-flex min-h-11 items-center text-sm text-ice underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
            >
              Minha coleção ({owned.length})
            </Link>
          </div>
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
      <section className="mb-10" aria-labelledby="recent-skin-spins-heading">
        <div className="mb-4">
          <h2
            id="recent-skin-spins-heading"
            className="font-display text-display-sm text-ice"
          >
            Giros recentes
          </h2>
          <p className="mt-1 text-body-sm text-mist">
            Skins reveladas por outros jogadores.
          </p>
        </div>
        <RecentSkinSpins />
      </section>
      <section
        aria-labelledby="skin-how-it-works-heading"
        className="border border-hairline bg-panel p-5"
      >
        <h2
          id="skin-how-it-works-heading"
          className="font-display text-xl text-ice"
        >
          Como funcionam as skins
        </h2>
        <p className="mt-2 max-w-prose text-body-sm text-mist">
          Um giro grátis por semana desbloqueia um retrato. Equipe uma skin da
          sua coleção para usá-la como avatar.
        </p>
      </section>
      <p className="mt-8 text-xs text-mist">
        <Link href="/gacha" className="text-ice underline">
          Voltar ao gacha
        </Link>
      </p>
    </main>
  );
}
