"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { CardPreview } from "@/components/gacha/CardPreview";
import { GachaCard } from "@/components/gacha/GachaCard";
import { GachaRowsSkeleton } from "@/components/gacha/GachaPageSkeleton";
import { Modal } from "@/components/common/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionLabel } from "@/components/common/SectionLabel";
import { useToast } from "@/components/common/ToastProvider";
import type { GachaPull, GachaTrade, PublicUserProfile } from "@/types";

const ACTIVE = "PENDING" as const;
const STALE_RE =
  /expir|claimed|já guardada|indisponível|already|completed|conflict/i;

function humansLeft(expiresAt: string, now: number): string {
  const left = new Date(expiresAt).getTime() - now;
  if (left <= 0) return "expirada";
  const h = Math.ceil(left / 3_600_000);
  if (h >= 48) return `válida por ${Math.floor(h / 24)}d`;
  if (h >= 1) return `válida por ${h}h`;
  return "expira em minutos";
}

function CrystalAmount({
  label,
  amount,
  empty = true,
}: {
  label: string;
  amount: number;
  empty?: boolean;
}) {
  if (!amount) {
    return empty ? null : <p className="text-caption text-mist">{label}: 0</p>;
  }
  return (
    <p className="font-mono text-caption text-ice">
      {label}: {amount.toLocaleString("pt-BR")}
    </p>
  );
}

