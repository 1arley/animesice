"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { gachaConditionLabel } from "@/components/gacha/GachaCard";
import type { GachaEconomyInventory, GachaItemKind, GachaPull } from "@/types";

const STONES = [
  { kind: "TITANITA", label: "Titanita", shards: "titanitaShards", items: "titanitaItems" },
  { kind: "TITANITA_SOMBRIA", label: "Titanita Sombria", shards: "titanitaSombriaShards", items: "titanitaSombriaItems" },
  { kind: "DRACONICA", label: "Dracônica", shards: "draconicaShards", items: "draconicaItems" },
  { kind: "SOMBRIA_DRACONICA", label: "Dracônica Sombria", shards: "sombriaDraconicaShards", items: "sombriaDraconicaItems" },
] as const;

type StoneKind = (typeof STONES)[number]["kind"];
type Operation = "buy" | "convert" | "craft";

function conditionMultiplier(condition: number) {
  if (condition <= 0.07) return 3;
  if (condition <= 0.15) return 2;
  if (condition <= 0.38) return 1.5;
  if (condition <= 0.55) return 1.2;
  return 1;
}

function upgradedValue(card: GachaPull, nextCondition: number, economy: GachaEconomyInventory) {
  if (card.valueOverride != null) return card.value;
  const { base_value: base, foil_mult: foil } = economy.itemConfig;
  if (base[card.card.rarity] == null || foil[card.foil] == null) return null;
  const amount = base[card.card.rarity]! * conditionMultiplier(nextCondition) * foil[card.foil]!;
  const editionBonus = card.edition <= 10 ? (amount * (11 - card.edition)) / 10 : 0;
  return Math.round(amount + editionBonus);
}

function fragmentCount(inventory: GachaEconomyInventory, stone: (typeof STONES)[number]) {
  return inventory[stone.shards];
}

function craftedCount(inventory: GachaEconomyInventory, stone: (typeof STONES)[number]) {
  return inventory[stone.items];
}

