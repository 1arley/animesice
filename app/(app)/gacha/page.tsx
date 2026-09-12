"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { RollStage } from "@/components/gacha/RollStage";
import { SpinPreviewCard } from "@/components/gacha/SpinPreviewCard";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { isValidRemoteUrl } from "@/lib/url";
import { GachaCard } from "@/components/gacha/GachaCard";
import { SectionLabel } from "@/components/common/SectionLabel";
import { Avatar } from "@/components/common/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardPreview } from "@/components/gacha/CardPreview";
import type {
  GachaPull,
  GachaRankingEntry,
  GachaSpinPreview,
  GachaStatus,
} from "@/types";

function formatCountdown(target: string | null, now: number): string | null {
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

const BYPASS_POLL_MS = 3000;
const BYPASS_POLL_MAX_MS = 10 * 60_000;

/** Adapta um preview de giro para o RollStage (sem edição, sem dono). */
function spinToStagePull(spin: GachaSpinPreview): GachaPull {
  return {
    id: spin.id,
    condition: spin.condition,
    conditionLabel: spin.conditionLabel,
    foil: spin.foil,
    edition: 0,
    value: spin.value,
    obtainedAt: spin.createdAt,
    user: { id: "", name: null, userName: null, avatar: null },
    card: spin.card,
  };
}

/** Cristal do gacha — motivo de identidade do hero da sala. */
function CrystalIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2.5 3.5 8l1.6 12h13.8l1.6-12L12 2.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="m12 2.5-3.6 5.5L12 21.5 15.6 8 12 2.5Z"
        fill="currentColor"
        opacity="0.35"
      />
      <path
        d="M3.5 8h17M8.4 8l3.6 13.5M15.6 8 12 21.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        opacity="0.6"
      />
    </svg>
  );
}

function GachaPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const reduceMotion = usePrefersReducedMotion();
  const [stageOpen, setStageOpen] = useState(false);
  const [status, setStatus] = useState<GachaStatus | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [recent, setRecent] = useState<GachaPull[]>([]);
  const [ranking, setRanking] = useState<GachaRankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<GachaPull | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<GachaPull | null>(null);
  const [spins, setSpins] = useState<GachaSpinPreview[]>([]);
  const [selectedSpinId, setSelectedSpinId] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<GachaSpinPreview | null>(null);
  const [claimResult, setClaimResult] = useState<GachaPull | null>(null);
  const [stagePreview, setStagePreview] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [bypassPending, setBypassPending] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = searchParams.get("card");
    if (!id) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    api
      .gachaPublicCard(id)
      .then((pull) => {
        if (!cancelled) setPreview(pull);
      })
      .catch(() => {
        if (!cancelled) setError("Carta indisponível ou privada.");
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  function closePreview() {
    setPreview(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("card");
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, r, k] = await Promise.all([
          user ? api.gachaStatus().catch(() => null) : null,
          api.gachaRecent(12).catch(() => []),
          api.gachaRanking(10).catch(() => []),
        ]);
        const sp = user ? await api.gachaSpins().catch(() => []) : [];
        if (cancelled) return;
        setStatus(s);
        setStatusError(!!user && s === null);
        setRecent(r);
        setRanking(k);
        setSpins(sp);
        if (sp.length > 0) setSelectedSpinId(sp[sp.length - 1]?.id ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-refresh na virada da hora / fim do lock.
  useEffect(() => {
    if (!user || !status) return;
    const targets = [status.nextSpinAt, status.nextClaimAt].filter(
      (t): t is string => t != null,
    );
    const currentTime = Date.now();
    const nextHour = (Math.floor(currentTime / 3_600_000) + 1) * 3_600_000;
    const ms = Math.min(
      nextHour - currentTime,
      ...targets.map((t) => new Date(t).getTime() - currentTime),
    );
    if (!Number.isFinite(ms)) return;
    const timer = setTimeout(() => void refresh(), Math.max(0, ms) + 2000);
    return () => clearTimeout(timer);
  }, [user, status]);

  async function refresh() {
    try {
      const [s, r] = await Promise.all([
        api.gachaStatus().catch(() => null),
        api.gachaRecent(12).catch(() => []),
      ]);
      const sp = await api.gachaSpins().catch(() => []);
      setStatus(s);
      setStatusError(s === null);
      setRecent(r);
      setSpins(sp);
    } catch {}
  }

  async function handleSpin() {
    setError("");
    if (spinning) return;
    setSpinning(true);
    setSpinResult(null);
    setClaimResult(null);
    setStagePreview(true);
    setStageOpen(true);
    try {
      const previewSpin = await api.gachaSpin();
      setSpins((prev) => [...prev, previewSpin]);
      setSelectedSpinId(previewSpin.id);
      setSpinResult(previewSpin);
      await refresh().catch(() => undefined);
    } catch (err) {
      setStageOpen(false);
      setSpinResult(null);
      setError(err instanceof ApiError ? err.message : "Erro ao girar.");
    } finally {
      setSpinning(false);
    }
  }

  async function handleClaim() {
    if (!selectedSpin || claiming || new Date(selectedSpin.expiresAt).getTime() <= Date.now()) return;
    setError("");
    setClaiming(true);
    try {
      const pull = await api.gachaClaim({ spinId: selectedSpin.id });
      setClaimResult(pull);
      setResult(pull);
      setStagePreview(false);
      setStageOpen(true);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao guardar.");
    } finally {
      setClaiming(false);
    }
  }

  async function handleBypass() {
    if (bypassPending) return;
    setError("");
    setBypassPending(true);
    setCheckoutUrl(null);
    try {
      const res = await api.gachaBypass();
      if ("alreadyUnlocked" in res || "unlocked" in res) {
        await refresh();
        return;
      }
      if (!isValidRemoteUrl(res.checkoutUrl)) throw new Error("Checkout Pix inválido.");
      setCheckoutUrl(res.checkoutUrl);
      const started = Date.now();
      for (;;) {
        await new Promise((r) => setTimeout(r, BYPASS_POLL_MS));
        if (Date.now() - started > BYPASS_POLL_MAX_MS) break;
        try {
          const poll = await api.gachaBypassStatus(res.reference);
          if (poll.status === "PAID") {
            setCheckoutUrl(null);
            await refresh();
            return;
          }
          if (poll.status === "EXPIRED") {
            setCheckoutUrl(null);
            setError("O Pix expirou. Gere uma nova intenção.");
            return;
          }
        } catch {
          break;
        }
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao gerar Pix.");
    } finally {
      setBypassPending(false);
    }
  }


  const selectedSpin = spins.find((s) => s.id === selectedSpinId) ?? null;
  const selectedSpinExpired = selectedSpin != null && new Date(selectedSpin.expiresAt).getTime() <= now;
  const spinCountdown = formatCountdown(status?.nextSpinAt ?? null, now);
  const claimCountdown = formatCountdown(status?.nextClaimAt ?? null, now);
  const canSpinNow = (status?.canSpin ?? status == null) && !spinning;
  const locked = status != null && status.canClaim === false;
  const stagePull = useMemo(
    () =>
      stagePreview
        ? spinResult
          ? spinToStagePull(spinResult)
          : null
        : (claimResult ?? result),
    [stagePreview, spinResult, claimResult, result],
  );

  return (
    <div className="mx-auto max-w-shelf px-4 pb-16 pt-8">
      {stageOpen && (!reduceMotion || stagePull) && (
        <RollStage
          pull={stagePull}
          preview={stagePreview}
          reduceMotion={reduceMotion}
          onClose={() => {
            setStageOpen(false);
            setSpinResult(null);
          }}
        />
      )}
      {preview && <CardPreview pull={preview} onClose={closePreview} />}

      <section className="relative mt-4 overflow-hidden border border-hairline bg-panel">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_90%_at_50%_0%,rgba(56,189,248,0.13),transparent_70%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ice/50 to-transparent"
        />

        <div className="relative px-5 pb-6 pt-10 text-center sm:pb-8 sm:pt-12">
          <p className="font-mono text-caption uppercase tracking-[0.25em] text-ice">
            Sinal no ar · Sala do Gacha
          </p>
          <h1 className="mt-3 flex items-center justify-center gap-3 font-display text-display-lg text-snow">
            <CrystalIcon className="h-7 w-7 text-ice/80" />
            Gacha
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-body-sm text-mist">
            5 giros por hora para revelar cartas. Guarde 1 a cada 12h — girar
            continua liberado durante o bloqueio. Mesma carta, cópias únicas:
            condition, foil e edição definem o valor.
          </p>

          {!user && (
            <div className="mx-auto mt-6 max-w-xl text-left">
              {error && (
                <div
                  role="alert"
                  className="mb-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal"
                >
                  {error}
                </div>
              )}
              <div className="border border-hairline bg-ink/60 p-5 text-center text-body-sm text-mist">
                <Link href="/login" className="text-ice hover:text-snow">
                  Entre
                </Link>{" "}
                com uma conta verificada para girar e completar sets.
              </div>
            </div>
          )}
        </div>

        {user &&
          (loading ? (
            <div className="relative px-6 pb-10 text-center">
              <div className="skeleton mx-auto h-24 max-w-xl" aria-busy="true" />
            </div>
          ) : statusError ? (
            <div className="relative px-6 pb-10 text-center">
              <p className="text-body-sm text-mist">
                Não foi possível carregar o status do gacha. Tente novamente.
              </p>
            </div>
          ) : (
            <>
              <div className="relative px-5 pb-6 text-center sm:pb-8">
                {error && (
                  <div
                    role="alert"
                    className="mx-auto mb-4 max-w-2xl border border-signal/40 bg-signal/10 p-3 text-left text-body-sm text-signal"
                  >
                    {error}
                  </div>
                )}
                <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 border border-hairline bg-ink/60 px-4 py-3 font-mono text-caption text-mist">
                  <span>
                    {status?.spinsLeft != null
                      ? `${status.spinsLeft}/5 giros nesta hora${spinCountdown && status.spinsLeft === 0 ? ` · volta em ${spinCountdown}` : ""}`
                      : status?.canRoll
                        ? "Roll de hoje disponível"
                        : `Volte ${status?.nextRollAt ? new Date(status.nextRollAt).toLocaleString("pt-BR") : "amanhã"}`}
                  </span>
                  <span>
                    {status?.pityDue
                      ? "ÉPICA+ garantida neste giro"
                      : `Pity ÉPICA+ em ${status?.pityDaysLeft ?? 30}d`}
                  </span>
                  {locked && (
                    <span>
                      Próxima carta guardável em {claimCountdown ?? "…"}
                    </span>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleSpin()}
                    disabled={!canSpinNow}
                    className="btn-ice w-fit px-8 py-4 text-body transition-transform duration-150 active:scale-95 motion-reduce:transform-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {spinning ? "Girando…" : `Girar (${status?.spinsLeft ?? 5})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleClaim()}
                    disabled={claiming || !selectedSpin || selectedSpinExpired || locked}
                    title={
                      locked
                        ? "Você já guardou uma carta. Aguarde o fim do bloqueio ou desbloqueie via Pix."
                        : "Guardar a carta selecionada na sua coleção"
                    }
                    className="btn-ghost w-fit px-6 py-4 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {claiming ? "Guardando…" : "Pegar carta"}
                  </button>
                  <Link href="/gacha/collection" className="btn-ghost px-4 py-4">
                    Minha coleção
                  </Link>
                </div>

                {status?.claimWarning && (
                  <div className="mx-auto mt-4 max-w-2xl border border-hairline bg-ink/60 p-3 text-left">
                    <p className="text-body-sm text-mist">
                      {status.claimWarning}
                    </p>
                    {status.bypassPriceCents != null && (
                      <button
                        type="button"
                        onClick={() => void handleBypass()}
                        disabled={bypassPending}
                        className="mt-3 min-h-11 border border-amber-400/60 px-4 font-display text-body-sm text-amber-200 disabled:opacity-40"
                      >
                        {bypassPending
                          ? "Aguardando Pix…"
                          : `Desbloquear agora · R$ ${(status.bypassPriceCents / 100).toFixed(2).replace(".", ",")}`}
                      </button>
                    )}
                    {checkoutUrl && (
                      <a
                        href={checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ice mt-3 inline-block px-4 py-3"
                      >
                        Abrir checkout Pix
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="relative border-t border-hairline px-5 py-6">
                {spins.length > 0 && (
                  <div>
                    <p className="mb-2 font-mono text-caption uppercase tracking-wider text-mist">
                      Previews desta hora ({spins.length}/5)
                    </p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {spins.map((spin) => {
                        const active = spin.id === selectedSpinId;
                        return (
                          <button
                            key={spin.id}
                            type="button"
                            onClick={() => setSelectedSpinId(spin.id)}
                            aria-pressed={active}
                            className={`border p-1 text-left transition-colors ${
                              active
                                ? "border-ice"
                                : "border-hairline hover:border-ice/50"
                            }`}
                          >
                            <SpinPreviewCard spin={spin} />
                          </button>
                        );
                      })}
                    </div>
                    {selectedSpin && (
                      <p className="mt-2 font-mono text-caption text-mist">
                        Selecionada: {selectedSpin.card.name} ·{" "}
                        {selectedSpin.card.rarity} · {selectedSpin.foil}
                        {selectedSpin.claimedAt ? " · já guardada" : ""}
                      </p>
                    )}
                  </div>
                )}

                {result && !stageOpen && !stagePreview && (
                  <div className="mt-6">
                    <SectionLabel level={2}>Sua carta</SectionLabel>
                    <div className="w-44 max-w-full">
                      <GachaCard pull={result} />
                    </div>
                  </div>
                )}
              </div>
            </>
          ))}
      </section>

      <section className="mt-10">
        <SectionLabel level={2}>Últimos pulls</SectionLabel>
        {recent.length === 0 ? (
          <EmptyState
            text="Nenhum pull ainda. Seja o primeiro."
            variant="compact"
          />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {recent.map((pull) => (
              <div key={pull.id}>
                <Link href={`/gacha?card=${pull.id}`}>
                  <GachaCard pull={pull} linkAnime={false} />
                </Link>
                <Link
                  href={`/users/${pull.user.userName ?? pull.user.id}`}
                  className="mt-1 block truncate font-mono text-caption text-mist-soft hover:text-ice"
                >
                  @{pull.user.userName ?? "usuário"}
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <SectionLabel level={2}>Como funciona</SectionLabel>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="border border-hairline bg-panel p-4 text-body-sm text-mist">
            <p className="font-medium text-snow">Raridade</p>
            <ul className="mt-2 space-y-1 font-mono text-caption">
              <li className="text-mist">COMUM — 55%</li>
              <li className="text-emerald-400">INCOMUM — 25%</li>
              <li className="text-sky-400">RARA — 12%</li>
              <li className="text-violet-400">ÉPICA — 5,5%</li>
              <li className="text-amber-300">LENDÁRIA — 2%</li>
              <li className="text-rose-400">MÍTICA — 0,4%</li>
              <li className="bg-gradient-to-r from-violet-400 via-pink-400 to-sky-400 bg-clip-text text-transparent">
                GALÁCTICA — 0,1%
              </li>
            </ul>
            <p className="mt-3">
              30 dias sem ÉPICA+ ativa o pity: próximo roll garante ÉPICA ou
              melhor — com 2% de chance de GALÁCTICA.
            </p>
          </div>
          <div className="border border-hairline bg-panel p-4 text-body-sm text-mist">
            <p className="font-medium text-snow">Sua cópia é única</p>
            <ul className="mt-2 space-y-1 font-mono text-caption">
              <li>
                Foil: NORMAL 85% · <span className="text-ice">HOLO 12%</span> ·{" "}
                <span className="text-amber-300">GOLD 3%</span>
              </li>
              <li>
                Condition: <span className="text-ice">MINT</span> &gt; NM &gt;
                EX &gt; PLAYED &gt; POOR
              </li>
              <li>
                Edição: #1 a #10 valem bônus alto — quanto menor, mais rara
              </li>
            </ul>
            <p className="mt-3">
              Value = base da raridade × condition × foil + bônus de edição
              baixa. Sua coleção vale a soma.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <SectionLabel level={2}>Ranking</SectionLabel>
        {ranking.length === 0 ? (
          <EmptyState text="Ranking vazio por enquanto." variant="compact" />
        ) : (
          <ol className="divide-y divide-hairline border border-hairline bg-panel">
            {ranking.map((entry, i) => (
              <li key={entry.user.id} className="flex items-center gap-3 p-3">
                <span className="w-6 shrink-0 font-mono text-caption text-mist">
                  {i + 1}
                </span>
                <Avatar
                  name={entry.user.name || entry.user.userName}
                  src={entry.user.avatar}
                  size={28}
                />
                <Link
                  href={`/users/${entry.user.userName ?? entry.user.id}`}
                  className="min-w-0 flex-1 truncate text-body-sm text-snow hover:text-ice"
                >
                  {entry.user.name || entry.user.userName || "Usuário"}
                </Link>
                <span className="shrink-0 font-mono text-caption text-mist-soft">
                  {entry.pulls} cartas · {entry.totalValue} pts
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

export default function GachaPage() {
  return (
    <Suspense>
      <GachaPageContent />
    </Suspense>
  );
}