function MiniPair({
  mine,
  theirs,
  onPreview,
  mineLabel = "Sua",
  theirsLabel = "desse",
}: {
  mine: GachaPull[];
  theirs: GachaPull[];
  onPreview: (pull: GachaPull) => void;
  mineLabel?: string;
  theirsLabel?: string;
}) {
  return (
    <div className="flex items-stretch gap-4">
      <div className="flex flex-wrap gap-2">
        {mine.map((p) => (
          <div key={p.id} className="w-28 shrink-0">
            <GachaCard pull={p} linkAnime={false} />
            <p className="mt-1 truncate text-caption text-mist">
              {mineLabel} {p.card.name}
            </p>
            <button
              type="button"
              aria-label={`Visualizar ${p.card.name}`}
              onClick={() => onPreview(p)}
              className="mt-1 min-h-11 w-full text-left font-mono text-caption text-ice hover:text-snow focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
            >
              Ver carta
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center font-mono text-caption text-mist">
        ⇄
      </div>
      <div className="flex flex-wrap gap-2">
        {theirs.map((p) => (
          <div key={p.id} className="w-28 shrink-0">
            <GachaCard pull={p} linkAnime={false} />
            <p className="mt-1 truncate text-caption text-mist">
              {p.user?.name?.trim() || p.user?.userName || "o outro"}{" "}
              {theirsLabel}
            </p>
            <button
              type="button"
              aria-label={`Visualizar ${p.card.name}`}
              onClick={() => onPreview(p)}
              className="mt-1 min-h-11 w-full text-left font-mono text-caption text-ice hover:text-snow focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
            >
              Ver carta
            </button>
          </div>
        ))}
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
  busyId,
  now,
  onPreview,
  onCounter,
}: {
  trade: GachaTrade;
  myId: string;
  onAccept: () => void;
  onCancel: () => void;
  onDecline: () => void;
  busyId: string | null;
  now: number;
  onPreview: (pull: GachaPull) => void;
  onCounter: () => void;
}) {
  const incoming = trade.requestedUserId === myId;
  const expired = new Date(trade.expiresAt).getTime() <= now;
  const counterparty = incoming
    ? trade.offeredUserCard.user?.name?.trim() ||
      trade.offeredUserCard.user?.userName ||
      "outro usuário"
    : trade.requestedUserCard.user?.name?.trim() ||
      trade.requestedUserCard.user?.userName ||
      "outro usuário";
  const busy = busyId?.startsWith(`${trade.id}:`) ?? false;
  const acceptActive = busyId === `${trade.id}:accept`;
  const declineActive = busyId === `${trade.id}:decline`;
  const cancelActive = busyId === `${trade.id}:cancel`;
  if (trade.status === ACTIVE) {
    return (
      <li className="border border-hairline bg-panel p-4">
        {incoming ? (
          <>
            <p className="text-body-sm text-snow">
              {trade.offeredUserCard.user?.name?.trim() ||
                trade.offeredUserCard.user?.userName ||
                "Outro usuário"}{" "}
              quer trocar {trade.offeredUserCards?.length ?? 1} carta
              {(trade.offeredUserCards?.length ?? 1) > 1 ? "s" : ""} pela(s)
              sua(s):
            </p>
            <div className="mt-3">
              <MiniPair
                mine={
                  trade.requestedUserCards?.length
                    ? trade.requestedUserCards
                    : [trade.requestedUserCard]
                }
                theirs={
                  trade.offeredUserCards?.length
                    ? trade.offeredUserCards
                    : [trade.offeredUserCard]
                }
                onPreview={onPreview}
              />
            </div>
          </>
        ) : (
          <>
            <p className="text-body-sm text-snow">
              Você quer trocar {trade.offeredUserCards?.length ?? 1} carta
              {(trade.offeredUserCards?.length ?? 1) > 1 ? "s" : ""} pela(s) de{" "}
              {trade.requestedUserCard.user?.name?.trim() ||
                trade.requestedUserCard.user?.userName ||
                "outro usuário"}
              :
            </p>
            <div className="mt-3">
              <MiniPair
                mine={
                  trade.offeredUserCards?.length
                    ? trade.offeredUserCards
                    : [trade.offeredUserCard]
                }
                theirs={
                  trade.requestedUserCards?.length
                    ? trade.requestedUserCards
                    : [trade.requestedUserCard]
                }
                onPreview={onPreview}
              />
            </div>
          </>
        )}
        <div className="mt-3 space-y-1">
          <p className="font-mono text-caption text-mist">
            {humansLeft(trade.expiresAt, now)}
            {trade.round > 1 ? ` · rodada ${trade.round}` : ""}
          </p>
          <CrystalAmount
            label="Você envia"
            amount={incoming ? trade.crystalsRequested : trade.crystalsOffered}
          />
          <CrystalAmount
            label="Você recebe"
            amount={incoming ? trade.crystalsOffered : trade.crystalsRequested}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          {incoming ? (
            <>
              <button
                type="button"
                disabled={busy || expired}
                title={expired ? "Troca expirada" : undefined}
                onClick={onAccept}
                className="btn-ice min-h-11 px-5 disabled:opacity-50"
              >
                {acceptActive ? "…" : "Aceitar"}
              </button>
              <button
                type="button"
                aria-label={`Contra-propor para ${counterparty}`}
                disabled={busy || expired}
                title={expired ? "Troca expirada" : undefined}
                onClick={onCounter}
                className="btn-ghost min-h-11 px-5 disabled:opacity-50"
              >
                {busyId === `${trade.id}:counter` ? "…" : "Contra-propor"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onDecline}
                className="btn-ghost min-h-11 px-5 disabled:opacity-50"
              >
                {declineActive ? "…" : "Recusar"}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="btn-ghost min-h-11 px-5 disabled:opacity-50"
            >
              {cancelActive ? "…" : "Cancelar"}
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
        : trade.closedReason === "COUNTERED"
          ? "Troca contra-proposta"
          : trade.closedReason === "DECLINED"
            ? "Troca recusada"
            : trade.closedReason === "CARD_BLOCKED"
              ? "Troca cancelada (carta bloqueada)"
              : "Troca cancelada";
  return (
    <li className="border border-hairline bg-panel p-4 opacity-70">
      <p className="font-mono text-caption tracking-wider text-mist">
        {label} · {new Date(trade.createdAt).toLocaleDateString("pt-BR")}
      </p>
      <div className="mt-3">
        <MiniPair
          mine={
            incoming
              ? trade.requestedUserCards?.length
                ? trade.requestedUserCards
                : [trade.requestedUserCard]
              : trade.offeredUserCards?.length
                ? trade.offeredUserCards
                : [trade.offeredUserCard]
          }
          theirs={
            incoming
              ? trade.offeredUserCards?.length
                ? trade.offeredUserCards
                : [trade.offeredUserCard]
              : trade.requestedUserCards?.length
                ? trade.requestedUserCards
                : [trade.requestedUserCard]
          }
          onPreview={onPreview}
        />
      </div>
    </li>
  );
}

export function GachaTradeHub() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<GachaTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [preview, setPreview] = useState<GachaPull | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      setTrades(await api.gachaMyTrades());
    } catch (e) {
      // `catch {}` esconde o status: 401, 403 (conta nao verificada) e 500 de
      // schema drift apareciam todos como a mesma frase, o que torna o
      // diagnostico impossivel. request() ja lanca ApiError com a mensagem do
      // backend — usa ela.
      setError(
        e instanceof Error && e.message && e.message !== "Erro desconhecido"
          ? e.message
          : "Não foi possível carregar suas trocas.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user, load]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!user)
    return (
      <section
        id="trade-title"
        aria-label="Trocas entre jogadores"
        className="mt-10 border border-hairline bg-panel p-5"
      >
        Entre para ver e enviar propostas de troca.
      </section>
    );

  const incoming = trades.filter(
    (t) => t.status === ACTIVE && t.requestedUserId === user.id,
  );
  const outgoing = trades.filter(
    (t) => t.status === ACTIVE && t.offeredUserId === user.id,
  );
  const history = trades.filter((t) => t.status !== ACTIVE).slice(0, 20);

  const act = async (
    key: string,
    fn: () => Promise<unknown>,
    success: string,
  ) => {
    setBusyId(key);
    try {
      await fn();
      setTrades(await api.gachaMyTrades());
      toast(success, "success");
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Não foi possível concluir a troca.";
      setError(
        message.includes("Failed to fetch") ? "Erro de conexão." : message,
      );
      if (STALE_RE.test(message)) {
        await api
          .gachaMyTrades()
          .then(setTrades)
          .catch(() => undefined);
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section
      id="trade-title"
      aria-labelledby="trade-heading"
      className="mt-12 border-t border-hairline pt-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="trade-heading" className="font-display text-2xl text-snow">
            Trocas entre jogadores
          </h2>
          <p className="text-body-sm text-mist">
            Envie até 5 cartas por proposta. A outra pessoa confirma antes de
            qualquer carta mudar de coleção.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setComposing(true)}
          className="btn-ice min-h-11 px-4"
        >
          Nova proposta
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-8 text-signal">
          {error}
        </p>
      )}

      {loading ? (
        <GachaRowsSkeleton
          count={4}
          label="Carregando propostas de troca"
          className="mt-8"
        />
      ) : (
        <>
          <section className="mt-10">
            <SectionLabel level={2}>Recebidas ({incoming.length})</SectionLabel>
            {incoming.length === 0 ? (
              <EmptyState
                text="Ninguém quer suas cartas ainda."
                variant="compact"
              />
            ) : (
              <ul className="mt-4 space-y-4">
                {incoming.map((t) => (
                  <TradeRow
                    key={t.id}
                    trade={t}
                    myId={user.id}
                    busyId={busyId}
                    now={now}
                    onPreview={setPreview}
                    onAccept={() =>
                      void act(
                        `${t.id}:accept`,
                        () => api.gachaTradeAccept(t.id),
                        "Troca aceita.",
                      )
                    }
                    onDecline={() =>
                      void act(
                        `${t.id}:decline`,
                        () => api.gachaTradeDecline(t.id),
                        "Troca recusada.",
                      )
                    }
                    onCancel={() =>
                      void act(
                        `${t.id}:cancel`,
                        () => api.gachaTradeCancel(t.id),
                        "Proposta cancelada.",
                      )
                    }
                    onCounter={() =>
                      void act(
                        `${t.id}:counter`,
                        // Sem corpo: devolve as cartas e Cristais do outro lado.
                        () => api.gachaTradeCounter(t.id, {}),
                        "Contra-proposta enviada.",
                      )
                    }
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="mt-10">
            <SectionLabel level={2}>Enviadas ({outgoing.length})</SectionLabel>
            {outgoing.length === 0 ? (
              <EmptyState
                text="Você ainda não enviou propostas."
                variant="compact"
              />
            ) : (
              <ul className="mt-4 space-y-4">
                {outgoing.map((t) => (
                  <TradeRow
                    key={t.id}
                    trade={t}
                    myId={user.id}
                    busyId={busyId}
                    now={now}
                    onPreview={setPreview}
                    onAccept={() =>
                      void act(
                        `${t.id}:accept`,
                        () => api.gachaTradeAccept(t.id),
                        "Troca aceita.",
                      )
                    }
                    onDecline={() =>
                      void act(
                        `${t.id}:decline`,
                        () => api.gachaTradeDecline(t.id),
                        "Troca recusada.",
                      )
                    }
                    onCancel={() =>
                      void act(
                        `${t.id}:cancel`,
                        () => api.gachaTradeCancel(t.id),
                        "Proposta cancelada.",
                      )
                    }
                    onCounter={() =>
                      void act(
                        `${t.id}:counter`,
                        // Sem corpo: devolve as cartas e Cristais do outro lado.
                        () => api.gachaTradeCounter(t.id, {}),
                        "Contra-proposta enviada.",
                      )
                    }
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
                    busyId={busyId}
                    now={now}
                    onPreview={setPreview}
                    onAccept={() =>
                      void act(
                        `${t.id}:accept`,
                        () => api.gachaTradeAccept(t.id),
                        "Troca aceita.",
                      )
                    }
                    onDecline={() =>
                      void act(
                        `${t.id}:decline`,
                        () => api.gachaTradeDecline(t.id),
                        "Troca recusada.",
                      )
                    }
                    onCancel={() =>
                      void act(
                        `${t.id}:cancel`,
                        () => api.gachaTradeCancel(t.id),
                        "Proposta cancelada.",
                      )
                    }
                    onCounter={() =>
                      void act(
                        `${t.id}:counter`,
                        // Sem corpo: devolve as cartas e Cristais do outro lado.
                        () => api.gachaTradeCounter(t.id, {}),
                        "Contra-proposta enviada.",
                      )
                    }
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
      {preview && (
        <CardPreview pull={preview} onClose={() => setPreview(null)} />
      )}
    </section>
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
  const [targetCardIds, setTargetCardIds] = useState<string[]>([]);
  const [myCards, setMyCards] = useState<GachaPull[]>([]);
  const [myCardIds, setMyCardIds] = useState<string[]>([]);
  const [loadingTarget, setLoadingTarget] = useState(false);
  const [loadingMine, setLoadingMine] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<GachaPull | null>(null);
  const [crystalsOffered, setCrystalsOffered] = useState("0");
  const [crystalsRequested, setCrystalsRequested] = useState("0");
  const [available, setAvailable] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let current = true;
    api
      .gachaCollection(myId, 1, 100)
      .then((collection) => {
        if (current) setMyCards(collection.data);
      })
      .catch(() => {
        if (current) setError("Não foi possível carregar sua coleção.");
      })
      .finally(() => {
        if (current) setLoadingMine(false);
      });
    api
      .gachaEconomyInventory()
      .then((wallet) => {
        if (current) setAvailable(wallet.available);
      })
      .catch(() => {
        // Sem saldo conhecido: o campo de Cristais simplesmente não limita.
        if (current) setAvailable(null);
      });
    return () => {
      current = false;
    };
  }, [myId]);

  const parseCrystals = (raw: string) => {
    const value = Number.parseInt(raw, 10);
    return Number.isSafeInteger(value) && value > 0 ? value : 0;
  };

  const search = async () => {
    const name = userName.trim().replace(/^@/, "");
    if (!name) return;
    setLoadingTarget(true);
    setError("");
    setTargetCardIds([]);
    setTarget(null);
    setTargetCards([]);
    try {
      const profile = await api.getPublicProfile(name);
      if (profile.id === myId) {
        setError("Escolha outra pessoa para trocar cartas.");
        return;
      }
      setTarget(profile);
      const collection = await api.gachaCollection(profile.id, 1, 48);
      if (collection.data.length === 0) {
        setError("Essa pessoa ainda não tem cartas.");
        return;
      }
      setTargetCards(collection.data);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Não foi possível achar essa pessoa.";
      setTarget(null);
      setError(message === "Failed to fetch" ? "Erro de conexão." : message);
    } finally {
      setLoadingTarget(false);
    }
  };

  const toggleCard = (
    id: string,
    setSelected: (next: (current: string[]) => string[]) => void,
  ) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((currentId) => currentId !== id)
        : current.length < 5
          ? [...current, id]
          : current,
    );
  };

  const submit = async () => {
    if (!targetCardIds.length || !myCardIds.length) {
      setError("Escolha pelo menos uma carta de cada lado.");
      return;
    }
    const targetCard = targetCards.find((c) => c.id === targetCardIds[0]);
    if (targetCard && targetCard.user.id === myId) {
      setError("Você já tem a carta que está pedindo.");
      return;
    }
    const offered = parseCrystals(crystalsOffered);
    const requested = parseCrystals(crystalsRequested);
    if (available !== null && offered > available) {
      setError("Você não tem Cristais disponíveis suficientes para oferecer.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.gachaTradeCreate({
        offeredUserCardIds: myCardIds,
        requestedUserCardIds: targetCardIds,
        crystalsOffered: offered,
        crystalsRequested: requested,
      });
      toast("Proposta enviada.", "success");
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
    <>
      <Modal
        open
        size="wide"
        title="Nova proposta de troca"
        onClose={onClose}
        footer={
          <>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="btn-ghost min-h-11 px-4"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={
                busy ||
                loadingMine ||
                !target ||
                targetCards.length === 0 ||
                !targetCardIds.length ||
                !myCardIds.length
              }
              className="btn-ice min-h-11 px-4 disabled:opacity-50"
            >
              {busy ? "Enviando…" : "Enviar proposta"}
            </button>
          </>
        }
      >
        <p className="text-body-sm text-mist">
          Primeiro escolha a pessoa e as cartas que quer receber. Depois
          selecione as cartas da sua coleção que vai oferecer.
        </p>

        <section
          aria-labelledby="trade-target-title"
          className="mt-5 border border-hairline p-4"
        >
          <h3
            id="trade-target-title"
            className="font-display text-lg text-snow"
          >
            1. Quem você quer chamar?
          </h3>
          <form
            className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              void search();
            }}
          >
            <label className="text-body-sm text-mist">
              Nome de usuário
              <input
                value={userName}
                onChange={(event) => setUserName(event.target.value)}
                placeholder="Ex.: sakura"
                autoComplete="off"
                className="field mt-2 min-h-11 w-full"
              />
            </label>
            <button
              type="submit"
              disabled={loadingTarget || !userName.trim()}
              className="btn-ghost min-h-11 px-4 disabled:opacity-50"
            >
              {loadingTarget ? "Buscando…" : "Buscar coleção"}
            </button>
          </form>
          {target && (
            <p role="status" className="mt-3 text-body-sm text-ice">
              Coleção de {target.name?.trim() || target.userName || "jogador"} ·{" "}
              {targetCards.length} cartas disponíveis
            </p>
          )}
        </section>

        {target && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <CardChoiceList
              title={`2. Cartas que você quer (${targetCardIds.length}/5)`}
              description="Escolha até cinco cartas da outra coleção."
              cards={targetCards}
              selectedIds={targetCardIds}
              onToggle={(id) => toggleCard(id, setTargetCardIds)}
              onPreview={setPreview}
              emptyText="Essa pessoa ainda não tem cartas disponíveis para troca."
            />
            <CardChoiceList
              title={`3. Cartas que você oferece (${myCardIds.length}/5)`}
              description="Escolha até cinco cartas da sua coleção."
              cards={myCards}
              selectedIds={myCardIds}
              onToggle={(id) => toggleCard(id, setMyCardIds)}
              onPreview={setPreview}
              loading={loadingMine}
              emptyText="Sua coleção ainda não tem cartas disponíveis para troca."
            />
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-body-sm text-snow">
            Cristais que você oferece
            <input
              type="number"
              min={0}
              max={available ?? undefined}
              step={1}
              inputMode="numeric"
              autoComplete="off"
              value={crystalsOffered}
              onChange={(event) => setCrystalsOffered(event.target.value)}
              className="field mt-2 min-h-11 w-full"
            />
          </label>
          <label className="text-body-sm text-snow">
            Cristais que você pede
            <input
              type="number"
              min={0}
              max={2_147_483_647}
              step={1}
              inputMode="numeric"
              autoComplete="off"
              value={crystalsRequested}
              onChange={(event) => setCrystalsRequested(event.target.value)}
              className="field mt-2 min-h-11 w-full"
            />
          </label>
        </div>
        <p role="status" className="mt-4 text-body-sm text-mist">
          {available !== null && (
            <span className="block mb-2">
              Disponíveis: {available.toLocaleString("pt-BR")} Cristais.
            </span>
          )}
          Sua proposta: {myCardIds.length} carta
          {myCardIds.length === 1 ? "" : "s"} oferecida
          {myCardIds.length === 1 ? "" : "s"} · {targetCardIds.length} carta
          {targetCardIds.length === 1 ? "" : "s"} solicitada
          {targetCardIds.length === 1 ? "" : "s"}
          {parseCrystals(crystalsOffered) > 0
            ? ` · ${parseCrystals(crystalsOffered).toLocaleString("pt-BR")} Crystals enviados`
            : ""}
          {parseCrystals(crystalsRequested) > 0
            ? ` · ${parseCrystals(crystalsRequested).toLocaleString("pt-BR")} Crystals pedidos`
            : ""}
        </p>
        {parseCrystals(crystalsOffered) > 0 && (
          <p
            role="status"
            className="mt-2 border border-ice/30 bg-ice/5 p-3 text-body-sm text-ice"
          >
            Atenção: {parseCrystals(crystalsOffered).toLocaleString("pt-BR")}{" "}
            Cristais ficarão bloqueados assim que você enviar esta proposta.
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 border border-signal/40 p-3 text-body-sm text-signal"
          >
            {error}
          </p>
        )}

        <p className="mt-4 text-caption text-mist">
          Os Crystals oferecidos ficam reservados assim que a proposta é
          enviada. Eles só serão transferidos se a troca for aceita; cancelar,
          recusar ou expirar libera a reserva.
        </p>
      </Modal>
      {preview && (
        <CardPreview pull={preview} onClose={() => setPreview(null)} />
      )}
    </>
  );
}

function CardChoiceList({
  title,
  description,
  cards,
  selectedIds,
  onToggle,
  onPreview,
  loading = false,
  emptyText,
}: {
  title: string;
  description: string;
  cards: GachaPull[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onPreview: (pull: GachaPull) => void;
  loading?: boolean;
  emptyText: string;
}) {
  return (
    <section aria-label={title} className="min-w-0 border border-hairline p-4">
      <h3 className="font-display text-lg text-snow">{title}</h3>
      <p className="mt-1 text-caption text-mist">{description}</p>
      {loading ? (
        <GachaRowsSkeleton
          count={4}
          label={`Carregando cartas de ${title.toLowerCase()}`}
          className="mt-3"
        />
      ) : cards.length === 0 ? (
        <p className="mt-3 text-body-sm text-mist">{emptyText}</p>
      ) : (
        <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
          {cards.map((card) => {
            const selected = selectedIds.includes(card.id);
            const disabled = !selected && selectedIds.length >= 5;
            return (
              <li
                key={card.id}
                className={`flex items-center gap-2 border p-2 ${selected ? "border-ice/70 bg-ice/5" : "border-hairline"}`}
              >
                <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 text-body-sm text-snow">
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={disabled}
                    onChange={() => onToggle(card.id)}
                  />
                  <span className="min-w-0 break-words">
                    {card.card.name} · {card.card.rarity} · {card.foil} ·{" "}
                    {card.conditionLabel} · edição #{card.edition} ·{" "}
                    {(card.rankedValue ?? card.value).toLocaleString("pt-BR")}{" "}
                    pontos de ranking
                  </span>
                </label>
                <button
                  type="button"
                  aria-label={`Visualizar ${card.card.name}`}
                  onClick={() => onPreview(card)}
                  className="btn-ghost min-h-11 shrink-0 px-3"
                >
                  Ver arte
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
