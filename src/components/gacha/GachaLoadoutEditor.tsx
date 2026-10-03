"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { CosmeticSlotPicker } from "@/components/gacha/CosmeticSlotPicker";
import { cosmeticTypeOf, type CosmeticType } from "@/lib/cosmetic-svg";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/common/ToastProvider";
import type { GachaLoadout, GachaLoadoutSlot, GachaShopItem } from "@/types";

const EMPTY: GachaLoadout = { FRAME: null, HIGHLIGHT: null };

/** Filtra só o que o usuário possui e já está publicado. */
function owned(items: GachaShopItem[], type: CosmeticType) {
  return items.filter(
    (i) =>
      i.owned &&
      (i.type === type || (!i.type && cosmeticTypeOf(i.key) === type)),
  );
}

export function GachaLoadoutEditor() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<GachaShopItem[]>([]);
  const [loadout, setLoadout] = useState<GachaLoadout>(EMPTY);
  const [cardBack, setCardBack] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Não limpa o erro: quem chama decide. O erro de equipar precisa
  // sobreviver à tela sem sobrescrita por um reload subsequente.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [shop, current] = await Promise.all([
        api.gachaShop(),
        api.gachaLoadout(),
      ]);
      setItems(shop.cosmetics);
      setLoadout(current.loadout);
      setCardBack(current.cardBack);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível carregar sua coleção.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) void load();
  }, [authLoading, user, load]);

  const select = useCallback(
    async (slot: GachaLoadoutSlot | "BACK", key: string | null) => {
      if (busyKey) return;
      setBusyKey(key ?? `__none__:${slot}`);
      setError("");
      try {
        if (slot === "BACK") {
          const res = await api.gachaSetCardBack(key);
          setCardBack(res.gachaCardBack);
        } else {
          await api.gachaSetLoadout(slot, key);
          setLoadout((prev) => ({ ...prev, [slot]: key }));
        }
        toast("Coleção atualizada.", "success");
      } catch (cause) {
        // Sem update otimista: o estado local só muda após sucesso.
        // Não recarrega aqui para não sobrescrever a mensagem de erro.
        setError(
          cause instanceof ApiError
            ? cause.message
            : "Não foi possível atualizar a coleção.",
        );
      } finally {
        setBusyKey(null);
      }
    },
    [busyKey, toast],
  );

  if (authLoading) {
    return (
      <p className="text-body-sm text-mist" aria-busy="true">
        Carregando…
      </p>
    );
  }
  if (!user) {
    return (
      <div className="border border-hairline bg-panel p-5">
        <p className="text-body-sm text-mist">
          Entre na sua conta para gerenciar a coleção de cosméticos.
        </p>
        <Link href="/login" className="btn-ice mt-4 inline-flex min-h-11 items-center px-4">
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p
          role="alert"
          className="mb-4 flex flex-wrap items-center gap-3 border border-signal/40 p-4 text-body-sm text-signal"
        >
          {error}
          <button
            type="button"
            onClick={() => {
              setError("");
              void load();
            }}
            className="btn-ghost min-h-11 px-3"
          >
            Tentar novamente
          </button>
        </p>
      )}

      {loading ? (
        <div
          className="skeleton h-72"
          role="status"
          aria-label="Carregando coleção"
          aria-busy="true"
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <CosmeticSlotPicker
            type="BACK"
            items={owned(items, "BACK")}
            activeKey={cardBack}
            busyKey={busyKey}
            onSelect={(key) => void select("BACK", key)}
          />
          <CosmeticSlotPicker
            type="FRAME"
            items={owned(items, "FRAME")}
            activeKey={loadout.FRAME}
            busyKey={busyKey}
            onSelect={(key) => void select("FRAME", key)}
          />
          <CosmeticSlotPicker
            type="HIGHLIGHT"
            items={owned(items, "HIGHLIGHT")}
            activeKey={loadout.HIGHLIGHT}
            busyKey={busyKey}
            onSelect={(key) => void select("HIGHLIGHT", key)}
          />
        </div>
      )}

      <p className="mt-6 text-body-sm text-mist">
        Precisa de mais cosméticos?{" "}
        <Link href="/gacha/loja" className="text-ice hover:underline">
          Veja a loja
        </Link>
        .
      </p>
    </div>
  );
}