export function GachaInventory() {
  const { user, loading: authLoading } = useAuth();
  const [inventory, setInventory] = useState<GachaEconomyInventory | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [cards, setCards] = useState<GachaPull[]>([]);
  const [selectedKind, setSelectedKind] = useState<StoneKind>("TITANITA");
  const [selectedCard, setSelectedCard] = useState<GachaPull | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [reconcileNeeded, setReconcileNeeded] = useState(false);
  const [pendingRetry, setPendingRetry] = useState<{ operation: Operation; kind: GachaItemKind; quantity: number } | null>(null);
  const [pendingUseRetry, setPendingUseRetry] = useState<{ kind: StoneKind; userCardId: string } | null>(null);
  const pendingOperations = useRef(new Map<string, string>());
  const busyRef = useRef(false);
  const stone = STONES.find((entry) => entry.kind === selectedKind)!;

  const refreshInventory = useCallback(async () => {
    const current = await api.gachaEconomyInventory();
    setInventory(current);
    return current;
  }, []);

  const refreshCards = useCallback(async () => {
    if (!user) return;
    const first = await api.gachaCollection(user.id, 1, 100);
    const collection = [...first.data];
    for (let page = 2; page <= first.meta.totalPages; page++) {
      const next = await api.gachaCollection(user.id, page, 100);
      collection.push(...next.data);
    }
    setCards(collection);
  }, [user]);

  const refresh = useCallback(async () => {
    await Promise.all([refreshInventory(), refreshCards()]);
  }, [refreshCards, refreshInventory]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setInventory(null);
      setCards([]);
      setLoadedUserId(null);
      setPendingRetry(null);
      setPendingUseRetry(null);
      setReconcileNeeded(false);
      pendingOperations.current.clear();
      setLoading(false);
      return;
    }
    let active = true;
    setInventory(null);
    setCards([]);
    setLoadedUserId(null);
    setError("");
    setStatus("");
    setPendingRetry(null);
    setPendingUseRetry(null);
    setReconcileNeeded(false);
    pendingOperations.current.clear();
    setLoading(true);
    void Promise.all([api.gachaEconomyInventory(), api.gachaCollection(user.id, 1, 100)])
      .then(async ([current, first]) => {
        const owned = [...first.data];
        for (let page = 2; page <= first.meta.totalPages; page++) {
          const next = await api.gachaCollection(user.id, page, 100);
          owned.push(...next.data);
        }
        if (active) {
          setInventory(current);
          setCards(owned);
          setLoadedUserId(user.id);
          try {
            const prefix = `animesice:gacha-item-op:${user.id}:`;
            const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter((key): key is string => !!key && key.startsWith(prefix));
            const action = keys[0]?.slice(prefix.length).split(":");
            if (action?.[0] === "use" && STONES.some((entry) => entry.kind === action[1])) {
              const kind = action[1] as StoneKind;
              const userCardId = action.slice(2).join(":");
              setSelectedKind(kind);
              setSelectedCard(owned.find((item) => item.id === userCardId) ?? null);
              setPendingUseRetry({ kind, userCardId });
            } else if ((action?.[0] === "buy" || action?.[0] === "convert" || action?.[0] === "craft") && action.length === 3 && STONES.some((entry) => entry.kind === action[1])) {
              const kind = action[1] as StoneKind;
              const retryQuantity = Number(action[2]);
              if (Number.isInteger(retryQuantity) && retryQuantity > 0) {
                setSelectedKind(kind);
                setQuantity(retryQuantity);
                setPendingRetry({ operation: action[0], kind, quantity: retryQuantity });
              }
            } else if (action?.[0] === "buy" && action[1] === "PROTECAO" && Number.isInteger(Number(action[2]))) {
              const retryQuantity = Number(action[2]);
              setQuantity(retryQuantity);
              setPendingRetry({ operation: "buy", kind: "PROTECAO", quantity: retryQuantity });
            }
          } catch { /* Storage is optional; operation IDs remain usable in-session. */ }
        }
      })
      .catch(() => {
        if (active) {
          setLoadedUserId(user.id);
          setError("Não foi possível carregar seu inventário. Tente atualizar a página.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [authLoading, user]);

  function operationIdFor(key: string) {
    const storageKey = `animesice:gacha-item-op:${user!.id}:${key}`;
    let stored: string | null = null;
    try { stored = localStorage.getItem(storageKey); } catch { /* Storage can be disabled. */ }
    const operationId = pendingOperations.current.get(key) ?? stored ?? crypto.randomUUID();
    pendingOperations.current.set(key, operationId);
    try { localStorage.setItem(storageKey, operationId); } catch { /* Keep the in-memory retry. */ }
    return { operationId, storageKey };
  }

  function clearOperation(key: string, storageKey: string) {
    pendingOperations.current.delete(key);
    try { localStorage.removeItem(storageKey); } catch { /* No persistent entry to clear. */ }
  }

  async function runItemOperation(operation: Operation, kind: GachaItemKind = selectedKind, retryQuantity = quantity) {
    if (!inventory || busyRef.current || reconcileNeeded || pendingUseRetry || (pendingRetry && (operation !== pendingRetry.operation || kind !== pendingRetry.kind || retryQuantity !== pendingRetry.quantity)) || !Number.isInteger(retryQuantity) || retryQuantity < 1) return;
    busyRef.current = true;
    const key = `${operation}:${kind}:${retryQuantity}`;
    const { operationId, storageKey } = operationIdFor(key);
    setBusy(key);
    setError("");
    setStatus("");
    const body = { operationId, kind, quantity: retryQuantity };
    try {
      if (operation === "buy") await api.gachaEconomyBuyItem(body);
      else if (operation === "convert" && kind !== "PROTECAO") await api.gachaEconomyConvertItem({ ...body, kind });
      else if (operation === "craft" && kind !== "PROTECAO") await api.gachaEconomyCraftItem({ ...body, kind });
      else throw new Error("Essa operação não aceita proteção.");
      clearOperation(key, storageKey);
      setPendingRetry(null);
      setStatus("Operação concluída.");
      await refreshInventory().then(() => setReconcileNeeded(false)).catch(() => {
        setReconcileNeeded(true);
        setError("Operação concluída; saldos não atualizados. Atualize os saldos antes de outra ação.");
      });
    } catch (cause) {
      setError(`${cause instanceof Error ? cause.message : "Falha na operação."} Se houve timeout, tente novamente sem alterar o tipo ou a quantidade.`);
      if (!(cause instanceof ApiError) || cause.statusCode >= 500 || cause.statusCode === 408) {
        setPendingRetry({ operation, kind, quantity: retryQuantity });
        await refreshInventory().catch(() => undefined);
      } else {
        clearOperation(key, storageKey);
        setPendingRetry(null);
      }
    } finally {
      setBusy("");
      busyRef.current = false;
    }
  }

  async function handleUseStone(retry = false) {
    const action = retry ? pendingUseRetry : selectedCard ? { kind: selectedKind, userCardId: selectedCard.id } : null;
    if (!inventory || !action || busyRef.current || reconcileNeeded || pendingRetry || (pendingUseRetry && !retry)) return;
    busyRef.current = true;
    const key = `use:${action.kind}:${action.userCardId}`;
    const { operationId, storageKey } = operationIdFor(key);
    setBusy(key);
    setError("");
    try {
      await api.gachaEconomyUseItem({ operationId, kind: action.kind, userCardId: action.userCardId });
      clearOperation(key, storageKey);
      setPendingUseRetry(null);
      setSelectedCard(null);
      setStatus("Carta melhorada; saldos e coleção atualizados.");
      await refresh().then(() => setReconcileNeeded(false)).catch(() => {
        setReconcileNeeded(true);
        setError("Melhoria aplicada; saldos e coleção não atualizados. Atualize antes de outra ação.");
      });
    } catch (cause) {
      if (!(cause instanceof ApiError) || cause.statusCode >= 500 || cause.statusCode === 408) {
        setPendingUseRetry(action);
        setError("Resultado incerto. Confirme novamente a mesma carta para repetir a operação com o mesmo identificador.");
        await refresh().catch(() => undefined);
      } else {
        clearOperation(key, storageKey);
        setPendingRetry(null);
        setPendingUseRetry(null);
        setError(cause.message || "Falha ao melhorar a carta.");
      }
    } finally {
      setBusy("");
      busyRef.current = false;
    }
  }

  if (authLoading || loading || loadedUserId !== (user?.id ?? null)) return <main className="mx-auto max-w-shelf px-4 py-10" aria-live="polite">Carregando inventário…</main>;
  if (!user) return <main className="mx-auto max-w-shelf px-4 py-10"><h1 className="font-display text-3xl">Inventário</h1><p className="mt-3 text-mist">Entre para ver seus itens.</p><a className="btn-ice mt-5 inline-flex min-h-11 items-center px-5" href="/entrar">Entrar</a></main>;
  if (error && !inventory) return <main className="mx-auto max-w-shelf px-4 py-10"><p role="alert">{error}</p><button className="btn-ghost mt-4 min-h-11 px-4" onClick={() => location.reload()}>Tentar novamente</button></main>;
  if (!inventory) return null;
  if (!inventory.itemConfig) return <main className="mx-auto max-w-shelf px-4 py-10"><h1 className="font-display text-3xl">Inventário temporariamente indisponível</h1><p className="mt-3 text-mist">A configuração da economia ainda não está disponível. Atualize a página em instantes.</p></main>;

  const config = inventory.itemConfig;
  const recipe = config.item_recipes[selectedKind];
  const eligibility = config.item_eligibility[selectedKind];
  const nextConditionLabel = (condition: number) => {
    const labels = ["POOR", "PLAYED", "EX", "NM", "MINT"];
    const current = gachaConditionLabel(condition);
    return labels[labels.indexOf(current) + 1] ?? null;
  };
  const eligibleCards = eligibility ? cards.filter((card) => {
    const label = card.conditionLabel ?? gachaConditionLabel(card.condition);
    const next = nextConditionLabel(card.condition);
    const order = ["POOR", "PLAYED", "EX", "NM", "MINT"];
    return eligibility.foils.includes(card.foil)
      && eligibility.sourceConditions.includes(label)
      && !!next
      && order.indexOf(next) <= order.indexOf(eligibility.maxCondition)
      && config.item_condition_anchor[next as keyof typeof config.item_condition_anchor] != null;
  }) : [];
  const selectedNext = selectedCard ? nextConditionLabel(selectedCard.condition) : null;
  const afterCondition = selectedNext ? config.item_condition_anchor[selectedNext as keyof typeof config.item_condition_anchor] : undefined;
  const afterValue = selectedCard && afterCondition != null ? upgradedValue(selectedCard, afterCondition, inventory) : null;
  const buyPrice = config.item_shop_price[selectedKind];
  const convertValue = config.item_convert_value[selectedKind];
  const buyReason = buyPrice <= 0 ? "Este item não está disponível para compra." : inventory.available < buyPrice * quantity ? "Saldo de cristais insuficiente." : "";
  const convertReason = inventory[stone.shards] < quantity ? "Fragmentos insuficientes." : convertValue <= 0 ? "Este fragmento não pode ser convertido." : "";
  const craftReason = !recipe ? "Receita indisponível." : inventory[stone.shards] < recipe * quantity ? `São necessários ${recipe * quantity} fragmentos.` : "";
  const protectionPrice = config.item_shop_price.PROTECAO;
  const protectionReason = protectionPrice <= 0 ? "Proteção indisponível para compra." : inventory.available < protectionPrice * quantity ? "Saldo de cristais insuficiente." : "";

  return (
    <main className="mx-auto max-w-shelf px-4 pb-16 pt-8">
      <header className="mb-8">
        <p className="font-mono text-caption uppercase tracking-[0.2em] text-ice">Economia · Gacha</p>
        <h1 className="mt-2 font-display text-3xl text-snow sm:text-4xl">Inventário</h1>
        <p className="mt-2 max-w-2xl text-body-sm text-mist">Gerencie seus fragmentos, pedras e proteção. Melhore suas cartas sem alterar o foil.</p>
      </header>

      <section aria-label="Saldos" className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Cristais disponíveis", inventory.available],
          ["Proteções", inventory.protecao],
          ["Fragmentos", STONES.reduce((sum, item) => sum + inventory[item.shards], 0)],
          ["Pedras prontas", STONES.reduce((sum, item) => sum + inventory[item.items], 0)],
        ].map(([label, value]) => <div key={label} className="border border-hairline bg-panel p-4"><p className="text-xs text-mist">{label}</p><p className="mt-2 font-mono text-xl tabular-nums text-snow">{Number(value).toLocaleString("pt-BR")}</p></div>)}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
        <section className="border border-hairline bg-panel p-4 sm:p-6" aria-labelledby="stone-heading">
          <h2 id="stone-heading" className="font-display text-xl text-snow">Pedras e fragmentos</h2>
          <label className="mt-4 block text-sm text-mist" htmlFor="stone-kind">Tipo de pedra</label>
          <select id="stone-kind" value={selectedKind} disabled={!!pendingUseRetry} onChange={(event) => { setSelectedKind(event.target.value as StoneKind); setSelectedCard(null); setStatus(""); }} className="mt-2 h-11 w-full border border-hairline bg-ink px-3 text-snow focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice disabled:opacity-60">
            {STONES.map((item) => <option key={item.kind} value={item.kind}>{item.label}</option>)}
          </select>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="border border-hairline p-3"><dt className="text-mist">Fragmentos</dt><dd className="mt-1 font-mono text-lg text-snow">{fragmentCount(inventory, stone)}</dd></div>
            <div className="border border-hairline p-3"><dt className="text-mist">Pedras prontas</dt><dd className="mt-1 font-mono text-lg text-snow">{craftedCount(inventory, stone)}</dd></div>
          </dl>
          <label className="mt-5 block text-sm text-mist" htmlFor="item-quantity">Quantidade</label>
          <input id="item-quantity" type="number" min={1} max={2_147_483_647} step={1} disabled={!!pendingRetry || !!pendingUseRetry} value={quantity} onChange={(event) => setQuantity(Math.min(2_147_483_647, Math.max(1, Number(event.target.value) || 1)))} className="mt-2 h-11 w-full border border-hairline bg-ink px-3 font-mono text-snow focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice disabled:opacity-60" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div><button type="button" onClick={() => void runItemOperation("buy")} disabled={!!busy || !!buyReason || reconcileNeeded || !!pendingRetry || !!pendingUseRetry} className="btn-ghost min-h-11 w-full px-3 disabled:opacity-50">Comprar fragmentos</button><p className="mt-1 min-h-10 text-xs text-mist">{buyReason || `${(buyPrice * quantity).toLocaleString("pt-BR")} cristais · ${buyPrice.toLocaleString("pt-BR")} cada`}</p></div>
            <div><button type="button" onClick={() => void runItemOperation("convert")} disabled={!!busy || !!convertReason || reconcileNeeded || !!pendingRetry || !!pendingUseRetry} className="btn-ghost min-h-11 w-full px-3 disabled:opacity-50">Converter</button><p className="mt-1 min-h-10 text-xs text-mist">{convertReason || `Recebe ${(convertValue * quantity).toLocaleString("pt-BR")} cristais`}</p></div>
            <div><button type="button" onClick={() => void runItemOperation("craft")} disabled={!!busy || !!craftReason || reconcileNeeded || !!pendingRetry || !!pendingUseRetry} className="btn-ice min-h-11 w-full px-3 disabled:opacity-50">Fabricar pedra</button><p className="mt-1 min-h-10 text-xs text-mist">{craftReason || `Consome ${(recipe ?? 0) * quantity} fragmentos`}</p></div>
          </div>
          <div className="mt-5 border-t border-hairline pt-4">
            <p className="text-sm text-mist">Proteções de reroll: {inventory.protecao}</p>
            <button type="button" onClick={() => void runItemOperation("buy", "PROTECAO")} disabled={!!busy || !!protectionReason || reconcileNeeded || !!pendingRetry || !!pendingUseRetry} className="btn-ghost mt-2 min-h-11 w-full px-3 disabled:opacity-50">Comprar proteção</button>
            <p className="mt-1 text-xs text-mist">{protectionReason || `${(protectionPrice * quantity).toLocaleString("pt-BR")} cristais · ${protectionPrice.toLocaleString("pt-BR")} cada`}</p>
          </div>
        </section>

        <section className="border border-hairline bg-panel p-4 sm:p-6" aria-labelledby="upgrade-heading">
          <h2 id="upgrade-heading" className="font-display text-xl text-snow">Melhorar uma carta</h2>
          <p className="mt-2 text-sm text-mist">Elegibilidade calculada pelas regras atuais da economia.</p>
          <label className="mt-4 block text-sm text-mist" htmlFor="eligible-card">Carta elegível para {stone.label}</label>
          <select id="eligible-card" value={selectedCard?.id ?? ""} disabled={!!pendingUseRetry} onChange={(event) => setSelectedCard(eligibleCards.find((card) => card.id === event.target.value) ?? null)} className="mt-2 h-11 w-full border border-hairline bg-ink px-3 text-snow focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice disabled:opacity-60">
            <option value="">Selecione uma carta</option>
            {eligibleCards.map((card) => <option key={card.id} value={card.id}>{card.card.name} · {card.conditionLabel ?? gachaConditionLabel(card.condition)} · {card.foil}</option>)}
          </select>
          {eligibleCards.length === 0 && <p className="mt-3 text-sm text-mist">Nenhuma carta elegível para esta pedra.</p>}
          {selectedCard && <div className="mt-4 border border-hairline p-4"><p className="font-display text-snow">{selectedCard.card.name}</p><p className="mt-2 text-sm text-mist">Condition: {selectedCard.conditionLabel ?? gachaConditionLabel(selectedCard.condition)} → {selectedNext ?? "—"}</p><p className="mt-1 text-sm text-mist">Valor: {selectedCard.value.toLocaleString("pt-BR")} → {afterValue?.toLocaleString("pt-BR") ?? "indisponível"} cristais</p><p className="mt-1 text-sm text-mist">Foil mantido: {selectedCard.foil}</p></div>}
          <button type="button" disabled={!selectedCard || !inventory[stone.items] || !!busy || afterValue == null || reconcileNeeded || !!pendingRetry} onClick={() => setStatus("confirm-upgrade")} className="btn-ice mt-4 min-h-11 w-full px-4 disabled:opacity-50">Usar pedra</button>
          {!inventory[stone.items] && <p className="mt-2 text-sm text-mist">Fabrique ou obtenha uma pedra antes de melhorar uma carta.</p>}
          <a href="/gacha/cartas" className="mt-4 inline-flex min-h-11 items-center text-sm text-ice underline underline-offset-4">Ver coleção completa</a>
        </section>
      </div>
      <p role="status" aria-live="polite" className="mt-5 min-h-6 text-sm text-ice">{status === "confirm-upgrade" ? "" : status}</p>
      {error && <p role="alert" className="mt-2 text-sm text-signal">{error}</p>}
      {reconcileNeeded && <button type="button" onClick={() => void refresh().then(() => { setReconcileNeeded(false); setError(""); }).catch(() => setError("Ainda não foi possível reconciliar saldos e coleção."))} disabled={!!busy} className="btn-ghost mt-3 min-h-11 px-4 disabled:opacity-50">Atualizar saldos e coleção</button>}
      {pendingRetry && <button type="button" onClick={() => void runItemOperation(pendingRetry.operation, pendingRetry.kind, pendingRetry.quantity)} disabled={!!busy || reconcileNeeded || !!pendingUseRetry} className="btn-ghost mt-3 min-h-11 px-4 disabled:opacity-50">Repetir a mesma operação com segurança</button>}
      <ConfirmDialog open={status === "confirm-upgrade"} title="Confirmar melhoria?" confirmLabel={pendingUseRetry ? "Repetir com segurança" : "Usar pedra"} busyLabel="Melhorando…" busy={busy.startsWith("use:")} onCancel={() => setStatus("")} onConfirm={() => void handleUseStone(!!pendingUseRetry)}>
        {selectedCard && <p className="mt-4 text-body-sm text-mist">Consumir 1 pedra {stone.label} para melhorar {selectedCard.card.name}: {selectedCard.conditionLabel ?? gachaConditionLabel(selectedCard.condition)} para {selectedNext}. O foil {selectedCard.foil} será mantido.</p>}
      </ConfirmDialog>
      {pendingUseRetry && status !== "confirm-upgrade" && <button type="button" onClick={() => void handleUseStone(true)} disabled={!!busy || reconcileNeeded} className="btn-ghost mt-3 min-h-11 px-4 disabled:opacity-50">Repetir a mesma melhoria com segurança</button>}
    </main>
  );
}
