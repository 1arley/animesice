"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { TURNSTILE_SITEKEY, loadTurnstile } from "@/lib/turnstile";
import { RollStage } from "@/components/gacha/RollStage";
import { SpinPreviewCard } from "@/components/gacha/SpinPreviewCard";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
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
  const [token, setToken] = useState("");
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
  const [now, setNow] = useState(() => Date.now());
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string>("");

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
    if (targets.length === 0) return;
    const ms = Math.min(
      ...targets.map((t) => new Date(t).getTime() - Date.now()),
    );
    if (ms <= 0 || ms > 3_600_000) return;
    const timer = setTimeout(() => void refresh(), ms + 2000);
    return () => clearTimeout(timer);
  }, [user, status]);

  useEffect(() => {
    if (!user) return;
    loadTurnstile()
      .then(() => {
        const t = window.turnstile;
        const el = widgetRef.current;
        if (t && el && !widgetIdRef.current) {
          t.ready(() => {
            widgetIdRef.current = t.render(el, {
              sitekey: TURNSTILE_SITEKEY,
              action: "gacha-roll",
              callback: (tk: string) => setToken(tk || ""),
              "expired-callback": () => setToken(""),
            });
          });
        }
      })
      .catch((e) => setError((e as Error).message));
  }, [user]);

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
    if (!selectedSpinId || claiming) return;
    if (!token) {
      setError("Marque a caixa do captcha para guardar a carta.");
      return;
    }
    setError("");
    setClaiming(true);
    try {
      const pull = await api.gachaClaim({
        spinId: selectedSpinId,
        turnstileToken: token,
      });
      setClaimResult(pull);
      setResult(pull);
      setStagePreview(false);
      setStageOpen(true);
      setToken("");
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao guardar.");
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
      setToken("");
    } finally {
      setClaiming(false);
    }
  }

  async function handleBypass() {
    setError("");
    try {
      const res = await api.gachaBypass();
      if ("alreadyUnlocked" in res) {
        await refresh();
        return;
      }
      window.open(res.checkoutUrl, "_blank", "noopener,noreferrer");
      setBypassPending(true);
      const started = Date.now();
      for (;;) {
        await new Promise((r) => setTimeout(r, BYPASS_POLL_MS));
        if (Date.now() - started > BYPASS_POLL_MAX_MS) break;
        try {
          const poll = await api.gachaBypassStatus(res.reference);
          if (poll.status === "PAID") {
            setBypassPending(false);
            await refresh();
            return;
          }
          if (poll.status === "EXPIRED") {
            setBypassPending(false);
            setError("O Pix expirou. Gere uma nova intenção.");
            return;
          }
        } catch {
          break;
        }
      }
      setBypassPending(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao gerar Pix.");
    }
  }


  const selectedSpin = spins.find((s) => s.id === selectedSpinId) ?? null;
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
      <h1 className="font-display text-display-lg text-snow">Gacha</h1>
      <p className="mt-1 text-body-sm text-mist">
        5 giros por hora para revelar cartas. Guarde 1 a cada 12h — girar
        continua liberado durante o bloqueio. Mesma carta, cópias únicas:
        condition, foil e edição definem o valor.
      </p>
      {user && (
        <Link
          href="/gacha/collection"
          className="btn-ghost mt-4 inline-block px-4 py-2"
        >
          Minha coleção
        </Link>
      )}
      {error && !user && (
        <div
          role="alert"
          className="mt-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal"
        >
          {error}
        </div>
      )}

      {!user ? (
        <div className="mt-6 border border-hairline bg-panel p-6 text-body-sm text-mist">
          <Link href="/login" className="text-ice hover:text-snow">
            Entre
          </Link>{" "}
          com uma conta verificada para rolar todo dia.
        </div>
      ) : (
        <section className="mt-6 border border-hairline bg-panel p-6">
          {error && (
            <div
              role="alert"
              className="mb-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal"
            >
              {error}
            </div>
          )}
          <div ref={widgetRef} />
          {loading ? (
            <div className="skeleton h-24" aria-busy="true" />
          ) : statusError ? (
            <p className="text-body-sm text-mist">
              Não foi possível carregar o status do gacha. Tente novamente.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-caption text-mist">
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
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleSpin()}
                  disabled={!canSpinNow}
                  className="btn-ice w-fit px-6 py-3 transition-transform duration-150 active:scale-95 motion-reduce:transform-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {spinning ? "Girando…" : `Girar (${status?.spinsLeft ?? 5})`}
                </button>
                <button
                  type="button"
                  onClick={() => void handleClaim()}
                  disabled={claiming || !selectedSpin || locked}
                  title={
                    locked
                      ? "Você já guardou uma carta. Aguarde o fim do bloqueio ou desbloqueie via Pix."
                      : "Guardar a carta selecionada na sua coleção"
                  }
                  className="btn-ghost w-fit px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {claiming ? "Guardando…" : "Pegar carta"}
                </button>
              </div>

              {status?.claimWarning && (
                <div className="border border-hairline bg-ink/60 p-3">
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
                </div>
              )}

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
        </section>
      )}

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
                  <GachaCard pull={pull} />
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
