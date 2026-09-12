"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { GachaCard } from "@/components/gacha/GachaCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionLabel } from "@/components/common/SectionLabel";
import type {
  GachaPull,
  GachaTrade,
  PublicUserProfile,
} from "@/types";

const ACTIVE = "PENDING" as const;

function humansLeft(expiresAt: string): string {
  const left = new Date(expiresAt).getTime() - Date.now();
  if (left <= 0) return "expirada";
  const h = Math.ceil(left / 3_600_000);
  if (h >= 48) return `válida por ${Math.floor(h / 24)}d`;
  if (h >= 1) return `válida por ${h}h`;
  return "expira em minutos";
}

function MiniPair({
  mine,
  theirs,
}: {
  mine: GachaPull;
  theirs: GachaPull;
}) {
  return (
    <div className="flex items-stretch gap-4">
      <div className="w-28 shrink-0">
        <GachaCard pull={mine} linkAnime={false} />
        <p className="mt-1 truncate text-caption text-mist">
          Sua {mine.card.name}
        </p>
      </div>
      <div className="flex items-center font-mono text-caption text-mist">
        ⇄
      </div>
      <div className="w-28 shrink-0">
        <GachaCard pull={theirs} linkAnime={false} />
        <p className="mt-1 truncate text-caption text-mist">
          {theirs.user.name?.trim() || theirs.user.userName || "o outro"} desse
        </p>
      </div>
    </div>
  );
}

function TradeRow({
  trade,
  myId,
  onAccept,
  onCancel,
  onDecline,
  busy,
}: {
  trade: GachaTrade;
  myId: string;
  onAccept: () => void;
  onCancel: () => void;
  onDecline: () => void;
  busy: boolean;
}) {
  const incoming = trade.requestedUserId === myId;
  if (trade.status === ACTIVE) {
    return (
      <li className="border border-hairline bg-panel p-4">
        {incoming ? (
          <>
            <p className="text-body-sm text-snow">
              {trade.offeredUserCard.user.name?.trim() ||
                trade.offeredUserCard.user.userName}{" "}
              quer trocar a carta dele pela sua:
            </p>
            <div className="mt-3">
              <MiniPair mine={trade.requestedUserCard} theirs={trade.offeredUserCard} />
            </div>
          </>
        ) : (
          <>
            <p className="text-body-sm text-snow">
              Você quer trocar a sua carta pela de{" "}
              {trade.requestedUserCard.user.name?.trim() ||
                trade.requestedUserCard.user.userName}:
            </p>
            <div className="mt-3">
              <MiniPair mine={trade.offeredUserCard} theirs={trade.requestedUserCard} />
            </div>
          </>
        )}
        <p className="mt-3 font-mono text-caption text-mist">
          {humansLeft(trade.expiresAt)}
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {incoming ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={onAccept}
                className="btn-ice px-5 py-2.5 disabled:opacity-50"
              >
                Aceitar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onDecline}
                className="btn-ghost px-5 py-2.5 disabled:opacity-50"
              >
                Recusar
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="btn-ghost px-5 py-2.5 disabled:opacity-50"
            >
              Cancelar
            </button>
          )}
        </div>
      </li>
    );
  }

  const label =
    trade.status === "COMPLETED"
      ? "Troca concluída"
      : trade.status === "EXPIRED"
        ? "Troca expirada"
        : "Troca cancelada";
  return (
    <li className="border border-hairline bg-panel p-4 opacity-70">
      <p className="font-mono text-caption tracking-wider text-mist">
        {label} · {new Date(trade.createdAt).toLocaleDateString("pt-BR")}
      </p>
      <div className="mt-3">
        <MiniPair
          mine={incoming ? trade.requestedUserCard : trade.offeredUserCard}
          theirs={incoming ? trade.offeredUserCard : trade.requestedUserCard}
        />
      </div>
    </li>
  );
}

