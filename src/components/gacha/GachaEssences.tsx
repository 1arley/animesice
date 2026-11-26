"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { RollStage } from "@/components/gacha/RollStage";
import {
  readRollAnimConfig,
  type RollAnimConfig,
} from "@/lib/roll-anim-config";
import { inventoryAmount } from "@/components/gacha/ItemRewardPicker";
import type {
  GachaEconomyInventory,
  GachaEssenceKind,
  GachaPull,
} from "@/types";

type Pending = {
  operationId: string;
  itemId: GachaEssenceKind;
  action: "use" | "buy";
};

export function GachaEssences({
  inventory,
  refresh,
  disabled = false,
}: {
  inventory: GachaEconomyInventory;
  refresh: () => Promise<unknown>;
  disabled?: boolean;
}) {
  const { user } = useAuth();
  const userIdRef = useRef(user?.id);
  useLayoutEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [pull, setPull] = useState<GachaPull | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [config, setConfig] = useState<Partial<RollAnimConfig>>();
  const [restoredFor, setRestoredFor] = useState<string | null>(null);
  const storageKey = `gacha-essence-pending:${user?.id ?? ""}`;
  const revealKey = `gacha-essence-reveal:${user?.id ?? ""}`;
  const revealButton = useRef<HTMLButtonElement | null>(null);
  const section = useRef<HTMLElement | null>(null);
  useEffect(() => {
    let cancelled = false;
    api
      .gachaRollAnimation()
      .then((value) => {
        if (!cancelled) setConfig(readRollAnimConfig(value));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    setPending(null);
    setPull(null);
    setError("");
    setStatus("");
    if (user?.id) {
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (
            parsed &&
            typeof parsed === "object" &&
            "operationId" in parsed &&
            typeof parsed.operationId === "string" &&
            "itemId" in parsed &&
            typeof parsed.itemId === "string" &&
            parsed.itemId.startsWith("ESSENCIA_") &&
            "action" in parsed &&
            (parsed.action === "use" || parsed.action === "buy")
          )
            setPending(parsed as Pending);
        }
      } catch {
        /* Storage may be unavailable. */
      }
    }
    setRestoredFor(user?.id ?? null);
  }, [storageKey, user?.id]);
  useEffect(() => {
    if (!user?.id) {
      setPull(null);
      return;
    }
    const restoreReveal = (value: string | null) => {
      if (!value) {
        setPull(null);
        return;
      }
      try {
        const restored = JSON.parse(value) as GachaPull;
        setPull(restored?.id ? restored : null);
      } catch {
        setPull(null);
      }
    };
    try {
      restoreReveal(localStorage.getItem(revealKey));
    } catch {
      setPull(null);
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === revealKey) restoreReveal(event.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [revealKey, user?.id]);
  const essences =
    inventory.itemCatalog?.filter((item) => item.id.startsWith("ESSENCIA_")) ??
    [];
  async function run(operation: Pending) {
    if (busyRef.current || pull || !user || restoredFor !== user.id) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setStatus("");
    setPending(operation);
    const actingUserId = user.id;
    if (operation.action === "use")
      revealButton.current = document.activeElement as HTMLButtonElement | null;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(operation));
    } catch {
      /* In-memory retries remain available. */
    }
    try {
      if (operation.action === "use") {
        const result = await api.gachaUseEssence({
          operationId: operation.operationId,
          itemId: operation.itemId,
        });
        if (userIdRef.current !== actingUserId) return;
        try {
          localStorage.setItem(
            `gacha-essence-reveal:${actingUserId}`,
            JSON.stringify(result.pull),
          );
        } catch {
          /* The card is already granted; keep it visible for this page session. */
        }
        setPull(result.pull);
        setStatus("Carta adicionada à sua coleção.");
      } else {
        await api.gachaBuyEssence({
          operationId: operation.operationId,
          itemId: operation.itemId,
          quantity: 1,
        });
        setStatus("Essência comprada.");
      }
      if (userIdRef.current !== actingUserId) return;
      setPending(null);
      try {
        sessionStorage.removeItem(`gacha-essence-pending:${actingUserId}`);
      } catch {
        /* Storage may be unavailable. */
      }
      await refresh().catch(() => {
        setStatus(
          "A ação foi concluída. Atualize o inventário para consultar o saldo.",
        );
      });
    } catch (cause) {
      if (userIdRef.current !== actingUserId) return;
      const definite =
        cause instanceof ApiError &&
        cause.statusCode < 500 &&
        cause.statusCode !== 408 &&
        cause.statusCode !== 429;
      if (definite) {
        setPending(null);
        try {
          sessionStorage.removeItem(storageKey);
        } catch {}
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível confirmar a ação.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  if (!essences.length) return null;
  return (
    <section
      ref={section}
      tabIndex={-1}
      aria-labelledby="essences-title"
      className="mt-8 border border-hairline bg-panel p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice sm:p-6"
    >
      <h2 id="essences-title" className="font-display text-2xl text-snow">
        Essências
      </h2>
      <p className="mt-2 max-w-2xl text-body-sm text-mist">
        Cada Essência revela uma carta da raridade indicada e a adiciona à
        coleção. Seu giro de preview continua disponível.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-signal">
          {error}
        </p>
      )}
      <p
        role="status"
        aria-live="polite"
        className="mt-3 text-body-sm text-ice"
      >
        {status}
      </p>
      {pending && !busy && (
        <div className="mt-3 border border-hairline p-3">
          <p className="text-body-sm text-mist">
            Uma ação ainda precisa ser confirmada. Tentar novamente recupera o
            mesmo resultado.
          </p>
          <button
            type="button"
            className="btn-ice mt-2 min-h-11 px-4"
            onClick={() => void run(pending)}
          >
            Confirmar ação pendente
          </button>
        </div>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {essences.map((item) => {
          const kind = item.id as GachaEssenceKind;
          const count = inventoryAmount(inventory, item.field);
          const price = inventory.itemConfig.essence_shop_price?.[kind] ?? 0;
          const enabled =
            inventory.itemConfig.essence_shop_enabled?.[kind] === true &&
            price > 0;
          return (
            <article key={kind} className="border border-hairline bg-ink p-4">
              <h3 className="font-display text-lg text-snow">{item.name}</h3>
              <p className="mt-1 text-body-sm text-mist">
                {count.toLocaleString("pt-BR")} disponível
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  ref={revealButton}
                  type="button"
                  disabled={
                    disabled ||
                    busy ||
                    !!pending ||
                    !!pull ||
                    !count ||
                    restoredFor !== user?.id
                  }
                  className="btn-ice min-h-11 px-4 disabled:opacity-40"
                  aria-label={`Usar Essência ${item.name} e revelar carta`}
                  onClick={(event) => {
                    revealButton.current = event.currentTarget;
                    void run({
                      operationId: crypto.randomUUID(),
                      itemId: kind,
                      action: "use",
                    });
                  }}
                >
                  Usar e revelar
                </button>
                {enabled && (
                  <button
                    type="button"
                    disabled={
                      disabled ||
                      busy ||
                      !!pending ||
                      !!pull ||
                      inventory.available < price
                    }
                    className="btn-ghost min-h-11 px-4 disabled:opacity-40"
                    onClick={() =>
                      void run({
                        operationId: crypto.randomUUID(),
                        itemId: kind,
                        action: "buy",
                      })
                    }
                  >
                    Comprar · {price.toLocaleString("pt-BR")} Crystals
                  </button>
                )}
              </div>
              {!enabled && (
                <p className="mt-2 text-caption text-mist">
                  Compra na loja indisponível.
                </p>
              )}
            </article>
          );
        })}
      </div>
      {pull && (
        <RollStage
          key={pull.id}
          pull={pull}
          config={config}
          onClose={() => {
            setPull(null);
            try {
              localStorage.removeItem(revealKey);
            } catch {
              /* Storage may be unavailable. */
            }
            requestAnimationFrame(() => {
              if (
                revealButton.current?.isConnected &&
                !revealButton.current.disabled
              )
                revealButton.current.focus();
              else section.current?.focus();
            });
          }}
        />
      )}
    </section>
  );
}
