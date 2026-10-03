"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { CosmeticSvg } from "@/components/gacha/CosmeticSvg";
import { CosmeticThumb } from "@/components/gacha/CosmeticThumb";
import { useToast } from "@/components/common/ToastProvider";
import type { GachaShopItem } from "@/types";

export function GachaCosmeticShop({
  balance,
  onPurchase,
}: {
  balance: number | null;
  onPurchase: () => void | Promise<unknown>;
}) {
  const [shop, setShop] = useState<GachaShopItem[]>([]);
  const [activeBack, setActiveBack] = useState<string | null>(null);
  const [equipping, setEquipping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState<string | null>(null);
  const { toast } = useToast();

  const loadShop = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.gachaShop();
      setShop(result.cosmetics);
      setActiveBack(result.activeCardBack ?? null);
    } catch {
      setError("Não foi possível carregar capas e cosméticos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadShop();
  }, [loadShop]);

  async function buy(key: string) {
    if (buying) return;
    setBuying(key);
    setError("");
    try {
      await api.gachaBuyCosmetic({ key });
      await Promise.all([loadShop(), onPurchase()]);
      toast("Cosmético comprado. Você já pode equipá-lo.", "success");
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Não foi possível concluir a compra.";
      setError(message);
      if (
        /insuficiente|indisponível|vendid|expir|já foi|sold|conflict/i.test(
          message,
        )
      ) {
        await Promise.all([loadShop(), onPurchase()]);
      }
    } finally {
      setBuying(null);
    }
  }

  async function setBack(key: string | null) {
    if (equipping) return;
    setEquipping(true);
    setError("");
    try {
      const result = await api.gachaSetCardBack(key);
      setActiveBack(result.gachaCardBack);
      toast(
        result.gachaCardBack ? "Capa equipada." : "Capa removida.",
        "success",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível trocar a capa.",
      );
    } finally {
      setEquipping(false);
    }
  }

  return (
    <section
      id="cosmetics"
      aria-labelledby="cosmetics-title"
      className="mt-10 scroll-mt-24"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="cosmetics-title" className="font-display text-2xl text-snow">
            Capas e cosméticos
          </h2>
          <p className="mt-1 text-body-sm text-mist">
            Use Cristais para personalizar o verso das suas cartas e o perfil.
          </p>
        </div>
        <Link
          href="/gacha/colecao"
          className="inline-flex min-h-11 items-center text-body-sm text-ice hover:underline"
        >
          Ver minha coleção
        </Link>
      </div>
      {error && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center gap-3 border border-signal/40 p-4 text-body-sm text-signal"
        >
          {error}
          <button
            type="button"
            onClick={() => void loadShop()}
            className="btn-ghost min-h-11 px-3"
          >
            Tentar novamente
          </button>
        </div>
      )}
      {loading ? (
        <div
          className="skeleton mt-4 h-56"
          aria-label="Carregando cosméticos"
          aria-busy="true"
        />
      ) : shop.length === 0 && !error ? (
        <p className="mt-4 border border-dashed border-hairline p-5 text-body-sm text-mist">
          Nenhum cosmético disponível no momento.
        </p>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shop.map((item) => {
            const insufficient = balance != null && balance < item.price;
            const isBack =
              item.type === "BACK" ||
              (!item.type && item.key.startsWith("BACK_"));
            const active = activeBack === item.key;
            return (
              <li
                key={item.key}
                className={`flex min-w-0 flex-col border bg-panel ${active ? "border-ice/60" : "border-hairline"}`}
              >
                {isBack ? (
                  <div className="flex h-52 items-center justify-center border-b border-hairline bg-ink p-5">
                    <CosmeticSvg
                      cosmeticKey={item.key}
                      className="aspect-[3/4] h-full object-contain"
                    />
                  </div>
                ) : (
                  // Moldura e destaque só se julgam sobre a arte.
                  <div className="flex h-52 items-center justify-center border-b border-hairline bg-ink p-5">
                    <CosmeticThumb svg={item.svg} type={item.type ?? "FRAME"} className="h-full" />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-caption">
                    <span className="text-mist">
                      {isBack
                        ? "Capa de carta"
                        : item.type === "FRAME"
                          ? "Moldura"
                          : "Cosmético"}
                    </span>
                    {item.owned && (
                      <span className="font-mono text-ice">SEU</span>
                    )}
                  </div>
                  <h3 className="mt-2 font-display text-xl text-snow">
                    {item.label}
                  </h3>
                  <p className="mt-2 text-body-sm text-mist">
                    {item.description}
                  </p>
                  <div className="mt-auto pt-5">
                    {item.owned ? (
                      isBack ? (
                        <>
                          <p
                            className="mb-2 text-caption text-mist"
                            role="status"
                          >
                            {active
                              ? "Equipada em todas as suas cartas"
                              : "Pronta para usar na sua coleção"}
                          </p>
                          <button
                            type="button"
                            disabled={equipping}
                            onClick={() =>
                              void setBack(active ? null : item.key)
                            }
                            className={`${active ? "btn-ghost" : "btn-ice"} min-h-11 w-full px-3 disabled:opacity-50`}
                          >
                            {equipping
                              ? "Atualizando…"
                              : active
                                ? "Remover capa"
                                : "Usar capa"}
                          </button>
                        </>
                      ) : (
                        <p className="text-body-sm text-ice">Na sua coleção</p>
                      )
                    ) : (
                      <>
                        <p className="mb-3 font-display text-lg tabular-nums text-snow">
                          {item.price.toLocaleString("pt-BR")} Cristais
                        </p>
                        <button
                          type="button"
                          onClick={() => void buy(item.key)}
                          disabled={
                            balance == null || buying !== null || insufficient
                          }
                          className="btn-ice min-h-11 w-full px-3 disabled:opacity-50"
                        >
                          {buying === item.key
                            ? "Comprando…"
                            : balance == null
                              ? "Carregando saldo…"
                              : insufficient
                                ? "Saldo insuficiente"
                                : "Comprar cosmético"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
