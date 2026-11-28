"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { GachaPrizeRoulette } from "@/components/gacha/GachaPrizeRoulette";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type {
  GachaEconomyInventory,
  GachaRewardsHubResponse,
  GachaRouletteSpinResult,
} from "@/types";

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function GachaRewardsHub() {
  const { user, loading: authLoading } = useAuth();
  const [hub, setHub] = useState<GachaRewardsHubResponse | null>(null);
  const [inventory, setInventory] = useState<GachaEconomyInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyDaily, setBusyDaily] = useState(false);
  const [busyWeekly, setBusyWeekly] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [historyTab, setHistoryTab] = useState<"roulette" | "daily">("roulette");

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setError("");
    try {
      const [hubData, invData] = await Promise.all([
        api.gachaRewardsHub(),
        api.gachaEconomyInventory(),
      ]);
      setHub(hubData);
      setInventory(invData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar a Central de Recompensas.",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  const claimDaily = async () => {
    if (busyDaily) return;
    setBusyDaily(true);
    setError("");
    setFeedback("");
    try {
      const res = await api.gachaEconomyDaily();
      setFeedback(`Recompensa diária resgatada: +${res.claimed} Cristais!`);
      await load();
      window.dispatchEvent(new CustomEvent("animesice:rewards-updated"));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível resgatar a recompensa diária.",
      );
    } finally {
      setBusyDaily(false);
    }
  };

  const claimWeekly = async () => {
    if (busyWeekly) return;
    setBusyWeekly(true);
    setError("");
    setFeedback("");
    try {
      await api.gachaEconomyWeekly();
      setFeedback("Ritual semanal resgatado: +1 Baú Raro e +1 Chave!");
      await load();
      window.dispatchEvent(new CustomEvent("animesice:rewards-updated"));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível resgatar a recompensa semanal.",
      );
    } finally {
      setBusyWeekly(false);
    }
  };

  const handleSpinComplete = useCallback(
    (_result: GachaRouletteSpinResult) => {
      void load();
      window.dispatchEvent(new CustomEvent("animesice:rewards-updated"));
    },
    [load],
  );

  if (authLoading || loading) {
    return (
      <div className="space-y-4 py-6">
        <div className="h-28 animate-pulse border border-hairline bg-panel" />
        <div className="h-96 animate-pulse border border-hairline bg-panel" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="border border-hairline bg-panel p-6">
        <h1 className="font-display text-3xl text-snow">
          Central de Recompensas
        </h1>
        <p className="mt-2 text-body-sm text-mist">
          Entre na sua conta para resgatar Cristais diários, acompanhar seu ritual semanal e girar a Roleta de Prêmios.
        </p>
        <Link href="/entrar" className="btn-ice mt-4 inline-flex min-h-11 items-center px-5">
          Entrar para acessar
        </Link>
      </div>
    );
  }

  const dailyClaimed = inventory?.dailyClaimedToday ?? true;
  const weeklyReady = inventory?.weeklyRewardReady ?? false;
  const spinsAvailable = hub?.spinsAvailable ?? inventory?.rouletteSpins ?? 0;
  const pendingCount = hub?.pendingCount ?? 0;

  return (
    <div className="space-y-6">
      <header className="border border-hairline bg-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-caption uppercase tracking-[0.2em] text-ice">
              Gacha · Recompensas
            </p>
            <h1 className="mt-1 font-display text-3xl text-snow sm:text-4xl">
              Central de Recompensas
            </h1>
            <p className="mt-2 max-w-2xl text-body-sm text-mist">
              Reúna seus Cristais diários, acompanhe o ritual semanal e gire a Roleta de Prêmios com os giros obtidos nas rolagens de cartas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="border border-hairline bg-ink px-4 py-2.5">
              <p className="font-mono text-caption uppercase text-mist">
                Cristais disponíveis
              </p>
              <p className="font-display text-xl text-snow">
                {(inventory?.available ?? 0).toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="flex items-center gap-2.5 border border-ice/40 bg-ice/10 px-4 py-2.5">
              <Image
                src="/gacha/roleta-premios.png"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
                unoptimized
              />
              <div>
                <p className="font-mono text-caption uppercase text-ice">
                  Giros da Roleta
                </p>
                <p className="font-display text-xl text-snow">
                  {spinsAvailable}
                </p>
              </div>
            </div>
            {pendingCount > 0 && (
              <span className="border border-ice bg-ice/15 px-3 py-1.5 font-mono text-caption uppercase text-ice">
                {pendingCount} {pendingCount === 1 ? "pendência" : "pendências"}
              </span>
            )}
          </div>
        </div>

        {feedback && (
          <p role="status" className="mt-4 border border-ice/40 bg-ice/10 p-3 text-body-sm text-ice">
            {feedback}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
            {error}
          </p>
        )}
      </header>

      {/* Recompensas Diárias, Semanais e Watch */}
      <section
        aria-label="Recompensas recorrentes"
        className="grid gap-4 md:grid-cols-3"
      >
        <article className="flex flex-col justify-between border border-hairline bg-panel p-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-caption uppercase tracking-wider text-ice">
                Diária
              </p>
              <span
                className={`px-2 py-0.5 font-mono text-caption ${
                  dailyClaimed
                    ? "border border-hairline text-mist"
                    : "border border-ice/60 bg-ice/15 text-ice"
                }`}
              >
                {dailyClaimed ? "Resgatada hoje" : "Disponível"}
              </span>
            </div>
            <h2 className="mt-2 font-display text-xl text-snow">
              Cristais Diários
            </h2>
            <p className="mt-1 text-body-sm text-mist">
              Resgate gratuito uma vez por dia (horário de Brasília) mantendo as regras padrão da economia.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void claimDaily()}
            disabled={dailyClaimed || busyDaily}
            className="btn-ice mt-4 min-h-11 w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busyDaily
              ? "Resgatando…"
              : dailyClaimed
                ? "Já resgatado hoje"
                : "Resgatar Cristais Diários"}
          </button>
        </article>

        <article className="flex flex-col justify-between border border-hairline bg-panel p-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-caption uppercase tracking-wider text-ice">
                Semanal
              </p>
              <span
                className={`px-2 py-0.5 font-mono text-caption ${
                  weeklyReady
                    ? "border border-ice/60 bg-ice/15 text-ice"
                    : "border border-hairline text-mist"
                }`}
              >
                {weeklyReady ? "Pronto para resgate" : "Em progresso"}
              </span>
            </div>
            <h2 className="mt-2 font-display text-xl text-snow">
              Ritual Semanal
            </h2>
            <p className="mt-1 text-body-sm text-mist">
              Complete 7 resgates diários em uma janela de 10 dias para ganhar 1 Baú Raro e 1 Chave.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void claimWeekly()}
            disabled={!weeklyReady || busyWeekly}
            className="btn-ice mt-4 min-h-11 w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busyWeekly
              ? "Resgatando…"
              : weeklyReady
                ? "Resgatar Baú Raro + Chave"
                : "Continue resgatando diariamente"}
          </button>
        </article>

        <article className="flex flex-col justify-between border border-hairline bg-panel p-5">
          <div>
            <p className="font-mono text-caption uppercase tracking-wider text-ice">
              Episódios &amp; Rolagens
            </p>
            <h2 className="mt-2 font-display text-xl text-snow">
              Outras Fontes
            </h2>
            <p className="mt-1 text-body-sm text-mist">
              Cristais por episódios hoje:{" "}
              <strong className="text-snow">
                {inventory?.watchEarnedToday ?? 0}
              </strong>
              . Ao revelar cartas no Gacha, você também pode receber Giros da Roleta como recompensa adicional.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/gacha"
              className="inline-flex min-h-11 flex-1 items-center justify-center border border-hairline bg-ink px-4 text-body-sm text-snow transition-colors hover:border-ice/50"
            >
              Girar Cartas
            </Link>
            <Link
              href="/gacha/loja"
              className="inline-flex min-h-11 flex-1 items-center justify-center border border-hairline bg-ink px-4 text-body-sm text-mist transition-colors hover:text-snow"
            >
              Ir para Loja
            </Link>
          </div>
        </article>
      </section>

      {/* Roleta Interativa */}
      {hub && (
        <GachaPrizeRoulette
          enabled={hub.enabled}
          spinsAvailable={spinsAvailable}
          prizes={hub.wheelPrizes}
          onSpinComplete={handleSpinComplete}
        />
      )}

      {/* Catálogo uniforme de prêmios disponíveis (sem raridade ou probabilidade na roleta) */}
      {hub && hub.wheelPrizes.length > 0 && (
        <section
          aria-labelledby="roulette-prizes-title"
          className="border border-hairline bg-panel p-5 sm:p-6"
        >
          <h2 id="roulette-prizes-title" className="font-display text-xl text-snow">
            Prêmios disponíveis na roleta
          </h2>
          <p className="mt-1 text-body-sm text-mist">
            Todos os prêmios contemplam os recursos das caixas do Gacha, além da Essência Exclusiva de Código.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {hub.wheelPrizes.map((prize) => (
              <li
                key={prize.id}
                className="flex items-center justify-between border border-hairline bg-ink px-3 py-2.5 text-body-sm text-snow"
              >
                <span className="truncate pr-2">{prize.label}</span>
                <span className="shrink-0 font-mono text-caption text-mist">
                  x{prize.quantity}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Histórico de recompensas recebidas */}
      {hub && (
        <section
          aria-labelledby="rewards-history-title"
          className="border border-hairline bg-panel p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="rewards-history-title" className="font-display text-xl text-snow">
              Histórico de recompensas recebidas
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setHistoryTab("roulette")}
                className={`min-h-9 border px-3 font-mono text-caption ${
                  historyTab === "roulette"
                    ? "border-ice bg-ice/15 text-ice"
                    : "border-hairline bg-ink text-mist hover:text-snow"
                }`}
              >
                Roleta ({hub.recentSpins.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryTab("daily")}
                className={`min-h-9 border px-3 font-mono text-caption ${
                  historyTab === "daily"
                    ? "border-ice bg-ice/15 text-ice"
                    : "border-hairline bg-ink text-mist hover:text-snow"
                }`}
              >
                Diárias &amp; Episódios ({hub.recentDailyClaims.length})
              </button>
            </div>
          </div>

          {historyTab === "roulette" ? (
            hub.recentSpins.length === 0 ? (
              <p className="mt-4 text-body-sm text-mist">
                Você ainda não girou a roleta de prêmios.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-hairline border border-hairline bg-ink">
                {hub.recentSpins.map((spin) => (
                  <li
                    key={spin.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-body-sm"
                  >
                    <div>
                      <p className="font-medium text-snow">{spin.prizeLabel}</p>
                      <p className="font-mono text-caption text-mist">
                        Quantidade: {spin.quantity}
                      </p>
                    </div>
                    <time className="font-mono text-caption text-mist">
                      {DATE_FMT.format(new Date(spin.createdAt))}
                    </time>
                  </li>
                ))}
              </ul>
            )
          ) : hub.recentDailyClaims.length === 0 ? (
            <p className="mt-4 text-body-sm text-mist">
              Nenhum resgate diário ou de episódio registrado recentemente.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-hairline border border-hairline bg-ink">
              {hub.recentDailyClaims.map((ev) => (
                <li
                  key={ev.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-body-sm"
                >
                  <div>
                    <p className="font-medium text-snow">
                      +{ev.delta} Cristais
                    </p>
                    <p className="font-mono text-caption text-mist">
                      {ev.reason ?? (ev.type === "DAILY" ? "Recompensa diária" : "Episódio assistido")}
                    </p>
                  </div>
                  <time className="font-mono text-caption text-mist">
                    {DATE_FMT.format(new Date(ev.createdAt))}
                  </time>
                </li>
              ))}
            </ul>
          )}

          <details className="mt-5 border-t border-hairline pt-4 text-caption text-mist">
            <summary className="cursor-pointer font-mono uppercase tracking-wider text-snow/80">
              Transparência e regras do sistema
            </summary>
            <p className="mt-2 leading-relaxed">{hub.probabilityDisclosure}</p>
          </details>
        </section>
      )}
    </div>
  );
}
