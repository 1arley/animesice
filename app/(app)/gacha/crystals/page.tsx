"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardBackSvg } from "@/components/gacha/CardBackSvg";
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
  const { user, loading: authLoading } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [events, setEvents] = useState<CrystalEvent[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shop, setShop] = useState<GachaShopItem[]>([]);
  const [activeBack, setActiveBack] = useState<string | null>(null);
  const [equipping, setEquipping] = useState(false);
  const [shopLoading, setShopLoading] = useState(true);
  const [shopError, setShopError] = useState("");
  const [buying, setBuying] = useState<string | null>(null);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [dailyClaimedToday, setDailyClaimedToday] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [packages, setPackages] = useState<
    Array<{ id: string; cents: number; crystals: number }>
  >([...CRYSTAL_PACKAGES]);
  const [dailyBonus, setDailyBonus] = useState(350);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const purchaseKeys = useRef<Record<string, string>>({});
  const { toast } = useToast();

  const loadShop = useCallback(async () => {
    setShopLoading(true);
    setShopError("");
    try {
      const s = await api.gachaShop();
      setShop(s.cosmetics);
      setActiveBack(s.activeCardBack ?? null);
    } catch {
      setShopError("Não foi possível carregar a loja.");
    } finally {
      setShopLoading(false);
    }
  }, []);

  const loadPackages = useCallback(async () => {
    try {
      const odds = await api.gachaEconomyOdds();
      setPackages(odds.crystalPackages);
      setDailyBonus(odds.dailyBonus);
    } catch {}
  }, []);

  async function handleBuy(key: string) {
    if (buying !== null) return;
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
      toast(`Bônus diário: +${res.claimed} cristais.`, "success");
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

  async function handleRedeemCode(e: React.FormEvent) {
    e.preventDefault();
    setRedeeming(true);
    setError("");
    try {
      const result = await api.gachaRedeemCode(redeemCode);
      setRedeemCode("");
      setBalance(result.balance);
      toast(
        `Código resgatado: +${result.crystals.toLocaleString("pt-BR")} cristais.`,
        "success",
      );
      await load(1, false);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Não foi possível resgatar o código.",
      );
    } finally {
      setRedeeming(false);
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
    if (equipping) return;
    setEquipping(true);
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
    } finally {
      setEquipping(false);
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
      setError("Não foi possível carregar seus cristais.");
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

  if (authLoading)
    return (
      <main
        className="mx-auto max-w-shelf px-4 py-12"
        aria-label="Carregando carteira"
        aria-busy="true"
      >
        <div className="skeleton h-48" />
      </main>
    );

  if (!user)
    return (
      <main className="mx-auto max-w-shelf px-4 py-16">
        <Link href="/login" className="text-ice">
          Entre para ver seus cristais.
        </Link>
      </main>
    );

  return (
    <main className="mx-auto max-w-shelf px-4 pb-16 pt-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <p className="shelf-label">Gacha / Sua carteira</p>
          <h1 className="font-display text-3xl text-snow sm:text-4xl">
            Cristais
          </h1>
          <p className="mt-2 max-w-xl text-body-sm text-mist">
            Cuide do saldo, resgate recompensas e personalize sua coleção.
          </p>
        </div>
        <Link href="/gacha/mercado" className="btn-ghost min-h-11 px-4">
          Ir ao mercado
        </Link>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section
          aria-labelledby="wallet-title"
          className="border border-ice/30 bg-panel p-5 sm:p-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="wallet-title" className="text-body-sm text-mist">
              Seu saldo
            </h2>
            <a
              href="#crystal-packages"
              className="inline-flex min-h-11 items-center text-body-sm text-ice hover:underline"
            >
              Adicionar cristais
            </a>
          </div>
          <p
            className="mt-2 font-display text-4xl tabular-nums text-snow sm:text-5xl"
            aria-live="polite"
          >
            {balance == null ? "—" : balance.toLocaleString("pt-BR")}
            <span className="ml-2 text-base font-normal text-mist">
              cristais
            </span>
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
            <div>
              <p className="text-body-sm text-snow">Bônus diário</p>
              <p className="mt-1 text-caption text-mist">
                {dailyClaimedToday
                  ? "Tudo certo. Volte amanhã para resgatar novamente."
                  : `Mais ${dailyBonus.toLocaleString("pt-BR")} cristais para sua coleção.`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleDailyBonus()}
              disabled={loading || claimingDaily || dailyClaimedToday}
              className="btn-ice min-h-11 px-4 disabled:opacity-50"
            >
              {dailyClaimedToday
                ? "Resgatado hoje"
                : claimingDaily
                  ? "Resgatando…"
                  : "Resgatar bônus"}
            </button>
          </div>
        </section>
        <form
          onSubmit={handleRedeemCode}
          className="flex flex-col justify-center border border-hairline bg-panel p-5 sm:p-7"
        >
          <label
            htmlFor="crystal-code"
            className="font-display text-xl text-snow"
          >
            Tem um código?
          </label>
          <p id="crystal-code-hint" className="mt-2 text-body-sm text-mist">
            Resgate aqui os cristais de um código promocional.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <input
              id="crystal-code"
              aria-describedby="crystal-code-hint"
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
              placeholder="Ex.: ICE-2500"
              className="field min-h-11 min-w-0 flex-[1_1_10rem]"
              autoComplete="off"
              maxLength={64}
              required
            />
            <button
              type="submit"
              disabled={redeeming || !redeemCode.trim()}
              className="btn-ghost min-h-11 px-4 disabled:opacity-50"
            >
              {redeeming ? "Resgatando…" : "Resgatar código"}
            </button>
          </div>
        </form>
      </div>
      <nav
        aria-label="Nesta página"
        className="mt-6 flex flex-wrap gap-2 border-b border-hairline pb-4"
      >
        <a href="#crystal-packages" className="btn-ghost min-h-11 px-4">
          Comprar cristais
        </a>
        <a href="#cosmetics" className="btn-ghost min-h-11 px-4">
          Capas e cosméticos
        </a>
        <a href="#statement" className="btn-ghost min-h-11 px-4">
          Extrato
        </a>
      </nav>

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
              tabIndex={-1}
              className="font-display text-2xl text-snow"
            >
              Comprar cristais
            </h2>
            <p className="mt-1 text-body-sm text-mist">
              Escolha um pacote e pague via Pix. O saldo é atualizado após a
              confirmação.
            </p>
          </div>
          <Link href="/gacha/mercado" className="btn-ghost min-h-11 px-4">
            Abrir Mercado
          </Link>
        </div>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {packages.map((pack) => (
            <li
              key={pack.id}
              className="flex flex-col border border-hairline bg-panel p-5"
            >
              <p className="font-display text-xl tabular-nums text-ice">
                {pack.crystals.toLocaleString("pt-BR")}
                <span className="mt-1 block text-caption font-normal text-mist">
                  cristais
                </span>
              </p>
              <p className="mt-4 text-lg tabular-nums text-snow">
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
                {buying === pack.id ? "Criando Pix…" : "Comprar via Pix"}
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

      <section
        id="cosmetics"
        aria-labelledby="cosmetics-title"
        className="mt-10 scroll-mt-24"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="cosmetics-title"
              className="font-display text-2xl text-snow"
            >
              Capas e cosméticos
            </h2>
            <p className="mt-1 text-body-sm text-mist">
              A capa escolhida será usada no verso de todas as suas cartas.
            </p>
          </div>
          <Link
            href="/gacha/colecao"
            className="inline-flex min-h-11 items-center text-body-sm text-ice hover:underline"
          >
            Ver minha coleção
          </Link>
        </div>
        {shopError && (
          <div
            role="alert"
            className="mt-4 flex flex-wrap items-center gap-3 border border-signal/40 p-4 text-body-sm text-signal"
          >
            {shopError}
            <button
              type="button"
              onClick={() => void loadShop()}
              className="btn-ghost min-h-11 px-3"
            >
              Tentar novamente
            </button>
          </div>
        )}
        {shopLoading ? (
          <div
            className="skeleton mt-4 h-56"
            aria-label="Carregando cosméticos"
            aria-busy="true"
          />
        ) : shop.length === 0 && !shopError ? (
          <p className="mt-4 border border-dashed border-hairline p-5 text-body-sm text-mist">
            Nenhum cosmético disponível no momento.
          </p>
        ) : (
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shop.map((item) => {
              const insufficient = balance != null && balance < item.price;
              const isBack =
                item.type === "BACK" ||
                (!item.type && item.key.startsWith("BACK_"));
              const active = activeBack === item.key;
              return (
                <li
                  key={item.key}
                  className={`flex min-w-0 flex-col border bg-panel ${active ? "border-ice/60" : "border-hairline"}`}
                >
                  {isBack && (
                    <div className="flex h-52 items-center justify-center border-b border-hairline bg-ink p-5">
                      <CardBackSvg
                        backKey={item.key}
                        className="aspect-[3/4] h-full object-contain"
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-caption">
                      <span className="text-mist">
                        {isBack
                          ? "Capa de carta"
                          : item.type === "FRAME"
                            ? "Moldura"
                            : "Cosmético"}
                      </span>
                      {item.owned && (
                        <span className="font-mono text-ice">SEU</span>
                      )}
                    </div>
                    <h3 className="mt-2 font-display text-xl text-snow">
                      {item.label}
                    </h3>
                    <p className="mt-2 text-body-sm text-mist">
                      {item.description}
                    </p>
                    <div className="mt-auto pt-5">
                      {item.owned ? (
                        isBack ? (
                          <>
                            <p
                              className="mb-2 text-caption text-mist"
                              role="status"
                            >
                              {active
                                ? "Equipada em todas as suas cartas"
                                : "Pronta para usar na sua coleção"}
                            </p>
                            <button
                              type="button"
                              disabled={equipping}
                              onClick={() =>
                                void handleBack(active ? null : item.key)
                              }
                              className={`${active ? "btn-ghost" : "btn-ice"} min-h-11 w-full px-3 disabled:opacity-50`}
                            >
                              {equipping
                                ? "Atualizando…"
                                : active
                                  ? "Remover capa"
                                  : "Usar capa"}
                            </button>
                          </>
                        ) : (
                          <p className="text-body-sm text-ice">
                            Na sua coleção
                          </p>
                        )
                      ) : (
                        <>
                          <p className="mb-3 font-display text-lg tabular-nums text-snow">
                            {item.price.toLocaleString("pt-BR")}{" "}
                            <span className="text-caption text-mist">
                              cristais
                            </span>
                          </p>
                          <button
                            type="button"
                            onClick={() => void handleBuy(item.key)}
                            disabled={
                              balance == null || buying !== null || insufficient
                            }
                            className="btn-ice min-h-11 w-full px-3 disabled:opacity-50"
                          >
                            {buying === item.key
                              ? "Comprando…"
                              : balance == null
                                ? "Carregando saldo…"
                                : insufficient
                                  ? "Saldo insuficiente"
                                  : "Comprar cosmético"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div id="statement" className="scroll-mt-24">
        <SectionLabel level={2}>Extrato</SectionLabel>
      </div>

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
                {event.delta.toLocaleString("pt-BR")} cristais
              </span>
            </li>
          ))}
        </ul>
      )}

      {!loading && events.length < total && (
        <button
          type="button"
          onClick={() => void load(page + 1, true)}
          className="btn-ghost mt-4 min-h-11 px-4"
        >
          Carregar mais ({events.length}/{total})
        </button>
      )}
    </main>
  );
}
