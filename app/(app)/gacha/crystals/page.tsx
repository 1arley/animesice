"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionLabel } from "@/components/common/SectionLabel";
import {
  GachaPanelGridSkeleton,
  GachaRowsSkeleton,
} from "@/components/gacha/GachaPageSkeleton";
import { useToast } from "@/components/common/ToastProvider";
import type { CrystalEvent, CrystalEventType } from "@/types";

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
  const [reserved, setReserved] = useState(0);
  const [events, setEvents] = useState<CrystalEvent[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [packages, setPackages] = useState<
    Array<{ id: string; cents: number; crystals: number }>
  >([...CRYSTAL_PACKAGES]);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const purchaseKeys = useRef<Record<string, string>>({});
  const { toast } = useToast();

  const loadPackages = useCallback(async () => {
    try {
      const odds = await api.gachaEconomyOdds();
      setPackages(odds.crystalPackages);
    } catch {}
  }, []);

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

  const load = useCallback(async (target: number, append: boolean) => {
    try {
      const data = await api.gachaCrystals(target, PAGE_SIZE);
      setBalance(data.balance);
      setReserved(data.reserved);
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
    void loadPackages();
  }, [user, load, loadPackages]);

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
        <GachaPanelGridSkeleton
          count={2}
          label="Carregando carteira"
          className="mt-0 lg:grid-cols-2"
        />
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
            Compre Cristais e acompanhe seu saldo e extrato. Ofertas e
            recompensas diárias ficam na Loja.
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
            {balance == null
              ? "—"
              : (balance - reserved).toLocaleString("pt-BR")}
            <span className="ml-2 text-base font-normal text-mist">
              disponíveis
            </span>
          </p>
          <p className="mt-2 text-body-sm text-mist">
            Total: {balance == null ? "—" : balance.toLocaleString("pt-BR")} ·{" "}
            {reserved.toLocaleString("pt-BR")} reservados em trocas pendentes
          </p>
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
        <Link href="/gacha/loja#cosmetics" className="btn-ghost min-h-11 px-4">
          Capas e cosméticos
        </Link>
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

      <section className="mt-10 border border-hairline bg-panel p-5">
        <h2 className="font-display text-2xl text-snow">Capas e cosméticos</h2>
        <p className="mt-2 text-body-sm text-mist">
          A loja de itens visuais fica junto das ofertas diárias e do mercado
          noturno.
        </p>
        <Link
          href="/gacha/loja#cosmetics"
          className="btn-ghost mt-4 inline-flex min-h-11 items-center px-4"
        >
          Abrir capas e cosméticos
        </Link>
      </section>

      <div id="statement" className="scroll-mt-24">
        <SectionLabel level={2}>Extrato</SectionLabel>
      </div>

      {loading ? (
        <GachaRowsSkeleton
          count={5}
          label="Carregando extrato de cristais"
          className="mt-3"
        />
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
