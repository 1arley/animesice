"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionLabel } from "@/components/common/SectionLabel";
import type {
  CrystalEvent,
  CrystalEventType,
  GachaShopItem,
} from "@/types";

const PAGE_SIZE = 20;

const TYPE_LABEL: Record<CrystalEventType, string> = {
  MINT: "Carta guardada",
  SPEND: "Gasto",
  DAILY: "Bônus diário",
  PURCHASE: "Compra Pix",
  SALE: "Venda no mercado",
  ADMIN: "Ajuste da equipe",
};

export default function GachaPointsPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [events, setEvents] = useState<CrystalEvent[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shop, setShop] = useState<GachaShopItem[]>([]);
  const [buying, setBuying] = useState<string | null>(null);
  const [claimingDaily, setClaimingDaily] = useState(false);

  const loadShop = useCallback(async () => {
    try {
      const s = await api.gachaShop();
      setShop(s.cosmetics);
    } catch {}
  }, []);

  async function handleBuy(key: string) {
    setBuying(key);
    setError("");
    try {
      await api.gachaBuyCosmetic({ key });
      await Promise.all([loadShop(), load(1, false)]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível concluir a compra.",
      );
    } finally {
      setBuying(null);
    }
  }

  async function handleDailyBonus() {
    setClaimingDaily(true);
    setError("");
    try {
      const res = await api.gachaDailyBonus();
      setBalance(res.balance);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Não foi possível resgatar o bônus.",
      );
    } finally {
      setClaimingDaily(false);
    }
  }

  const load = useCallback(async (target: number, append: boolean) => {
    try {
      const data = await api.gachaCrystals(target, PAGE_SIZE);
      setBalance(data.balance);
      setTotal(data.meta.total);
      setEvents((prev) =>
        append ? [...prev, ...data.events] : data.events,
      );
      setPage(target);
    } catch {
      setError("Não foi possível carregar seus Crystais.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void load(1, false);
    void loadShop();
  }, [user, load, loadShop]);

  if (!user)
    return (
      <main className="mx-auto max-w-shelf px-4 py-16">
        <Link href="/login" className="text-ice">
          Entre para ver seus Crystais.
        </Link>
      </main>
    );

  return (
    <main className="mx-auto max-w-shelf px-4 pb-16 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-lg text-snow">Crystais</h1>
          <p className="text-body-sm text-mist">
            Moeda do gacha — use para reroll, mercado e loja.
          </p>
        </div>
        <Link href="/gacha" className="btn-ghost px-4 py-2">
          Voltar ao gacha
        </Link>
      </div>

      <div className="mt-6 border border-hairline bg-panel px-4 py-5">
        <p className="font-mono text-caption text-mist">SALDO</p>
        <p className="font-display text-display-lg text-snow">
          {balance == null ? "—" : balance.toLocaleString("pt-BR")} 💎
        </p>
        <button
          type="button"
          onClick={() => void handleDailyBonus()}
          disabled={claimingDaily}
          className="btn-ghost mt-3 px-4 py-2 font-mono text-caption disabled:opacity-50"
        >
          {claimingDaily ? "Resgatando…" : "Bônus diário · 100 💎"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal"
        >
          {error}
        </div>
      )}

      {shop.length > 0 && (
        <>
          <SectionLabel level={2}>Loja</SectionLabel>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {shop.map((item) => (
              <li
                key={item.key}
                className="flex items-start justify-between gap-3 border border-hairline bg-panel p-4"
              >
                <div className="min-w-0">
                  <p className="font-display text-body-sm text-snow">
                    {item.label}
                  </p>
                  <p className="mt-1 text-caption text-mist">
                    {item.description}
                  </p>
                </div>
                {item.owned ? (
                  <span className="shrink-0 font-mono text-caption text-ice">
                    SEU
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleBuy(item.key)}
                    disabled={buying !== null}
                    className="btn-ghost shrink-0 px-3 py-2 font-mono text-caption disabled:opacity-50"
                  >
                    {buying === item.key
                      ? "…"
                      : `Comprar · ${item.price.toLocaleString("pt-BR")} 💎`}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <SectionLabel level={2}>Extrato</SectionLabel>
      {loading ? (
        <div className="skeleton mt-3 h-32" aria-busy="true" />
      ) : events.length === 0 ? (
        <EmptyState
          text="Nenhum Crystal ainda. Guarde uma carta no gacha para ganhar."
          variant="compact"
        />
      ) : (
        <ul className="mt-3 divide-y divide-hairline border border-hairline bg-panel">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-body-sm text-snow">
                  {event.type === "MINT" && event.refId ? (
                    <Link
                      href={`/gacha?card=${event.refId}`}
                      className="hover:text-ice"
                    >
                      {TYPE_LABEL[event.type]}
                    </Link>
                  ) : (
                    TYPE_LABEL[event.type]
                  )}
                </p>
                <p className="text-caption text-mist">
                  {new Date(event.createdAt).toLocaleString("pt-BR")}
                  {event.reason ? ` · ${event.reason}` : ""}
                </p>
              </div>
              <span
                className={`shrink-0 font-mono text-body-sm ${
                  event.delta >= 0 ? "text-emerald-300" : "text-signal"
                }`}
              >
                {event.delta >= 0 ? "+" : ""}
                {event.delta.toLocaleString("pt-BR")} 💎
              </span>
            </li>
          ))}
        </ul>
      )}

      {!loading && events.length < total && (
        <button
          type="button"
          onClick={() => void load(page + 1, true)}
          className="btn-ghost mt-4 px-4 py-2"
        >
          Carregar mais ({events.length}/{total})
        </button>
      )}
    </main>
  );
}
