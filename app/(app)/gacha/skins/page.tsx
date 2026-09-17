"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { GachaSkin, GachaSkinsResponse } from "@/types";

function countdown(target: string | null): string | null {
  if (!target) return null;
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h ? `${h}h ${m}m` : `${m}m`;
}

export default function GachaSkinsPage() {
  const [data, setData] = useState<GachaSkinsResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  const load = () =>
    api
      .gachaSkins()
      .then(setData)
      .catch((e: unknown) =>
        setError(
          e instanceof ApiError
            ? e.message
            : "Não foi possível carregar skins.",
        ),
      );
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 30000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = countdown(data?.nextSpinAt ?? null);
  const owned = data?.skins.filter((skin) => skin.owned) ?? [];

  async function spin() {
    if (!data?.canSpin || busy) return;
    setBusy(true);
    setError("");
    try {
      await api.gachaSkinSpin();
      await load();
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
      await api.gachaEquipSkin(skin?.id ?? null);
      await load();
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
        Carregando skins...
      </main>
    );

  return (
    <main id="body-content" className="mx-auto max-w-shelf px-4 py-10">
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
          <p className="font-semibold text-ice">1 giro a cada 12 horas</p>
          <p className="text-sm text-mist">
            Giro imediato custa {data.spinPrice.toLocaleString("pt-BR")}{" "}
            cristais.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void spin()}
          disabled={!data.canSpin || busy}
          className="btn-ice disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy
            ? "Girando..."
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
            <h2 className="font-display text-xl text-ice">Sua coleção</h2>
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
        <h2 className="mb-4 font-display text-xl text-ice">Catálogo</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {data.skins.map((skin) => (
            <SkinTile
              key={skin.id}
              skin={skin}
              busy={busy}
              onEquip={() => void equip(skin)}
            />
          ))}
        </div>
      </section>
      <p className="mt-8 text-xs text-mist">
        Imagens: MyAnimeList.{" "}
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
