"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/common/ToastProvider";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { GachaTradeUpForgeStage } from "./GachaTradeUpForgeStage";
import { EmptyState } from "@/components/ui/EmptyState";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { GachaCardGridSkeleton } from "@/components/gacha/GachaPageSkeleton";
import {
  GachaCard,
  GACHA_TIERS,
  RARITY,
  RARITY_TEXT,
  GALAXY_FRAME,
  FOIL_TEXT,
  CONDITION_COLOR,
  CONDITION_GLYPH,
  gachaConditionLabel,
} from "@/components/gacha/GachaCard";
import { safeImageSrc } from "@/lib/url";
import {
  CARD_TRADE_UP_COUNT,
  SKIN_TRADE_UP_COUNT,
  getTradeUpNextRarity,
  isMaxCardRarity,
  validateCardTradeUpSelection,
  validateSkinTradeUpSelection,
  formatTradeUpError,
} from "./trade-up-helpers";
import type {
  GachaPull,
  GachaOwnedSkinCopy,
  GachaTradeUpCardResult,
  GachaTradeUpSkinResult,
  GachaWishlistCard,
  SocialUser,
} from "@/types";

type TradeUpMode = "cards" | "skins";

export function GachaTradeUp() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<TradeUpMode>("cards");

  // --- Estado de Seleção de Cartas ---
  const [selectedCards, setSelectedCards] = useState<GachaPull[]>([]);
  const [cardsPage, setCardsPage] = useState(1);
  const [cardsSort, setCardsSort] = useState("rarity");
  const [cardsRarityFilter, setCardsRarityFilter] = useState<string>("");
  const [cardsInventory, setCardsInventory] = useState<GachaPull[]>([]);
  const [cardsTotal, setCardsTotal] = useState(0);
  const [cardsTotalPages, setCardsTotalPages] = useState(1);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardsFetchError, setCardsFetchError] = useState("");

  // --- Wishlist do Usuário ---
  const [wishlistCards, setWishlistCards] = useState<GachaWishlistCard[]>([]);

  // --- Estado de Seleção de Skins ---
  const [selectedSkins, setSelectedSkins] = useState<GachaOwnedSkinCopy[]>([]);
  const [skinsInventory, setSkinsInventory] = useState<GachaOwnedSkinCopy[]>([]);
  const [skinsRarityFilter, setSkinsRarityFilter] = useState<string>("");
  const [skinsLoading, setSkinsLoading] = useState(false);
  const [skinsFetchError, setSkinsFetchError] = useState("");

  // --- Execução e Confirmação ---
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // --- Resultado e Forja Extravagante ---
  const [cardResult, setCardResult] = useState<GachaTradeUpCardResult | null>(null);
  const [skinResult, setSkinResult] = useState<GachaTradeUpSkinResult | null>(null);
  const [forgeActive, setForgeActive] = useState(false);
  const [forgingCards, setForgingCards] = useState<GachaPull[]>([]);
  const [forgingSkins, setForgingSkins] = useState<GachaOwnedSkinCopy[]>([]);

  // ID acessível para mensagens de status
  const statusMessageId = useId();

  // -------------------------------------------------------------
  // Validações
  // -------------------------------------------------------------
  const cardValidation = useMemo(
    () => validateCardTradeUpSelection(selectedCards),
    [selectedCards],
  );

  const skinValidation = useMemo(
    () => validateSkinTradeUpSelection(selectedSkins),
    [selectedSkins],
  );

  const activeRarity = useMemo(() => {
    if (mode === "cards") {
      return selectedCards[0]?.card.rarity ?? null;
    }
    return selectedSkins[0]?.rarity ?? null;
  }, [mode, selectedCards, selectedSkins]);

  const nextCardRarity = useMemo(() => {
    if (!activeRarity || mode !== "cards") return null;
    return getTradeUpNextRarity(activeRarity);
  }, [activeRarity, mode]);

  // Wishlist relevante para a raridade seguinte
  const relevantWishlist = useMemo(() => {
    if (!nextCardRarity) return [];
    return wishlistCards.filter((w) => w.card?.rarity === nextCardRarity);
  }, [wishlistCards, nextCardRarity]);

  // -------------------------------------------------------------
  // Consulta de Inventário: Cartas
  // -------------------------------------------------------------
  const fetchCards = useCallback(async () => {
    if (!user) return;
    setCardsLoading(true);
    setCardsFetchError("");
    try {
      const res = await api.gachaCollection(
        user.id,
        cardsPage,
        24,
        cardsSort,
        cardsRarityFilter,
      );
      setCardsInventory(res.data);
      setCardsTotal(res.meta.total);
      setCardsTotalPages(res.meta.totalPages);
    } catch (cause) {
      setCardsFetchError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível carregar as cartas do seu inventário.",
      );
    } finally {
      setCardsLoading(false);
    }
  }, [user, cardsPage, cardsSort, cardsRarityFilter]);

  useEffect(() => {
    if (!user) return;
    void fetchCards();
  }, [user, fetchCards]);

  // -------------------------------------------------------------
  // Consulta de Wishlist
  // -------------------------------------------------------------
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void api
      .gachaWishlist(user.id)
      .then((res) => {
        if (!cancelled && res?.cards) {
          setWishlistCards(res.cards);
        }
      })
      .catch(() => {
        // Silencioso: wishlist é visual / informativo
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // -------------------------------------------------------------
  // Consulta de Inventário: Skins
  // -------------------------------------------------------------
  const fetchSkins = useCallback(async () => {
    if (!user) return;
    setSkinsLoading(true);
    setSkinsFetchError("");
    try {
      const res = await api.gachaEconomyOwnedSkins();
      // Filtrar apenas ativas
      const activeCopies = res.filter((copy) => copy.status === "ACTIVE");
      setSkinsInventory(activeCopies);
    } catch (cause) {
      setSkinsFetchError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível carregar as skins do seu inventário.",
      );
    } finally {
      setSkinsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void fetchSkins();
  }, [user, fetchSkins]);

  // -------------------------------------------------------------
  // Gestão de Seleção: Cartas
  // -------------------------------------------------------------
  const handleToggleCard = useCallback(
    (pull: GachaPull) => {
      setSubmitError("");
      const isSelected = selectedCards.some((c) => c.id === pull.id);
      if (isSelected) {
        setSelectedCards((prev) => prev.filter((c) => c.id !== pull.id));
        return;
      }

      if (selectedCards.length >= CARD_TRADE_UP_COUNT) {
        toast(
          `Você já selecionou ${CARD_TRADE_UP_COUNT} cartas. Remova uma para trocar.`,
          "error",
        );
        return;
      }

      // Se já houver cartas selecionadas, exigir mesma raridade
      const currentRarity = selectedCards[0]?.card.rarity;
      if (currentRarity && pull.card.rarity !== currentRarity) {
        toast(
          `Todas as cartas devem ter a mesma raridade (${currentRarity}).`,
          "error",
        );
        return;
      }

      // Impedir raridade máxima (GALACTICA)
      if (isMaxCardRarity(pull.card.rarity)) {
        toast(
          "Cartas Galácticas já atingiram a raridade máxima e não possuem Trade-up.",
          "error",
        );
        return;
      }

      setSelectedCards((prev) => [...prev, pull]);
    },
    [selectedCards, toast],
  );

  const handleRemoveCardSlot = useCallback((id: string) => {
    setSelectedCards((prev) => prev.filter((c) => c.id !== id));
    setSubmitError("");
  }, []);

  const handleClearCardSelection = useCallback(() => {
    setSelectedCards([]);
    setSubmitError("");
  }, []);

  // -------------------------------------------------------------
  // Gestão de Seleção: Skins
  // -------------------------------------------------------------
  const handleToggleSkin = useCallback(
    (skinCopy: GachaOwnedSkinCopy) => {
      setSubmitError("");
      const isSelected = selectedSkins.some((s) => s.id === skinCopy.id);
      if (isSelected) {
        setSelectedSkins((prev) => prev.filter((s) => s.id !== skinCopy.id));
        return;
      }

      if (selectedSkins.length >= SKIN_TRADE_UP_COUNT) {
        toast(
          `Você já selecionou ${SKIN_TRADE_UP_COUNT} skins. Remova uma para trocar.`,
          "error",
        );
        return;
      }

      // Se já houver skins selecionadas, exigir mesma raridade
      const currentRarity = selectedSkins[0]?.rarity;
      if (currentRarity && skinCopy.rarity !== currentRarity) {
        toast(
          `Todas as skins devem ter a mesma raridade (${currentRarity}).`,
          "error",
        );
        return;
      }

      setSelectedSkins((prev) => [...prev, skinCopy]);
    },
    [selectedSkins, toast],
  );

  const handleRemoveSkinSlot = useCallback((id: string) => {
    setSelectedSkins((prev) => prev.filter((s) => s.id !== id));
    setSubmitError("");
  }, []);

  const handleClearSkinSelection = useCallback(() => {
    setSelectedSkins([]);
    setSubmitError("");
  }, []);

  // -------------------------------------------------------------
  // Submissão de Trade-up
  // -------------------------------------------------------------
  const handleOpenConfirm = () => {
    setSubmitError("");
    if (mode === "cards") {
      if (!cardValidation.valid) {
        setSubmitError(cardValidation.error ?? "Seleção incompleta ou inválida.");
        return;
      }
    } else {
      if (!skinValidation.valid) {
        setSubmitError(skinValidation.error ?? "Seleção incompleta ou inválida.");
        return;
      }
    }
    setConfirmOpen(true);
  };

  const handleCloseForge = useCallback(() => {
    setForgeActive(false);
    setCardResult(null);
    setSkinResult(null);
    setSubmitError("");
  }, []);

  const handleResetForge = useCallback(() => {
    setForgeActive(false);
    setCardResult(null);
    setSkinResult(null);
    setSubmitError("");
    setSelectedCards([]);
    setSelectedSkins([]);
  }, []);

  const handleExecuteTradeUp = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError("");

    const cardsSnapshot = [...selectedCards];
    const skinsSnapshot = [...selectedSkins];
    setForgingCards(cardsSnapshot);
    setForgingSkins(skinsSnapshot);
    setCardResult(null);
    setSkinResult(null);
    setConfirmOpen(false);
    setForgeActive(true);

    try {
      if (mode === "cards") {
        const copyIds = cardsSnapshot.map((c) => c.id);
        const res = await api.gachaEconomyTradeUpCards(copyIds);

        // Sucesso: limpar seleção e guardar resultado
        setSelectedCards([]);
        setCardResult(res.result);
        toast("Trade-up de cartas realizado com sucesso!", "success");

        // Atualizar inventário pelo mecanismo existente
        await fetchCards();
      } else {
        const copyIds = skinsSnapshot.map((s) => s.id);
        const res = await api.gachaEconomyTradeUpSkins(copyIds);

        // Sucesso: limpar seleção e guardar resultado
        setSelectedSkins([]);
        setSkinResult(res.result);
        toast("Trade-up de skins realizado com sucesso!", "success");

        // Atualizar inventário pelo mecanismo existente
        await fetchSkins();
      }
    } catch (cause) {
      // PRESERVA a seleção quando a requisição falhar
      const friendlyMessage = formatTradeUpError(
        cause,
        mode === "cards" ? "CARD" : "SKIN",
      );
      setSubmitError(friendlyMessage);
      toast(friendlyMessage, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Ref para rolar suavemente ao topo da grade ao mudar de página
  const gridTopRef = useRef<HTMLDivElement>(null);
  const handlePageChange = (next: number) => {
    setCardsPage(next);
    gridTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Filtragem local de skins por raridade
  const filteredSkins = useMemo(() => {
    if (!skinsRarityFilter) return skinsInventory;
    return skinsInventory.filter((s) => s.rarity === skinsRarityFilter);
  }, [skinsInventory, skinsRarityFilter]);


  // -------------------------------------------------------------
  // Render: Carregando Auth / Desconectado
  // -------------------------------------------------------------
  if (authLoading) {
    return <GachaCardGridSkeleton label="Carregando Trade-up" />;
  }

  if (!user) {
    return (
      <div className="border border-hairline bg-panel p-6 text-center">
        <h1 className="font-display text-display-md text-snow">Trade-up</h1>
        <p className="mt-2 text-body-sm text-mist">
          Entre na sua conta para combinar cartas ou skins repetidas e buscar
          itens superiores.
        </p>
        <Link
          href="/entrar"
          className="btn-ice mt-6 inline-flex min-h-11 items-center px-6"
        >
          Entrar na Conta
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-5">
        <div>
          <h1 className="font-display text-display-lg text-snow">Trade-up</h1>
          <p className="mt-1 text-body-sm text-mist">
            Combine itens da mesma raridade para forjar novos colecionáveis.
          </p>
        </div>

        {/* Alternador de Modo: Cartas vs Skins */}
        <div
          role="tablist"
          aria-label="Tipo de Trade-up"
          className="flex rounded border border-hairline bg-panel/70 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "cards"}
            onClick={() => {
              setMode("cards");
              setSubmitError("");
            }}
            className={`min-h-11 px-4 py-2 text-caption font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${
              mode === "cards"
                ? "bg-ice text-ink"
                : "text-mist hover:text-snow"
            }`}
          >
            Cartas (4 : 1)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "skins"}
            onClick={() => {
              setMode("skins");
              setSubmitError("");
            }}
            className={`min-h-11 px-4 py-2 text-caption font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${
              mode === "skins"
                ? "bg-ice text-ink"
                : "text-mist hover:text-snow"
            }`}
          >
            Skins (3 : 1)
          </button>
        </div>
      </header>

      {/* Banner de Erro Geral */}
      {submitError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200"
        >
          <span className="text-xl" aria-hidden="true">
            ⚠️
          </span>
          <div className="flex-1 text-body-sm">
            <p className="font-semibold text-rose-100">Não foi possível realizar o Trade-up</p>
            <p className="mt-0.5 text-rose-200/90">{submitError}</p>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SEÇÃO PRINCIPAL: ALTAR / RACK DE TRADE-UP               */}
      {/* ========================================================= */}
      <section
        aria-labelledby="rack-title"
        className="rounded border border-hairline bg-panel/60 p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline/60 pb-4">
          <div>
            <h2 id="rack-title" className="font-display text-body-lg text-snow">
              {mode === "cards"
                ? "Altar de Fusão de Cartas"
                : "Reciclador de Skins"}
            </h2>
            <p className="text-caption text-mist" id={statusMessageId}>
              {mode === "cards" ? (
                selectedCards.length === 0 ? (
                  "Selecione 4 cartas da mesma raridade no inventário abaixo."
                ) : (
                  <>
                    Raridade:{" "}
                    <span
                      className={`font-bold ${
                        activeRarity ? RARITY_TEXT[activeRarity] ?? "text-snow" : "text-snow"
                      }`}
                    >
                      {activeRarity}
                    </span>{" "}
                    ({selectedCards.length}/{CARD_TRADE_UP_COUNT})
                  </>
                )
              ) : selectedSkins.length === 0 ? (
                "Selecione 3 skins da mesma raridade no inventário abaixo."
              ) : (
                <>
                  Raridade:{" "}
                  <span
                    className={`font-bold ${
                      activeRarity ? RARITY_TEXT[activeRarity] ?? "text-snow" : "text-snow"
                    }`}
                  >
                    {activeRarity}
                  </span>{" "}
                  ({selectedSkins.length}/{SKIN_TRADE_UP_COUNT})
                </>
              )}
            </p>
          </div>

          {/* Botões de Ação do Altar */}
          <div className="flex flex-wrap items-center gap-2">
            {(mode === "cards" ? selectedCards.length > 0 : selectedSkins.length > 0) && (
              <button
                type="button"
                onClick={
                  mode === "cards"
                    ? handleClearCardSelection
                    : handleClearSkinSelection
                }
                disabled={submitting}
                className="btn-ghost min-h-11 px-3 text-caption text-mist hover:text-snow"
              >
                Limpar seleção
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenConfirm}
              disabled={
                submitting ||
                (mode === "cards" ? !cardValidation.valid : !skinValidation.valid)
              }
              className="btn-ice min-h-11 px-5 text-caption font-bold uppercase tracking-wider disabled:opacity-40"
            >
              {submitting
                ? "Processando…"
                : mode === "cards"
                  ? `Forjar Carta (${selectedCards.length}/${CARD_TRADE_UP_COUNT})`
                  : `Reciclar Skins (${selectedSkins.length}/${SKIN_TRADE_UP_COUNT})`}
            </button>
          </div>
        </div>

        {/* Slots e Pré-visualização do Resultado */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
          {/* Slots de Entrada */}
          <div className={mode === "cards" ? "lg:col-span-8" : "lg:col-span-7"}>
            <div
              className={`grid gap-3 sm:gap-4 ${
                mode === "cards"
                  ? "grid-cols-2 sm:grid-cols-4"
                  : "grid-cols-1 sm:grid-cols-3"
              }`}
            >
              {mode === "cards"
                ? Array.from({ length: CARD_TRADE_UP_COUNT }).map((_, index) => {
                    const card = selectedCards[index];
                    if (!card) {
                      return (
                        <div
                          key={`empty-card-slot-${index}`}
                          className="flex min-h-[220px] flex-col items-center justify-center rounded border-2 border-dashed border-hairline/80 bg-ink/20 p-4 text-center transition-colors"
                        >
                          <span className="text-2xl text-mist/60" aria-hidden="true">
                            +
                          </span>
                          <span className="mt-2 text-caption font-bold text-mist">
                            Slot {index + 1}
                          </span>
                          <span className="text-[11px] text-mist/70">
                            Escolha uma carta
                          </span>
                        </div>
                      );
                    }

                    const rarity = card.card.rarity;
                    const style = RARITY[rarity] ?? RARITY.COMUM!;
                    const cond = card.conditionLabel ?? gachaConditionLabel(card.condition);
                    const condGlyph = CONDITION_GLYPH[cond] ?? "";
                    const condColor = CONDITION_COLOR[cond] ?? "text-mist";
                    const isGalaxy = rarity === "GALACTICA";
                    const art = safeImageSrc(card.card.image);

                    return (
                      <div
                        key={card.id}
                        className={`relative flex min-h-[220px] flex-col justify-between rounded border ${
                          isGalaxy ? GALAXY_FRAME : style.border
                        } bg-ink/70 p-3 shadow-sm`}
                      >
                        {/* Botão Remover */}
                        <button
                          type="button"
                          aria-label={`Remover ${card.card.name} do slot ${index + 1}`}
                          onClick={() => handleRemoveCardSlot(card.id)}
                          className="absolute right-2 top-2 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-ink/80 text-mist transition-colors hover:bg-rose-500/20 hover:text-rose-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
                        >
                          <span className="text-sm font-bold" aria-hidden="true">
                            ✕
                          </span>
                        </button>

                        {/* Imagem / Miniatura */}
                        <div className="relative mx-auto aspect-[3/4] w-24 overflow-hidden rounded bg-panel">
                          {art ? (
                            <Image
                              src={art}
                              alt={card.card.name}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[11px] text-mist">
                              sem arte
                            </div>
                          )}
                        </div>

                        {/* Detalhes da Carta */}
                        <div className="mt-2 text-center">
                          <p className="truncate text-caption font-bold text-snow">
                            {card.card.name}
                          </p>
                          <span
                            className={`inline-block text-[11px] font-bold uppercase tracking-wide ${style.text}`}
                          >
                            {rarity}
                          </span>

                          {/* Atributos: Condition, Foil, Edition */}
                          <div className="mt-1.5 flex flex-wrap justify-center gap-1 font-mono text-[10px]">
                            <span
                              className={`border border-hairline/80 px-1 py-0.2 ${condColor}`}
                            >
                              {condGlyph} {cond}
                            </span>
                            {card.foil !== "NORMAL" && (
                              <span
                                className={`border border-hairline/80 px-1 py-0.2 ${
                                  FOIL_TEXT[card.foil] ?? "text-mist"
                                }`}
                              >
                                {card.foil}
                              </span>
                            )}
                            <span className="border border-hairline/80 px-1 py-0.2 text-mist">
                              #{card.edition}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                : Array.from({ length: SKIN_TRADE_UP_COUNT }).map((_, index) => {
                    const skin = selectedSkins[index];
                    if (!skin) {
                      return (
                        <div
                          key={`empty-skin-slot-${index}`}
                          className="flex min-h-[200px] flex-col items-center justify-center rounded border-2 border-dashed border-hairline/80 bg-ink/20 p-4 text-center transition-colors"
                        >
                          <span className="text-2xl text-mist/60" aria-hidden="true">
                            +
                          </span>
                          <span className="mt-2 text-caption font-bold text-mist">
                            Slot {index + 1}
                          </span>
                          <span className="text-[11px] text-mist/70">
                            Escolha uma skin
                          </span>
                        </div>
                      );
                    }

                    const style = RARITY[skin.rarity] ?? RARITY.COMUM!;
                    const art = safeImageSrc(skin.imageUrl);

                    return (
                      <div
                        key={skin.id}
                        className={`relative flex min-h-[200px] flex-col justify-between rounded border ${style.border} bg-ink/70 p-3 shadow-sm`}
                      >
                        {/* Botão Remover */}
                        <button
                          type="button"
                          aria-label={`Remover skin ${skin.name} do slot ${index + 1}`}
                          onClick={() => handleRemoveSkinSlot(skin.id)}
                          className="absolute right-2 top-2 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-ink/80 text-mist transition-colors hover:bg-rose-500/20 hover:text-rose-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
                        >
                          <span className="text-sm font-bold" aria-hidden="true">
                            ✕
                          </span>
                        </button>

                        <div className="relative mx-auto aspect-square w-24 overflow-hidden rounded bg-panel">
                          {art ? (
                            <Image
                              src={art}
                              alt={skin.name}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[11px] text-mist">
                              sem arte
                            </div>
                          )}
                        </div>

                        <div className="mt-2 text-center">
                          <p className="truncate text-caption font-bold text-snow">
                            {skin.name}
                          </p>
                          <span
                            className={`inline-block text-[11px] font-bold uppercase tracking-wide ${style.text}`}
                          >
                            {skin.rarity}
                          </span>
                        </div>
                      </div>
                    );
                  })}
            </div>
          </div>

          {/* Seta / Transição */}
          <div className="flex justify-center lg:col-span-1" aria-hidden="true">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-panel text-ice">
              ➔
            </div>
          </div>

          {/* Caixa de Previsão do Resultado */}
          <div className={mode === "cards" ? "lg:col-span-3" : "lg:col-span-4"}>
            <div className="rounded border border-hairline bg-ink/50 p-4 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-mist">
                Resultado Previsto
              </span>

              {mode === "cards" ? (
                activeRarity ? (
                  isMaxCardRarity(activeRarity) ? (
                    <div className="mt-3 rounded border border-rose-500/40 bg-rose-500/10 p-3">
                      <p className="text-caption font-bold text-rose-300">
                        Raridade Máxima
                      </p>
                      <p className="mt-1 text-[11px] text-rose-200/80">
                        Cartas Galácticas não possuem uma raridade superior para Trade-up.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <div
                        className={`mx-auto flex aspect-[3/4] w-24 flex-col items-center justify-center rounded border ${
                          nextCardRarity ? RARITY[nextCardRarity]?.border ?? "border-hairline" : "border-hairline"
                        } bg-panel/60 p-2 shadow-inner`}
                      >
                        <span className="text-xl text-ice">★</span>
                        <span className="mt-1 text-[10px] text-mist">Nova Carta</span>
                      </div>
                      <p className="mt-3 text-caption text-mist">Receberá 1 carta da raridade:</p>
                      <p
                        className={`text-body-md font-bold uppercase ${
                          nextCardRarity ? RARITY_TEXT[nextCardRarity] ?? "text-snow" : "text-snow"
                        }`}
                      >
                        {nextCardRarity}
                      </p>
                      <p className="mt-1 text-[11px] text-mist/80">
                        Atributos e edição calculados a partir dos itens combinados.
                      </p>
                    </div>
                  )
                ) : (
                  <p className="mt-4 text-caption text-mist">
                    Selecione cartas da mesma raridade para ver a evolução.
                  </p>
                )
              ) : activeRarity ? (
                <div className="mt-3">
                  <div
                    className={`mx-auto flex aspect-square w-24 flex-col items-center justify-center rounded border ${
                      RARITY[activeRarity]?.border ?? "border-hairline"
                    } bg-panel/60 p-2 shadow-inner`}
                  >
                    <span className="text-xl text-ice">✦</span>
                    <span className="mt-1 text-[10px] text-mist">Nova Skin</span>
                  </div>
                  <p className="mt-3 text-caption text-mist">Receberá 1 skin aleatória:</p>
                  <p
                    className={`text-body-md font-bold uppercase ${
                      RARITY_TEXT[activeRarity] ?? "text-snow"
                    }`}
                  >
                    {activeRarity}
                  </p>
                  <p className="mt-1 text-[11px] text-mist/80">
                    Sorteio uniforme entre as skins ativas desta raridade.
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-caption text-mist">
                  Selecione skins da mesma raridade para ver a previsão.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Informações da Wishlist (somente no modo Cartas) */}
        {mode === "cards" && (
          <div className="mt-6 rounded border border-hairline/80 bg-ink/30 p-4">
            <div className="flex items-start gap-3">
              <span className="text-lg text-ice" aria-hidden="true">
                ✨
              </span>
              <div className="flex-1 text-body-sm">
                <p className="font-semibold text-snow">
                  Influência da Wishlist no Trade-up
                </p>
                <p className="mt-1 text-caption text-mist">
                  Cartas e conjuntos marcados na sua Wishlist recebem peso
                  adicional no sorteio da raridade seguinte. Preferências de
                  Foil, Condição mínima e Edição máxima também aumentam a chance
                  desses atributos serem preservados. O processo permanece
                  aleatório e não garante um resultado fixo (o sistema não
                  opera com odds percentuais fixas).
                </p>

                {/* Destaque para cartas da wishlist na raridade alvo */}
                {nextCardRarity && (
                  <div className="mt-3 border-t border-hairline/50 pt-2.5">
                    {relevantWishlist.length > 0 ? (
                      <div>
                        <p className="text-caption font-semibold text-snow">
                          Itens da sua Wishlist na raridade {nextCardRarity}:
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {relevantWishlist.map((w) => (
                            <span
                              key={w.id}
                              className="rounded border border-ice/40 bg-ice/10 px-2 py-0.5 text-caption text-ice"
                            >
                              {w.card.name}{" "}
                              <span className="text-[10px] text-mist">
                                ({w.priority === "HIGH" ? "Alta" : w.priority === "NORMAL" ? "Normal" : "Baixa"})
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-mist/80">
                        Você não possui cartas de raridade {nextCardRarity} na
                        sua Wishlist. Se quiser favorecer alguma carta
                        específica, adicione-a na sua{" "}
                        <Link
                          href="/gacha/wishlist"
                          className="text-ice underline underline-offset-2 hover:text-snow"
                        >
                          Wishlist
                        </Link>
                        .
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* SEÇÃO INFERIOR: INVENTÁRIO DISPONÍVEL                   */}
      {/* ========================================================= */}
      <section aria-labelledby="inventory-title" ref={gridTopRef}>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-4">
          <div>
            <h2 id="inventory-title" className="font-display text-body-lg text-snow">
              {mode === "cards" ? "Minhas Cartas Ativas" : "Minhas Skins Ativas"}
            </h2>
            <p className="text-caption text-mist">
              {mode === "cards"
                ? "Clique em uma carta para adicioná-la ou removê-la do Trade-up."
                : "Clique em uma skin para adicioná-la ou removê-la do Trade-up."}
            </p>
          </div>

          {/* Filtros de Raridade */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (mode === "cards") {
                  setCardsRarityFilter("");
                  setCardsPage(1);
                } else {
                  setSkinsRarityFilter("");
                }
              }}
              className={`min-h-11 rounded border px-3 py-1.5 text-caption font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${
                (mode === "cards" ? cardsRarityFilter === "" : skinsRarityFilter === "")
                  ? "border-ice bg-ice text-ink"
                  : "border-hairline bg-panel text-mist hover:text-snow"
              }`}
            >
              Todas
            </button>
            {GACHA_TIERS.map((tier) => {
              const active =
                mode === "cards"
                  ? cardsRarityFilter === tier
                  : skinsRarityFilter === tier;
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => {
                    if (mode === "cards") {
                      setCardsRarityFilter(tier);
                      setCardsPage(1);
                    } else {
                      setSkinsRarityFilter(tier);
                    }
                  }}
                  className={`min-h-11 rounded border px-3 py-1.5 text-caption font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${
                    active
                      ? "border-ice bg-ice text-ink"
                      : `border-hairline bg-panel ${RARITY_TEXT[tier] ?? "text-mist"} hover:border-mist`
                  }`}
                >
                  {tier}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grade de Cartas */}
        {mode === "cards" && (
          <div className="mt-6">
            {cardsFetchError && (
              <div role="alert" className="border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200">
                <p>{cardsFetchError}</p>
                <button
                  type="button"
                  onClick={() => void fetchCards()}
                  className="btn-ghost mt-2 min-h-11 px-3 text-caption text-snow"
                >
                  Tentar carregar novamente
                </button>
              </div>
            )}

            {cardsLoading ? (
              <GachaCardGridSkeleton label="Carregando cartas do inventário" />
            ) : cardsInventory.length === 0 ? (
              <EmptyState
                text={
                  cardsRarityFilter
                    ? `Você não tem cartas ativas na raridade ${cardsRarityFilter}.`
                    : "Você ainda não possui cartas ativas no seu inventário."
                }
                action={
                  <Link href="/gacha" className="btn-ice min-h-11 px-4 inline-flex items-center">
                    Girar no Gacha
                  </Link>
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {cardsInventory.map((pull) => {
                    const isSelected = selectedCards.some((c) => c.id === pull.id);
                    const selectedIndex = selectedCards.findIndex(
                      (c) => c.id === pull.id,
                    );
                    const style = RARITY[pull.card.rarity] ?? RARITY.COMUM!;
                    const isMismatched =
                      activeRarity !== null && pull.card.rarity !== activeRarity;
                    const isMax = isMaxCardRarity(pull.card.rarity);
                    const art = safeImageSrc(pull.card.image);

                    return (
                      <div
                        key={pull.id}
                        className={`group relative flex flex-col justify-between rounded border transition-all ${
                          isSelected
                            ? "border-ice ring-2 ring-ice"
                            : isMismatched || isMax
                              ? "opacity-50 border-hairline/60"
                              : `${style.border} hover:border-snow`
                        } bg-panel/70 p-2.5`}
                      >
                        {/* Indicador de Seleção / Badge */}
                        {isSelected && (
                          <div className="absolute left-2 top-2 z-10 rounded bg-ice px-2 py-0.5 font-mono text-[10px] font-bold text-ink">
                            Slot {selectedIndex + 1}
                          </div>
                        )}

                        {isMax && (
                          <div className="absolute right-2 top-2 z-10 rounded bg-ink/90 px-1.5 py-0.5 font-mono text-[9px] text-amber-300">
                            Máx
                          </div>
                        )}

                        {/* Visual da Carta */}
                        <div className="relative mx-auto aspect-[3/4] w-full overflow-hidden rounded bg-ink/40">
                          {art ? (
                            <Image
                              src={art}
                              alt={pull.card.name}
                              fill
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-caption text-mist">
                              sem arte
                            </div>
                          )}
                        </div>

                        {/* Metadados da Carta */}
                        <div className="mt-2 text-center">
                          <p className="truncate text-caption font-bold text-snow">
                            {pull.card.name}
                          </p>
                          <span
                            className={`inline-block text-[10px] font-bold uppercase ${style.text}`}
                          >
                            {pull.card.rarity}
                          </span>

                          <div className="mt-1 flex flex-wrap justify-center gap-1 font-mono text-[10px] text-mist">
                            <span>
                              {CONDITION_GLYPH[pull.conditionLabel ?? gachaConditionLabel(pull.condition)]}{" "}
                              {pull.conditionLabel ?? gachaConditionLabel(pull.condition)}
                            </span>
                            {pull.foil !== "NORMAL" && (
                              <span className={FOIL_TEXT[pull.foil] ?? "text-mist"}>
                                {pull.foil}
                              </span>
                            )}
                            <span>#{pull.edition}</span>
                          </div>
                        </div>

                        {/* Botão de Alternância de Seleção */}
                        <button
                          type="button"
                          aria-label={`${isSelected ? "Remover" : "Adicionar"} ${
                            pull.card.name
                          } ao Trade-up`}
                          onClick={() => handleToggleCard(pull)}
                          disabled={isMax && !isSelected}
                          className={`mt-2 flex min-h-11 w-full items-center justify-center rounded font-mono text-caption font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${
                            isSelected
                              ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                              : isMismatched
                                ? "bg-panel text-mist hover:bg-panel/90"
                                : "btn-ice"
                          }`}
                        >
                          {isSelected
                            ? "Remover"
                            : isMax
                              ? "Raridade Máx"
                              : isMismatched
                                ? `Outra raridade`
                                : "Selecionar"}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Paginação */}
                {cardsTotalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <PaginationControls
                      page={cardsPage}
                      totalPages={cardsTotalPages}
                      onPageChange={handlePageChange}
                      label="Paginação de cartas do inventário"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Grade de Skins */}
        {mode === "skins" && (
          <div className="mt-6">
            {skinsFetchError && (
              <div role="alert" className="border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200">
                <p>{skinsFetchError}</p>
                <button
                  type="button"
                  onClick={() => void fetchSkins()}
                  className="btn-ghost mt-2 min-h-11 px-3 text-caption text-snow"
                >
                  Tentar carregar novamente
                </button>
              </div>
            )}

            {skinsLoading ? (
              <GachaCardGridSkeleton label="Carregando skins do inventário" />
            ) : filteredSkins.length === 0 ? (
              <EmptyState
                text={
                  skinsRarityFilter
                    ? `Você não tem skins ativas na raridade ${skinsRarityFilter}.`
                    : "Você ainda não possui skins ativas no seu inventário."
                }
                action={
                  <Link href="/gacha/skins" className="btn-ice min-h-11 px-4 inline-flex items-center">
                    Girar Skins
                  </Link>
                }
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {filteredSkins.map((skinCopy) => {
                  const isSelected = selectedSkins.some((s) => s.id === skinCopy.id);
                  const selectedIndex = selectedSkins.findIndex(
                    (s) => s.id === skinCopy.id,
                  );
                  const style = RARITY[skinCopy.rarity] ?? RARITY.COMUM!;
                  const isMismatched =
                    activeRarity !== null && skinCopy.rarity !== activeRarity;
                  const art = safeImageSrc(skinCopy.imageUrl);

                  return (
                    <div
                      key={skinCopy.id}
                      className={`group relative flex flex-col justify-between rounded border transition-all ${
                        isSelected
                          ? "border-ice ring-2 ring-ice"
                          : isMismatched
                            ? "opacity-50 border-hairline/60"
                            : `${style.border} hover:border-snow`
                      } bg-panel/70 p-2.5`}
                    >
                      {isSelected && (
                        <div className="absolute left-2 top-2 z-10 rounded bg-ice px-2 py-0.5 font-mono text-[10px] font-bold text-ink">
                          Slot {selectedIndex + 1}
                        </div>
                      )}

                      <div className="relative mx-auto aspect-square w-full overflow-hidden rounded bg-ink/40">
                        {art ? (
                          <Image
                            src={art}
                            alt={skinCopy.name}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-caption text-mist">
                            sem arte
                          </div>
                        )}
                      </div>

                      <div className="mt-2 text-center">
                        <p className="truncate text-caption font-bold text-snow">
                          {skinCopy.name}
                        </p>
                        <span
                          className={`inline-block text-[10px] font-bold uppercase ${style.text}`}
                        >
                          {skinCopy.rarity}
                        </span>
                      </div>

                      <button
                        type="button"
                        aria-label={`${isSelected ? "Remover" : "Adicionar"} skin ${
                          skinCopy.name
                        } ao Trade-up`}
                        onClick={() => handleToggleSkin(skinCopy)}
                        className={`mt-2 flex min-h-11 w-full items-center justify-center rounded font-mono text-caption font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${
                          isSelected
                            ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                            : isMismatched
                              ? "bg-panel text-mist hover:bg-panel/90"
                              : "btn-ice"
                        }`}
                      >
                        {isSelected
                          ? "Remover"
                          : isMismatched
                            ? "Outra raridade"
                            : "Selecionar"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* DIÁLOGO DE CONFIRMAÇÃO CLARA                            */}
      {/* ========================================================= */}
      <ConfirmDialog
        open={confirmOpen}
        title="Confirmar Trade-up permanente?"
        confirmLabel={
          submitting ? "Processando…" : "Consumir Itens e Realizar Trade-up"
        }
        busyLabel="Processando Trade-up…"
        busy={submitting}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void handleExecuteTradeUp()}
      >
        <div className="space-y-4">
          <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-amber-200">
            <p className="font-bold flex items-center gap-1.5 text-body-sm">
              <span aria-hidden="true">⚠️</span> Ação irreversível
            </p>
            <p className="mt-1 text-caption text-amber-200/90">
              {mode === "cards"
                ? `As ${CARD_TRADE_UP_COUNT} cartas selecionadas serão consumidas permanentemente (status BURNED) e não poderão ser recuperadas.`
                : `As ${SKIN_TRADE_UP_COUNT} skins selecionadas serão consumidas permanentemente (status BURNED) e não poderão ser recuperadas.`}
            </p>
          </div>

          <div>
            <p className="text-caption font-bold uppercase tracking-wider text-mist mb-2">
              Itens que serão consumidos:
            </p>
            <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
              {mode === "cards"
                ? selectedCards.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded border border-hairline bg-ink/40 px-3 py-1.5 text-caption"
                    >
                      <span className="font-bold text-snow truncate max-w-[200px]">
                        {c.card.name}
                      </span>
                      <span className="font-mono text-mist">
                        {c.card.rarity} · #{c.edition} · {c.conditionLabel ?? gachaConditionLabel(c.condition)}
                      </span>
                    </div>
                  ))
                : selectedSkins.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded border border-hairline bg-ink/40 px-3 py-1.5 text-caption"
                    >
                      <span className="font-bold text-snow truncate max-w-[200px]">
                        {s.name}
                      </span>
                      <span className="font-mono text-mist">{s.rarity}</span>
                    </div>
                  ))}
            </div>
          </div>

          <div className="rounded border border-hairline bg-ink/50 p-3">
            <p className="text-caption text-mist">Resultado previsto:</p>
            <p className="font-display text-body-md text-snow">
              {mode === "cards"
                ? `1 Nova Carta de raridade ${nextCardRarity}`
                : `1 Nova Skin aleatória de raridade ${activeRarity}`}
            </p>
          </div>
        </div>
      </ConfirmDialog>

      {/* ========================================================= */}
      {/* PALCO DE FORJAMENTO EXTRAVAGANTE (TRADE-UP FORGE STAGE)   */}
      {/* ========================================================= */}
      {forgeActive && (
        <GachaTradeUpForgeStage
          mode={mode}
          sourceCards={forgingCards}
          sourceSkins={forgingSkins}
          cardResult={cardResult}
          skinResult={skinResult}
          error={submitError}
          currentUser={user}
          onClose={handleCloseForge}
          onReset={handleResetForge}
        />
      )}
    </div>
  );
}
