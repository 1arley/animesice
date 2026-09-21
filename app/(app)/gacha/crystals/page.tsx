"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionLabel } from "@/components/common/SectionLabel";
import { useToast } from "@/components/common/ToastProvider";
import type { CrystalEvent, CrystalEventType, GachaShopItem } from "@/types";

const PAGE_SIZE = 20;

const CRYSTAL_PACKAGES = [
  { id: "BRL_490", cents: 490, crystals: 950 },
  { id: "BRL_990", cents: 990, crystals: 2_000 },
  { id: "BRL_1990", cents: 1_990, crystals: 4_200 },
  { id: "BRL_2990", cents: 2_990, crystals: 6_500 },
  { id: "BRL_4990", cents: 4_990, crystals: 11_250 },
] as const;

const TYPE_LABEL: Record<CrystalEventType, string> = {
  INITIAL: "Saldo inicial",
  MINT: "Carta guardada",
  DAILY: "Bônus diário",
  SPEND: "Gasto",
  PURCHASE: "Compra Pix",
  SALE: "Venda no mercado",
  TAX: "Taxa do mercado",
  ADMIN: "Ajuste da equipe",
  BURN: "Carta queimada",
  CHARGEBACK: "Reversão de pagamento",
};

export default function GachaCrystalsPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [events, setEvents] = useState<CrystalEvent[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shop, setShop] = useState<GachaShopItem[]>([]);
  const [activeBack, setActiveBack] = useState<string | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [dailyClaimedToday, setDailyClaimedToday] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [packages, setPackages] = useState<
    Array<{ id: string; cents: number; crystals: number }>
  >([...CRYSTAL_PACKAGES]);
  const [dailyBonus, setDailyBonus] = useState(350);
  const purchaseKeys = useRef<Record<string, string>>({});
  const { toast } = useToast();

  const loadShop = useCallback(async () => {
    try {
      const s = await api.gachaShop();
      setShop(s.cosmetics);
      setActiveBack(s.activeCardBack ?? null);
    } catch {}
  }, []);

  const loadPackages = useCallback(async () => {
    try {
      const odds = await api.gachaEconomyOdds();
      setPackages(odds.crystalPackages);
      setDailyBonus(odds.dailyBonus);
    } catch {}
  }, []);

  async function handleBuy(key: string) {
    setBuying(key);
    setError("");
    try {
      await api.gachaBuyCosmetic({ key });
      await Promise.all([loadShop(), load(1, false)]);
      toast("Cosmético comprado. Clique em Usar para equipar.", "success");
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Não foi possível concluir a compra.";
      setError(msg);
      if (
        /insuficiente|indisponível|vendid|expir|já foi|said|already|sold|conflict/i.test(
          msg,
        )
      ) {
        await Promise.all([loadShop(), load(1, false)]);
      }
    } finally {
      setBuying(null);
    }
  }

  async function handleDailyBonus() {
    setClaimingDaily(true);
    setError("");
    try {
      const res = await api.gachaEconomyDaily();
      setDailyClaimedToday(true);
      toast(`Bônus diário: +${res.claimed} 💎.`, "success");
      await load(1, false);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : "Não foi possível resgatar o bônus.";
      if (/resgatado|claimed|already/i.test(msg)) {
        setDailyClaimedToday(true);
        await load(1, false);
      } else {
        setError(msg);
      }
    } finally {
      setClaimingDaily(false);
    }
  }

  async function handleCrystalPurchase(packageId: string) {
    setBuying(packageId);
    setCheckoutUrl(null);
    setError("");
    try {
      const idempotencyKey =
        purchaseKeys.current[packageId] ?? crypto.randomUUID();
      purchaseKeys.current[packageId] = idempotencyKey;
      const result = await api.crystalCheckout(packageId, idempotencyKey);
      if (!result.checkoutUrl)
        throw new Error("Checkout ainda não disponível.");
      delete purchaseKeys.current[packageId];
      setCheckoutUrl(result.checkoutUrl);
      toast("Checkout Pix criado. Abra o link para pagar.", "success");
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Não foi possível criar checkout.",
      );
    } finally {
      setBuying(null);
    }
  }

  async function handleBack(key: string | null) {
    setError("");
    try {
      const result = await api.gachaSetCardBack(key);
      setActiveBack(result.gachaCardBack);
      toast(
        result.gachaCardBack ? "Capa equipada." : "Capa removida.",
        "success",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível trocar a capa.",
      );
    }
  }

  const load = useCallback(async (target: number, append: boolean) => {
    try {
      const data = await api.gachaCrystals(target, PAGE_SIZE);
      setBalance(data.balance);
      setDailyClaimedToday(data.dailyClaimedToday);
      setTotal(data.meta.total);
      setEvents((prev) => (append ? [...prev, ...data.events] : data.events));
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
    void loadPackages();
  }, [user, load, loadShop, loadPackages]);

  useEffect(() => {
    if (!checkoutUrl) return;
    const interval = window.setInterval(() => void load(1, false), 5_000);
    const timeout = window.setTimeout(
      () => window.clearInterval(interval),
      10 * 60_000,
    );
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [checkoutUrl, load]);

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
          <span key={balance} className="balance-pop">
            {balance == null ? "—" : balance.toLocaleString("pt-BR")} 💎
          </span>
        </p>
        <button
          type="button"
          onClick={() => void handleDailyBonus()}
          disabled={claimingDaily || dailyClaimedToday}
          title={
            dailyClaimedToday ? "Bônus diário já resgatado hoje" : undefined
          }
          className="btn-ghost mt-3 px-4 py-2 font-mono text-caption disabled:opacity-50"
        >
          {dailyClaimedToday
            ? "Bônus diário resgatado ✓"
            : claimingDaily
              ? "Resgatando…"
              : `Bônus diário · ${dailyBonus} 💎`}
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

      <section aria-labelledby="crystal-packages" className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="crystal-packages"
              className="font-display text-2xl text-snow"
            >
              Comprar Crystal
            </h2>
            <p className="mt-1 text-body-sm text-mist">
              Pagamento via LivePix. Crédito confirmado pelo processador.
            </p>
          </div>
          <Link href="/gacha/mercado" className="btn-ghost min-h-11 px-4">
            Abrir Mercado
          </Link>
        </div>
        <ul className="mt-4 grid gap-px bg-hairline sm:grid-cols-2 lg:grid-cols-5">
          {packages.map((pack) => (
            <li key={pack.id} className="bg-panel p-4">
              <p className="font-display text-xl tabular-nums text-ice">
                {pack.crystals.toLocaleString("pt-BR")} 💎
              </p>
              <p className="mt-1 text-caption tabular-nums text-mist">
                {(pack.cents / 100).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
              <button
                type="button"
                disabled={buying !== null}
                onClick={() => void handleCrystalPurchase(pack.id)}
                className="btn-ice mt-4 min-h-11 w-full disabled:opacity-40"
              >
                {buying === pack.id ? "Criando…" : "Comprar"}
              </button>
            </li>
          ))}
        </ul>
        {checkoutUrl && (
          <a
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ice mt-4 inline-flex min-h-11 items-center px-5"
          >
            Abrir checkout Pix
          </a>
        )}
      </section>

      {shop.length > 0 && (
        <>
          <SectionLabel level={2}>Loja</SectionLabel>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {shop.map((item) => {
              const insufficient = balance != null && balance < item.price;
              const isBack = item.key.startsWith("BACK_");
              return (
                <li
                  key={item.key}
                  className="flex items-start gap-3 border border-hairline bg-panel p-4"
                >
                  {isBack && item.svg && (
                    <div
                      className="pointer-events-none aspect-[3/4] w-16 shrink-0 overflow-hidden border border-white/10"
                      aria-hidden="true"
                      dangerouslySetInnerHTML={{ __html: item.svg }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-body-sm text-snow">
                      {item.label}
                    </p>
                    <p className="mt-1 text-caption text-mist">
                      {item.description}
                    </p>
                  </div>
                  {item.owned ? (
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-mono text-caption text-ice">
                        SEU
                      </span>
                      {isBack && (
                        <button
                          type="button"
                          onClick={() =>
                            void handleBack(
                              activeBack === item.key ? null : item.key,
                            )
                          }
                          className="btn-ghost min-h-11 px-3 py-2 font-mono text-caption"
                        >
                          {activeBack === item.key ? "Capa ativa" : "Usar capa"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleBuy(item.key)}
                      disabled={
                        balance == null ||
                        (buying !== null && buying !== item.key) ||
                        insufficient
                      }
                      title={
                        balance == null
                          ? "Carregando saldo…"
                          : insufficient
                            ? "Saldo insuficiente"
                            : undefined
                      }
                      className="btn-ghost shrink-0 px-3 py-2 font-mono text-caption disabled:opacity-50"
                    >
                      {buying === item.key
                        ? "…"
                        : `Comprar · ${item.price.toLocaleString("pt-BR")} 💎`}
                    </button>
                  )}
                </li>
              );
            })}
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
