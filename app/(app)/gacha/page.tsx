"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { TURNSTILE_SITEKEY, loadTurnstile } from "@/lib/turnstile";
import { GachaCard } from "@/components/gacha/GachaCard";
import { SectionLabel } from "@/components/common/SectionLabel";
import { Avatar } from "@/components/common/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import type { GachaPull, GachaRankingEntry, GachaStatus } from "@/types";

export default function GachaPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<GachaStatus | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [recent, setRecent] = useState<GachaPull[]>([]);
  const [ranking, setRanking] = useState<GachaRankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [token, setToken] = useState("");
  const [result, setResult] = useState<GachaPull | null>(null);
  const [error, setError] = useState("");
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string>("");

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
    try {
      const pull = await api.rollGacha(token);
      setResult(pull);
      setToken("");
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
      await refresh();
    } catch (err) {
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
      <h1 className="font-display text-display-lg text-snow">Gacha</h1>
      <p className="mt-1 text-body-sm text-mist">
        1 roll por dia. Mesma waifu, cópias únicas: condition, foil e edição
        definem o valor da sua carta.
      </p>

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
            <div role="alert" className="mb-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
              {error}
            </div>
          )}
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
              <div ref={widgetRef} />
              <button
                type="submit"
                disabled={!status?.canRoll || rolling || !token}
                className="btn-ice w-fit px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {rolling ? "Rolando…" : "Rolar carta"}
              </button>
            </form>
          )}

          {result && (
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
          <EmptyState text="Nenhum pull ainda. Seja o primeiro." variant="compact" />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {recent.map((pull) => (
              <div key={pull.id}>
                <GachaCard pull={pull} />
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
