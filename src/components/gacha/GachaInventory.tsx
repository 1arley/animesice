"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { GachaEssences } from "@/components/gacha/GachaEssences";
import { GachaInventorySubnav } from "@/components/gacha/GachaInventorySubnav";
import { GachaPageSkeleton } from "@/components/gacha/GachaPageSkeleton";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import {
  clearOperationId,
  foilExtractFragmentsForConfig,
  getInventoryFragmentStats,
  getOrCreateOperationId,
  pendingOperationRoute,
  readPendingOperationKeys,
} from "@/lib/gacha-inventory";
import type { GachaEconomyInventory } from "@/types";

const GATEWAY_PREVIEWS = [
  { src: "/gacha/holo_gem.png", tone: "foil", key: "HOLO" },
  { src: "/gacha/gold_gem.png", tone: "foil", key: "GOLD" },
  { src: "/gacha/titanita.png", tone: "stone", key: "TITANITA" },
  { src: "/gacha/magnetita.png", tone: "stone", key: "DRACONICA" },
] as const;

export function GachaInventory() {
  const { user, loading: authLoading } = useAuth();
  const currentUserIdRef = useRef(user?.id);
  useLayoutEffect(() => {
    currentUserIdRef.current = user?.id;
  }, [user?.id]);

  const [inventory, setInventory] = useState<GachaEconomyInventory | null>(
    null,
  );
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [loadTick, setLoadTick] = useState(0);
  const [protectionQuantity, setProtectionQuantity] = useState(1);
  const [extractorQuantity, setExtractorQuantity] = useState(1);
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [reconcileNeeded, setReconcileNeeded] = useState(false);
  const [pendingBuyRetry, setPendingBuyRetry] = useState<{
    kind: "PROTECAO" | "EXTRATOR_FOIL";
    quantity: number;
  } | null>(null);
  const [pendingFragmentsOperation, setPendingFragmentsOperation] =
    useState(false);

  const pendingOperations = useRef(new Map<string, string>());
  const busyRef = useRef(false);

  const stats = useMemo(
    () => (inventory ? getInventoryFragmentStats(inventory) : null),
    [inventory],
  );

  const refreshInventory = useCallback(async () => {
    if (!user) return null;
    const userId = user.id;
    const current = await api.gachaEconomyInventory();
    if (currentUserIdRef.current !== userId) return null;
    setInventory(current);
    return current;
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setInventory(null);
      setLoadedUserId(null);
      setPendingBuyRetry(null);
      setPendingFragmentsOperation(false);
      setReconcileNeeded(false);
      pendingOperations.current.clear();
      setLoading(false);
      return;
    }

    let active = true;
    setInventory(null);
    setLoadedUserId(null);
    setError("");
    setStatus("");
    setPendingBuyRetry(null);
    setPendingFragmentsOperation(false);
    setReconcileNeeded(false);
    pendingOperations.current.clear();
    setLoading(true);

    void api
      .gachaEconomyInventory()
      .then((current) => {
        if (!active) return;
        setInventory(current);
        setLoadedUserId(user.id);

        const pendingKeys = readPendingOperationKeys(user.id);
        setPendingFragmentsOperation(
          pendingKeys.some((key) => pendingOperationRoute(key) === "fragments"),
        );
        for (const suffix of pendingKeys) {
          const action = suffix.split(":");
          if (
            action[0] === "buy" &&
            (action[1] === "PROTECAO" || action[1] === "EXTRATOR_FOIL") &&
            Number.isInteger(Number(action[2])) &&
            Number(action[2]) > 0
          ) {
            const retryKind = action[1];
            const retryQuantity = Number(action[2]);
            if (retryKind === "PROTECAO") setProtectionQuantity(retryQuantity);
            else setExtractorQuantity(retryQuantity);
            setPendingBuyRetry({ kind: retryKind, quantity: retryQuantity });
            break;
          }
        }
      })
      .catch(() => {
        if (!active) return;
        setLoadedUserId(user.id);
        setError(
          "Não foi possível carregar seu inventário. Tente atualizar a página.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, user, loadTick]);

  async function buyItem(
    kind: "PROTECAO" | "EXTRATOR_FOIL",
    retryQuantity = kind === "PROTECAO"
      ? protectionQuantity
      : extractorQuantity,
  ) {
    const retrying =
      pendingBuyRetry?.kind === kind &&
      pendingBuyRetry.quantity === retryQuantity;
    if (
      !user ||
      !inventory ||
      busyRef.current ||
      reconcileNeeded ||
      (pendingFragmentsOperation && !retrying) ||
      (pendingBuyRetry && !retrying) ||
      !Number.isInteger(retryQuantity) ||
      retryQuantity < 1
    )
      return;
    busyRef.current = true;
    const key = `buy:${kind}:${retryQuantity}`;
    const { operationId, storageKey } = getOrCreateOperationId(
      pendingOperations.current,
      user.id,
      key,
    );
    setBusy(key);
    setError("");
    setStatus("");
    try {
      await api.gachaEconomyBuyItem({
        operationId,
        kind,
        quantity: retryQuantity,
      });
      clearOperationId(pendingOperations.current, user.id, key, storageKey);
      setPendingBuyRetry(null);
      setStatus("Operação concluída.");
      await refreshInventory()
        .then(() => setReconcileNeeded(false))
        .catch(() => {
          setReconcileNeeded(true);
          setError(
            "Operação concluída; saldos não atualizados. Atualize os saldos antes de outra ação.",
          );
        });
    } catch (cause) {
      setError(
        `${cause instanceof Error ? cause.message : "Falha na operação."} Se houve timeout, tente novamente sem alterar o tipo ou a quantidade.`,
      );
      if (
        !(cause instanceof ApiError) ||
        cause.statusCode >= 500 ||
        cause.statusCode === 408
      ) {
        setPendingBuyRetry({ kind, quantity: retryQuantity });
        await refreshInventory().catch(() => undefined);
      } else {
        clearOperationId(pendingOperations.current, user.id, key, storageKey);
        setPendingBuyRetry(null);
      }
    } finally {
      setBusy("");
      busyRef.current = false;
    }
  }

  if (authLoading || loading || loadedUserId !== (user?.id ?? null)) {
    return <GachaPageSkeleton kind="inventory" />;
  }

  if (!user) {
    return (
      <main id="body-content" className="mx-auto max-w-shelf px-4 py-12">
        <div className="border border-hairline bg-panel p-6 sm:p-8">
          <p className="shelf-label">Gacha / Economia</p>
          <h1 className="font-display text-3xl text-snow">Inventário</h1>
          <p className="mt-3 text-body-sm text-mist">
            Entre para ver seus itens, essências, pedras e proteção.
          </p>
          <Link
            className="btn-ice mt-5 inline-flex min-h-11 items-center px-5"
            href="/entrar"
          >
            Entrar
          </Link>
        </div>
      </main>
    );
  }

  if (error && !inventory) {
    return (
      <main id="body-content" className="mx-auto max-w-shelf px-4 py-12">
        <div className="border border-signal/40 bg-panel p-6 sm:p-8">
          <p role="alert" className="text-body-sm text-signal">
            {error}
          </p>
          <button
            type="button"
            className="btn-ghost mt-4 min-h-11 px-4"
            onClick={() => setLoadTick((tick) => tick + 1)}
          >
            Tentar novamente
          </button>
        </div>
      </main>
    );
  }

  if (!inventory) return null;

  if (!inventory.itemConfig) {
    return (
      <main id="body-content" className="mx-auto max-w-shelf px-4 py-12">
        <GachaInventorySubnav active="inventory" stats={stats} />
        <div className="border border-hairline bg-panel p-6 sm:p-8">
          <h1 className="font-display text-3xl text-snow">
            Inventário temporariamente indisponível
          </h1>
          <p className="mt-3 text-body-sm text-mist">
            A configuração da economia ainda não está disponível. Atualize a
            página em instantes.
          </p>
          <button
            type="button"
            className="btn-ghost mt-5 min-h-11 px-4"
            onClick={() => setLoadTick((tick) => tick + 1)}
          >
            Atualizar
          </button>
        </div>
      </main>
    );
  }

  const config = inventory.itemConfig;

  const protectionPrice = config.item_shop_price?.PROTECAO ?? 0;
  const protectionReason =
    protectionPrice <= 0
      ? "Proteção indisponível para compra."
      : inventory.available < protectionPrice * protectionQuantity
        ? "Saldo de cristais insuficiente."
        : "";
  const protectionShopEnabled =
    config.item_shop_enabled?.PROTECAO ?? protectionPrice > 0;
  const validProtectionQuantity =
    Number.isSafeInteger(protectionQuantity) && protectionQuantity >= 1;

  const extractorPrice = config.item_shop_price?.EXTRATOR_FOIL ?? 0;
  const extractorReason =
    extractorPrice <= 0
      ? "Extrator de Foil indisponível para compra."
      : inventory.available < extractorPrice * extractorQuantity
        ? "Saldo de cristais insuficiente."
        : "";
  const extractorShopEnabled =
    config.item_shop_enabled?.EXTRATOR_FOIL ?? extractorPrice > 0;
  const validExtractorQuantity =
    Number.isSafeInteger(extractorQuantity) && extractorQuantity >= 1;
  const foilExtractors = inventory.foilExtractors ?? 0;
  const sampleExtractFragments =
    foilExtractFragmentsForConfig("HOLO", config) ??
    config.foil_extract_fragments?.default ??
    10;
  const pendingProtecaoRetry =
    pendingBuyRetry?.kind === "PROTECAO" ? pendingBuyRetry : null;
  const pendingExtractorRetry =
    pendingBuyRetry?.kind === "EXTRATOR_FOIL" ? pendingBuyRetry : null;

  return (
    <main
      id="body-content"
      className="gacha-inventory-page mx-auto max-w-shelf px-4 pb-16 pt-8"
    >
      <GachaInventorySubnav active="inventory" stats={stats} />

      {pendingFragmentsOperation && (
        <p
          role="status"
          className="mb-4 border border-ice/30 bg-panel p-3 text-body-sm text-mist"
        >
          Há uma operação de fragmentos pendente. Resolva-a antes de iniciar
          outra ação.{" "}
          <Link
            className="font-medium text-ice underline"
            href="/gacha/inventario/fragmentos"
          >
            Abrir fragmentos
          </Link>
        </p>
      )}

      <header className="gacha-inventory-hero mb-8 p-5 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="shelf-label">Economia · Gacha</p>
            <h1 className="font-display text-3xl text-snow sm:text-4xl">
              Inventário
            </h1>
            <p className="mt-2.5 text-body-sm text-mist">
              Acompanhe seus saldos, abra essências e gerencie proteções e
              extratores de foil.
            </p>
          </div>
          <nav
            aria-label="Atalhos do gacha"
            className="flex flex-wrap gap-2"
          >
            <Link
              className="btn-ghost min-h-11 px-4"
              href="/gacha/loja"
            >
              Ver caixas e probabilidades
            </Link>
            <Link
              className="btn-ghost min-h-11 px-4"
              href="/gacha/cartas"
            >
              Abrir coleção
            </Link>
          </nav>
        </div>
      </header>

      <section
        aria-label="Resumo dos saldos"
        className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      >
        {[
          { label: "Cristais disponíveis", value: inventory.available },
          { label: "Cristais reservados", value: inventory.reserved },
          {
            label: "Caixas",
            value:
              inventory.commonBoxes +
              inventory.rareBoxes +
              inventory.premiumBoxes,
            detail: `${inventory.commonBoxes} comuns · ${inventory.rareBoxes} raras · ${inventory.premiumBoxes} premium`,
          },
          { label: "Chaves", value: inventory.keys },
          { label: "Resets de giros", value: inventory.spinResets },
          { label: "Ampulhetas do Éter", value: inventory.ampulhetaEter ?? 0 },
          {
            label: "Pedras prontas",
            value: stats?.totalReadyStones ?? 0,
          },
          {
            label: "Gemas de foil",
            value: stats?.totalFoilGems ?? 0,
          },
          { label: "Proteções", value: inventory.protecao },
          { label: "Extratores de foil", value: foilExtractors },
        ].map(({ label, value, detail }) => (
          <div key={label} className="border border-hairline bg-panel p-4">
            <p className="text-xs text-mist">{label}</p>
            <p className="mt-2 font-mono text-xl tabular-nums text-snow">
              {value.toLocaleString("pt-BR")}
            </p>
            {detail && (
              <p className="mt-1 text-[10px] leading-4 text-mist">{detail}</p>
            )}
          </div>
        ))}
      </section>

      <section
        aria-labelledby="fragments-gateway-heading"
        className="gacha-inventory-gateway mb-8 p-5 sm:p-6"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex shrink-0 items-center gap-2">
              {GATEWAY_PREVIEWS.map((preview) => (
                <div
                  key={preview.key}
                  className="gacha-fragment-art h-12 w-12"
                  data-foil={preview.tone === "foil" ? preview.key : undefined}
                  data-stone={
                    preview.tone === "stone" ? preview.key : undefined
                  }
                >
                  <Image
                    src={preview.src}
                    alt=""
                    width={40}
                    height={40}
                    className="h-9 w-9 object-contain"
                  />
                </div>
              ))}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="fragments-gateway-heading"
                  className="font-display text-xl text-snow"
                >
                  Oficina de Fragmentos
                </h2>
                {stats && stats.totalCraftable > 0 && (
                  <span className="border border-ice/40 bg-ice/10 px-2 py-0.5 font-mono text-label text-ice">
                    {stats.totalCraftable.toLocaleString("pt-BR")} pronto(s)
                    para forjar
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-body-sm text-mist">
                Gerencie fragmentos, forje gemas e pedras de melhoria e aplique
                aprimoramentos nas suas cartas na oficina exclusiva.
              </p>
              {stats && (
                <p className="mt-2 font-mono text-caption tabular-nums text-snow">
                  {stats.totalFoilFragments.toLocaleString("pt-BR")} fragmentos
                  de foil · {stats.totalStoneFragments.toLocaleString("pt-BR")}{" "}
                  fragmentos de pedras
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/gacha/inventario/fragmentos"
              className="btn-ice gacha-fragment-action min-h-11 px-5"
            >
              Abrir oficina de fragmentos
            </Link>
            {stats && stats.totalReadyStones > 0 && (
              <Link
                href="/gacha/inventario/fragmentos#melhorar-carta"
                className="btn-ghost min-h-11 px-4"
              >
                Melhorar cartas
              </Link>
            )}
            {foilExtractors > 0 && (
              <Link
                href="/gacha/inventario/fragmentos#extrair-foil"
                className="btn-ghost min-h-11 px-4"
              >
                Extrair foil
              </Link>
            )}
          </div>
        </div>
      </section>

      <GachaEssences
        inventory={inventory}
        refresh={refreshInventory}
        disabled={!!busy || reconcileNeeded || pendingFragmentsOperation}
      />

      <section
        className="mt-8 border border-hairline bg-panel p-4 sm:p-6"
        aria-labelledby="ampulheta-heading"
      >
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <div className="flex items-start gap-4">
            <div className="gacha-fragment-art h-16 w-16 shrink-0">
              <Image
                src="/gacha/ampulheta-eter.png"
                alt=""
                width={52}
                height={52}
                className="h-13 w-13 object-contain"
              />
            </div>
            <div>
              <p className="font-mono text-caption uppercase tracking-[0.16em] text-ice">
                Consumível raro · Cooldown de coleta
              </p>
              <h2
                id="ampulheta-heading"
                className="mt-2 font-display text-2xl text-snow"
              >
                Ampulheta do Éter
              </h2>
              <p className="mt-2 max-w-xl text-body-sm text-mist">
                Elimina imediatamente o tempo de espera para guardar a próxima
                carta no Gacha. Drop raro ao guardar cartas; não concede giros
                extras e é diferente do{" "}
                <strong className="font-medium text-snow">Reset de giros</strong>{" "}
                (que restaura apenas os 5 previews da hora).
              </p>
            </div>
          </div>

          <div className="border border-hairline bg-ink/80 p-4 sm:p-5">
            <p className="border border-hairline bg-panel p-4 text-sm text-mist">
              No inventário:{" "}
              <strong className="font-mono text-lg tabular-nums text-snow">
                {(inventory.ampulhetaEter ?? 0).toLocaleString("pt-BR")}
              </strong>
            </p>
            <p className="mt-3 text-xs text-mist">
              Use diretamente na sala do Gacha quando houver cooldown ativo fora
              de eventos de resgate.
            </p>
            <Link
              href="/gacha"
              className="btn-ghost mt-3 inline-flex min-h-11 w-full items-center justify-center px-3"
            >
              Ir para o Gacha
            </Link>
          </div>
        </div>
      </section>

      <section
        className="mt-8 border border-hairline bg-panel p-4 sm:p-6"
        aria-labelledby="protection-heading"
      >
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <div>
            <p className="font-mono text-caption uppercase tracking-[0.16em] text-ice">
              Consumível
            </p>
            <h2
              id="protection-heading"
              className="mt-2 font-display text-2xl text-snow"
            >
              Proteção de reroll
            </h2>
            <p className="mt-2 max-w-xl text-body-sm text-mist">
              Usada ao refazer a condition de uma carta. Não pode ser fabricada
              nem convertida.
            </p>
            {config.item_drop_available?.PROTECAO === true ? (
              <p className="mt-4 text-sm text-ice">
                Disponível em loot boxes durante o piloto.
              </p>
            ) : config.item_drop_available?.PROTECAO === false ? (
              <p className="mt-4 text-sm text-mist">
                Nenhuma loot box ativa concede proteção agora.
              </p>
            ) : (
              <p className="mt-4 text-sm text-mist">
                Fonte em loot boxes indisponível para consulta.
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <Link
                href="/gacha/loja#box-odds"
                className="inline-flex min-h-11 items-center text-ice underline underline-offset-4"
              >
                Ver probabilidades das caixas
              </Link>
              <Link
                href="/gacha/cartas"
                className="inline-flex min-h-11 items-center text-ice underline underline-offset-4"
              >
                Escolher carta para reroll
              </Link>
            </div>
          </div>

          <div className="border border-hairline bg-ink/80 p-4 sm:p-5">
            <p className="border border-hairline bg-panel p-4 text-sm text-mist">
              No inventário:{" "}
              <strong className="font-mono text-lg tabular-nums text-snow">
                {inventory.protecao}
              </strong>
            </p>
            {protectionShopEnabled ? (
              <div className="mt-4">
                <label
                  htmlFor="protection-quantity"
                  className="block text-sm text-mist"
                >
                  Quantidade
                </label>
                <input
                  id="protection-quantity"
                  type="number"
                  min={1}
                  max={2_147_483_647}
                  step={1}
                  disabled={
                    !!pendingBuyRetry ||
                    (pendingFragmentsOperation && !pendingProtecaoRetry)
                  }
                  value={protectionQuantity}
                  onChange={(event) =>
                    setProtectionQuantity(
                      Math.min(
                        2_147_483_647,
                        Math.max(1, Number(event.target.value) || 1),
                      ),
                    )
                  }
                  className="mt-2 h-11 w-full border border-hairline bg-ink px-3 font-mono tabular-nums text-snow focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => void buyItem("PROTECAO", protectionQuantity)}
                  disabled={
                    !validProtectionQuantity ||
                    !!busy ||
                    !!protectionReason ||
                    reconcileNeeded ||
                    !!pendingBuyRetry ||
                    (pendingFragmentsOperation && !pendingProtecaoRetry)
                  }
                  className="btn-ghost gacha-fragment-action mt-3 min-h-11 w-full px-3 disabled:opacity-50"
                >
                  Comprar proteção
                </button>
                <p className="mt-1.5 text-xs text-mist">
                  {protectionReason ||
                    `${(protectionPrice * protectionQuantity).toLocaleString("pt-BR")} cristais · ${protectionPrice.toLocaleString("pt-BR")} cada`}
                </p>
              </div>
            ) : config.item_drop_available?.PROTECAO === true ? (
              <p className="mt-4 text-sm text-mist">
                Compra direta pausada no piloto. Obtenha proteção em uma loot
                box.
              </p>
            ) : (
              <p className="mt-4 text-sm text-signal">
                Compra direta pausada e nenhuma fonte ativa em loot boxes. A
                equipe precisa restaurar uma fonte antes de continuar.
              </p>
            )}
            {pendingProtecaoRetry && (
              <button
                type="button"
                onClick={() =>
                  void buyItem("PROTECAO", pendingProtecaoRetry.quantity)
                }
                disabled={!!busy || reconcileNeeded}
                className="btn-ghost mt-3 min-h-11 w-full px-4 disabled:opacity-50"
              >
                Repetir a mesma operação com segurança
              </button>
            )}
          </div>
        </div>
      </section>

      <section
        id="extrator-foil"
        className="mt-8 scroll-mt-6 border border-hairline bg-panel p-4 sm:p-6"
        aria-labelledby="foil-extractor-shop-heading"
      >
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <div>
            <p className="font-mono text-caption uppercase tracking-[0.16em] text-ice">
              Consumível
            </p>
            <h2
              id="foil-extractor-shop-heading"
              className="mt-2 font-display text-2xl text-snow"
            >
              Extrator de Foil
            </h2>
            <p className="mt-2 max-w-xl text-body-sm text-mist">
              Remove o foil aplicado a uma carta preservando raridade, condition,
              edição e skin, e converte o foil em fragmentos da gema
              correspondente ({sampleExtractFragments} fragmentos por extração
              no padrão atual;{" "}
              {config.gem_fragment_recipe ?? 20} formam uma gema). Não pode ser
              fabricado nem convertido.
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <Link
                href="/gacha/inventario/fragmentos#extrair-foil"
                className="inline-flex min-h-11 items-center text-ice underline underline-offset-4"
              >
                Extrair foil na oficina
              </Link>
              <Link
                href="/gacha/cartas"
                className="inline-flex min-h-11 items-center text-ice underline underline-offset-4"
              >
                Escolher carta na coleção
              </Link>
            </div>
          </div>

          <div className="border border-hairline bg-ink/80 p-4 sm:p-5">
            <p className="border border-hairline bg-panel p-4 text-sm text-mist">
              No inventário:{" "}
              <strong className="font-mono text-lg tabular-nums text-snow">
                {foilExtractors}
              </strong>
            </p>
            {extractorShopEnabled ? (
              <div className="mt-4">
                <label
                  htmlFor="foil-extractor-quantity"
                  className="block text-sm text-mist"
                >
                  Quantidade de extratores
                </label>
                <input
                  id="foil-extractor-quantity"
                  type="number"
                  min={1}
                  max={2_147_483_647}
                  step={1}
                  disabled={
                    !!pendingBuyRetry ||
                    (pendingFragmentsOperation && !pendingExtractorRetry)
                  }
                  value={extractorQuantity}
                  onChange={(event) =>
                    setExtractorQuantity(
                      Math.min(
                        2_147_483_647,
                        Math.max(1, Number(event.target.value) || 1),
                      ),
                    )
                  }
                  className="mt-2 h-11 w-full border border-hairline bg-ink px-3 font-mono tabular-nums text-snow focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() =>
                    void buyItem("EXTRATOR_FOIL", extractorQuantity)
                  }
                  disabled={
                    !validExtractorQuantity ||
                    !!busy ||
                    !!extractorReason ||
                    reconcileNeeded ||
                    !!pendingBuyRetry ||
                    (pendingFragmentsOperation && !pendingExtractorRetry)
                  }
                  className="btn-ghost gacha-fragment-action mt-3 min-h-11 w-full px-3 disabled:opacity-50"
                >
                  Comprar extrator de foil
                </button>
                <p className="mt-1.5 text-xs text-mist">
                  {extractorReason ||
                    `${(extractorPrice * extractorQuantity).toLocaleString("pt-BR")} cristais · ${extractorPrice.toLocaleString("pt-BR")} cada`}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-mist">
                Compra direta de Extrator de Foil indisponível no momento.
              </p>
            )}
            {pendingExtractorRetry && (
              <button
                type="button"
                onClick={() =>
                  void buyItem("EXTRATOR_FOIL", pendingExtractorRetry.quantity)
                }
                disabled={!!busy || reconcileNeeded}
                className="btn-ghost mt-3 min-h-11 w-full px-4 disabled:opacity-50"
              >
                Repetir a mesma compra com segurança
              </button>
            )}
          </div>
        </div>

        <p
          role="status"
          aria-live="polite"
          className="mt-4 min-h-5 text-sm text-ice"
        >
          {status}
        </p>
        {error && (
          <p role="alert" className="mt-2 text-sm text-signal">
            {error}
          </p>
        )}
        {reconcileNeeded && (
          <button
            type="button"
            onClick={() =>
              void refreshInventory()
                .then(() => {
                  setReconcileNeeded(false);
                  setError("");
                })
                .catch(() =>
                  setError("Ainda não foi possível reconciliar os saldos."),
                )
            }
            disabled={!!busy}
            className="btn-ghost mt-3 min-h-11 px-4 disabled:opacity-50"
          >
            Atualizar saldos
          </button>
        )}
      </section>
    </main>
  );
}