export default function GachaTradesPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<GachaTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [composing, setComposing] = useState(false);

  const load = useCallback(async () => {
    try {
      setTrades(await api.gachaMyTrades());
    } catch {
      setError("Não foi possível carregar suas trocas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user, load]);

  if (!user)
    return (
      <main className="mx-auto max-w-shelf px-4 py-16">
        <Link href="/login" className="text-ice">
          Entre para ver suas trocas de cartas.
        </Link>
      </main>
    );

  const incoming = trades.filter(
    (t) => t.status === ACTIVE && t.requestedUserId === user.id,
  );
  const outgoing = trades.filter(
    (t) => t.status === ACTIVE && t.offeredUserId === user.id,
  );
  const history = trades
    .filter((t) => t.status !== ACTIVE)
    .slice(0, 20);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      setTrades(await api.gachaMyTrades());
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Não foi possível concluir a troca.";
      setError(message === "Failed to fetch" ? "Erro de conexão." : message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-shelf px-4 pb-16 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-lg text-snow">Trocas</h1>
          <p className="text-body-sm text-mist">
            Troque cartas 1:1 — quem receber a proposta confirma.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/gacha" className="btn-ghost px-4 py-2">
            Voltar ao Gacha
          </Link>
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="btn-ice px-4 py-2"
          >
            Nova proposta
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-8 text-signal">{error}</p>
      )}

      {loading ? (
        <div className="skeleton mt-8 h-80" aria-busy="true" />
      ) : (
        <>
          <section className="mt-10">
            <SectionLabel level={2}>Recebidas ({incoming.length})</SectionLabel>
            {incoming.length === 0 ? (
              <EmptyState text="Ninguém quer suas cartas ainda." variant="compact" />
            ) : (
              <ul className="mt-4 space-y-4">
                {incoming.map((t) => (
                  <TradeRow
                    key={t.id}
                    trade={t}
                    myId={user.id}
                    busy={busy}
                    onAccept={() => void act(() => api.gachaTradeAccept(t.id))}
                    onDecline={() => void act(() => api.gachaTradeDecline(t.id))}
                    onCancel={() => void act(() => api.gachaTradeCancel(t.id))}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="mt-10">
            <SectionLabel level={2}>Enviadas ({outgoing.length})</SectionLabel>
            {outgoing.length === 0 ? (
              <EmptyState text="Você ainda não enviou propostas." variant="compact" />
            ) : (
              <ul className="mt-4 space-y-4">
                {outgoing.map((t) => (
                  <TradeRow
                    key={t.id}
                    trade={t}
                    myId={user.id}
                    busy={busy}
                    onAccept={() => void act(() => api.gachaTradeAccept(t.id))}
                    onDecline={() => void act(() => api.gachaTradeDecline(t.id))}
                    onCancel={() => void act(() => api.gachaTradeCancel(t.id))}
                  />
                ))}
              </ul>
            )}
          </section>

          {history.length > 0 && (
            <section className="mt-10">
              <SectionLabel level={2}>Histórico</SectionLabel>
              <ul className="mt-4 space-y-4">
                {history.map((t) => (
                  <TradeRow
                    key={t.id}
                    trade={t}
                    myId={user.id}
                    busy={busy}
                    onAccept={() => void act(() => api.gachaTradeAccept(t.id))}
                    onDecline={() => void act(() => api.gachaTradeDecline(t.id))}
                    onCancel={() => void act(() => api.gachaTradeCancel(t.id))}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {composing && (
        <ProposalComposer
          myId={user.id}
          onClose={() => setComposing(false)}
          onCreated={async () => {
            setComposing(false);
            await load();
          }}
        />
      )}
    </main>
  );
}

function ProposalComposer({
  myId,
  onClose,
  onCreated,
}: {
  myId: string;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [userName, setUserName] = useState("");
  const [target, setTarget] = useState<PublicUserProfile | null>(null);
  const [targetCards, setTargetCards] = useState<GachaPull[]>([]);
  const [targetCardId, setTargetCardId] = useState("");
  const [myCards, setMyCards] = useState<GachaPull[]>([]);
  const [myCardId, setMyCardId] = useState("");
  const [loadingTarget, setLoadingTarget] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.gachaCollection(myId, 1, 100)
      .then((c) => setMyCards(c.data))
      .catch(() => {});
  }, [myId]);

  const search = async () => {
    const name = userName.trim();
    if (!name) return;
    setLoadingTarget(true);
    setError("");
    setTargetCardId("");
    setTarget(null);
    setTargetCards([]);
    try {
      const profile = await api.getPublicProfile(name);
      setTarget(profile);
      const coll = await api.gachaCollection(profile.id, 1, 48);
      if (coll.data.length === 0) {
        setError("Essa pessoa ainda não tem cartas.");
        return;
      }
      setTargetCards(coll.data);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Não foi possível achar essa pessoa.";
      setTarget(null);
      setError(message === "Failed to fetch" ? "Erro de conexão." : message);
    } finally {
      setLoadingTarget(false);
    }
  };

  const submit = async () => {
    if (!targetCardId || !myCardId) {
      setError("Escolha as duas cartas da troca.");
      return;
    }
    const targetCard = targetCards.find((c) => c.id === targetCardId);
    if (targetCard && targetCard.user.id === myId) {
      setError("Você já tem a carta que está pedindo.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.gachaTradeCreate({
        offeredUserCardId: myCardId,
        requestedUserCardId: targetCardId,
      });
      await onCreated();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Não foi possível enviar a proposta.";
      setError(message === "Failed to fetch" ? "Erro de conexão." : message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nova proposta de troca"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4"
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto border border-hairline bg-panel p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-body-lg text-snow">
            Nova proposta de troca
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-caption text-mist hover:text-snow"
          >
            Fechar
          </button>
        </div>

        <div className="mt-5 flex gap-2">
          <input
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="userName da outra pessoa"
            aria-label="userName da outra pessoa"
            className="min-w-0 flex-1 border border-hairline bg-ink/60 p-3 text-snow"
          />
          <button
            type="button"
            disabled={loadingTarget || !userName.trim()}
            onClick={() => void search()}
            className="btn-ghost shrink-0 px-4 py-3 disabled:opacity-50"
          >
            {loadingTarget ? "Buscando…" : "Buscar"}
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-4 text-signal">{error}</p>
        )}

        {target && (
          <>
            <label className="mt-5 block font-mono text-caption text-mist">
              Carta que você quer (de{" "}
              {target.name?.trim() || target.userName || "outro usuário"})
            </label>
            <select
              value={targetCardId}
              onChange={(e) => setTargetCardId(e.target.value)}
              aria-label="Carta que você quer"
              className="mt-1 w-full border border-hairline bg-ink/60 p-3 text-snow"
            >
              <option value="">Selecione…</option>
              {targetCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.card.name} · {c.card.rarity} · {c.foil} · {c.conditionLabel} · {c.value} pts
                </option>
              ))}
            </select>
          </>
        )}

        <label className="mt-5 block font-mono text-caption text-mist">
          Sua carta de oferta
        </label>
        <select
          value={myCardId}
          onChange={(e) => setMyCardId(e.target.value)}
          aria-label="Sua carta de oferta"
          onFocus={() => {
            if (myCards.length === 0) {
              api.gachaCollection(myId, 1, 100).then((c) =>
                setMyCards(c.data),
              );
            }
          }}
          className="mt-1 w-full border border-hairline bg-ink/60 p-3 text-snow"
        >
          <option value="">Selecione…</option>
          {myCards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.card.name} · {c.card.rarity} · {c.foil} · {c.conditionLabel} · {c.value} pts
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={busy || !targetCardId || !myCardId || !target}
          onClick={() => void submit()}
          className="btn-ice mt-6 w-full px-4 py-3 disabled:opacity-50"
        >
          {busy ? "Enviando…" : "Enviar proposta"}
        </button>
      </div>
    </div>
  );
}