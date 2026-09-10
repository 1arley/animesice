"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { TURNSTILE_SITEKEY, loadTurnstile } from "@/lib/turnstile";
import { RollStage } from "@/components/gacha/RollStage";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { GachaCard } from "@/components/gacha/GachaCard";
import { SectionLabel } from "@/components/common/SectionLabel";
import { Avatar } from "@/components/common/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardPreview } from "@/components/gacha/CardPreview";
import type { GachaPull, GachaRankingEntry, GachaStatus } from "@/types";

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
  const [rolling, setRolling] = useState(false);
  const [token, setToken] = useState("");
  const [result, setResult] = useState<GachaPull | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<GachaPull | null>(null);
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
        if (cancelled) return;
        setStatus(s);
        setStatusError(!!user && s === null);
        setRecent(r);
        setRanking(k);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

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
      setStatus(s);
      setStatusError(s === null);
      setRecent(r);
    } catch {}
  }

  async function handleRoll(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!status?.canRoll || rolling) return;
    if (!token) {
      setError("Marque a caixa do captcha para rolar.");
      return;
    }
    setRolling(true);
    setResult(null);
    setStageOpen(true);
    try {
      const pull = await api.rollGacha(token);
      setResult(pull);
      setToken("");
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
      await refresh();
    } catch (err) {
      setStageOpen(false);
      setError(err instanceof ApiError ? err.message : "Erro ao rolar.");
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
      setToken("");
    } finally {
      setRolling(false);
    }
  }

  return (
    <div className="mx-auto max-w-shelf px-4 pb-16 pt-8">
      {stageOpen && (!reduceMotion || result) && (
        <RollStage
          pull={result}
          reduceMotion={reduceMotion}
          onClose={() => setStageOpen(false)}
        />
      )}
      {preview && <CardPreview pull={preview} onClose={closePreview} />}
      <h1 className="font-display text-display-lg text-snow">Gacha</h1>
      <p className="mt-1 text-body-sm text-mist">
        1 roll por dia. Mesma waifu, cópias únicas: condition, foil e edição
        definem o valor da sua carta.
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
              Não foi possível carregar o status do roll. Tente novamente.
            </p>
          ) : (
            <form onSubmit={handleRoll} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-caption text-mist">
                <span>
                  {status?.canRoll
                    ? "Roll de hoje disponível"
                    : `Volte ${status?.nextRollAt ? new Date(status.nextRollAt).toLocaleString("pt-BR") : "amanhã"}`}
                </span>
                <span>
                  {status?.pityDue
                    ? "ÉPICA+ garantida neste roll"
                    : `Pity ÉPICA+ em ${status?.pityDaysLeft ?? 30}d`}
                </span>
              </div>
              <button
                type="submit"
                disabled={!status?.canRoll || rolling || !token}
                className="btn-ice w-fit px-6 py-3 transition-transform duration-150 active:scale-95 motion-reduce:transform-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {rolling ? "Rolando…" : "Rolar carta"}
              </button>
            </form>
          )}

          {result && !stageOpen && (
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
