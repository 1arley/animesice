"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/common/ToastProvider";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { SearchField } from "@/components/ui/SearchField";
import { GachaAdminTabs } from "@/components/admin/GachaAdminTabs";
import { GachaDeleteCardDialog } from "@/components/admin/gacha/GachaDeleteCardDialog";
import {
  GachaJsonEditorModal,
  type JsonCardItem,
  type JsonEditorMode,
} from "@/components/admin/gacha/GachaJsonEditorModal";
import { GachaBulkActionsBar } from "@/components/admin/gacha/GachaBulkActionsBar";
import { GachaSetsManager } from "@/components/admin/gacha/GachaSetsManager";
import { GACHA_RARITY_COLORS } from "@/lib/gacha-rarity-colors";
import type {
  AdminGachaCard,
  GachaEngagementPilotDashboard,
  GachaPull,
} from "@/types";

const TIERS = [
  "COMUM",
  "INCOMUM",
  "RARA",
  "EPICA",
  "LENDARIA",
  "MITICA",
  "GALACTICA",
] as const;

const PAGE_SIZE = 48;
const ANIME_SUGGEST_LIMIT = 25;
const ANIME_MIN_QUERY = 2;
const SEARCH_DEBOUNCE_MS = 250;
const REASON_MIN = 10;

type WorkspaceTab = "cards" | "sets" | "users";

/** O picker aceita tanto o anime completo da busca quanto o resumo do card. */
type AnimeOption = {
  id: string;
  title: string;
  year?: number | null;
  malId?: number | null;
  published?: boolean;
  coverImage?: string | null;
};

/** Rótulo legível da opção: título + ano + id externo (títulos duplicam no catálogo). */
function animeLabel(anime: AnimeOption) {
  return [
    anime.title,
    anime.year ? String(anime.year) : null,
    anime.malId ? `MAL ${anime.malId}` : null,
    anime.published === false ? "rascunho" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function AdminGachaPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Navegação de espaços de trabalho
  const [workspace, setWorkspace] = useState<WorkspaceTab>("cards");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Cartas do pool
  const [cards, setCards] = useState<AdminGachaCard[]>([]);
  const [cardMeta, setCardMeta] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [cardSearch, setCardSearch] = useState("");
  const [rarity, setRarity] = useState("");
  const [status, setStatus] = useState("");
  const [animeFilter, setAnimeFilter] = useState("");
  const [animeFilterTitle, setAnimeFilterTitle] = useState("");
  const [animeQuery, setAnimeQuery] = useState("");
  const [animeResults, setAnimeResults] = useState<AnimeOption[]>([]);
  const [animeSearching, setAnimeSearching] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<AnimeOption | null>(null);

  // Seleção múltipla para ações em cascata
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  // Modal de Exclusão de Cartas
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cardsToDelete, setCardsToDelete] = useState<AdminGachaCard[]>([]);
  const [deletingBusy, setDeletingBusy] = useState(false);

  // Modal de Edição / Importação via JSON
  const [jsonModalState, setJsonModalState] = useState<{
    open: boolean;
    mode: JsonEditorMode;
    targetCard?: AdminGachaCard | null;
    targetCards?: AdminGachaCard[];
    defaultAnimeId?: string;
    animeTitle?: string;
  }>({
    open: false,
    mode: "single",
  });
  const [jsonBusy, setJsonBusy] = useState(false);

  // Gestão de Usuários
  const [users, setUsers] = useState<
    {
      id: string;
      email: string;
      name: string | null;
      userName: string | null;
    }[]
  >([]);
  const [userCards, setUserCards] = useState<GachaPull[]>([]);
  const [userCardsMeta, setUserCardsMeta] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [userPage, setUserPage] = useState(1);
  const [userCardsVersion, setUserCardsVersion] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState("");

  // Formulário de criação/edição individual
  const [form, setForm] = useState({
    name: "",
    image: "",
    imageHidden: false,
    rarity: "COMUM",
    animeId: "",
    reason: "",
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Piloto
  const [pilot, setPilot] = useState<GachaEngagementPilotDashboard | null>(null);
  const [pilotPercent, setPilotPercent] = useState(10);
  const [savingPilot, setSavingPilot] = useState(false);
  const [pilotMessage, setPilotMessage] = useState("");

  // Refs de debounce
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardsRequest = useRef(0);
  const animeSearchRequest = useRef(0);
  const userSearchRequest = useRef(0);

  const isSuperAdmin = user?.role === "SUPERADMIN";

  const editingCard = useMemo(
    () =>
      editing ? (cards.find((card) => card.id === editing) ?? null) : null,
    [editing, cards],
  );

  const animeOptions = useMemo(
    () =>
      selectedAnime &&
      !animeResults.some((anime) => anime.id === selectedAnime.id)
        ? [selectedAnime, ...animeResults]
        : animeResults,
    [animeResults, selectedAnime],
  );

  const needsReason = Boolean(
    editingCard &&
      (editingCard.rarity !== form.rarity ||
        (editingCard.animeId ?? "") !== form.animeId),
  );

  const detachedAnime = Boolean(
    editingCard && !editingCard.animeId && editingCard.animeTitle,
  );

  const selectedCardsList = useMemo(
    () => cards.filter((c) => selectedCardIds.has(c.id)),
    [cards, selectedCardIds],
  );

  const isAllCurrentPageSelected = useMemo(
    () => cards.length > 0 && cards.every((c) => selectedCardIds.has(c.id)),
    [cards, selectedCardIds],
  );

  const loadCards = useCallback(
    async (
      page = 1,
      name = cardSearch,
      rar = rarity,
      anime = animeFilter,
      state = status,
    ) => {
      const requestId = ++cardsRequest.current;
      try {
        const res = await api.adminListGachaCards(
          page,
          PAGE_SIZE,
          name || undefined,
          rar || undefined,
          anime || undefined,
          state || undefined,
        );
        if (requestId !== cardsRequest.current) return;
        setCards(res.data);
        setCardMeta({
          page: res.meta.page,
          totalPages: res.meta.totalPages,
          total: res.meta.total,
        });
      } catch (e) {
        if (requestId !== cardsRequest.current) return;
        setError(e instanceof ApiError ? e.message : "Erro ao carregar pool.");
      }
    },
    [cardSearch, rarity, animeFilter, status],
  );

  useEffect(() => {
    void loadCards(1);
  }, [loadCards]);

  useEffect(() => {
    api
      .adminGachaEngagementPilot()
      .then((dashboard) => {
        setPilot(dashboard);
        setPilotPercent(dashboard.config.percent);
      })
      .catch((e) =>
        setError(
          e instanceof ApiError ? e.message : "Erro ao carregar o piloto.",
        ),
      );
  }, []);

  const pilotAlerts = pilot
    ? [
        pilot.economy.pause &&
          `o piloto emite mais cristal do que o grupo gasta (${pilot.economy.emitted} emitidos contra ${pilot.economy.sinks} gastos; o alerta dispara acima de 120%).`,
        pilot.behavior.rewardOnlyRate > 0.3 &&
          `${(pilot.behavior.rewardOnlyRate * 100).toFixed(0)}% de quem ganhou cristais só volta pela recompensa, sem girar ou descobrir carta (alerta acima de 30%).`,
        pilot.behavior.sharedCards > pilot.cohort.assigned * 0.1 &&
          `${pilot.behavior.sharedCards} carta(s) estão com três ou mais contas do piloto (alerta acima de 10% da coorte).`,
      ].filter(Boolean)
    : [];

  async function savePilot() {
    if (savingPilot) return;
    setSavingPilot(true);
    setPilotMessage("");
    try {
      setPilot(await api.adminUpdateGachaEngagementPilot(pilotPercent));
      setPilotMessage(
        `Percentual do piloto em ${pilotPercent}% da base. As contas que entram agora entram na próxima vez que abrirem o gacha; as que já estavam dentro continuam dentro.`,
      );
      toast("Piloto atualizado com sucesso.", "success");
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Erro ao atualizar o piloto.",
      );
    } finally {
      setSavingPilot(false);
    }
  }

  function onCardSearch(value: string) {
    setCardSearch(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(
      () => void loadCards(1, value, rarity, animeFilter, status),
      350,
    );
  }

  function onRarityChange(value: string) {
    setRarity(value);
    void loadCards(1, cardSearch, value, animeFilter, status);
  }

  function onStatusChange(value: string) {
    setStatus(value);
    void loadCards(1, cardSearch, rarity, animeFilter, value);
  }

  function onAnimeFilterChange(value: string, title = "") {
    setAnimeFilter(value);
    setAnimeFilterTitle(title);
    void loadCards(1, cardSearch, rarity, value, status);
  }

  function toggleAnimeFilter() {
    const nextFilter = animeFilter === form.animeId ? "" : form.animeId;
    const nextTitle = nextFilter ? selectedAnime?.title || "" : "";
    onAnimeFilterChange(nextFilter, nextTitle);
  }

  function gotoCardPage(page: number) {
    void loadCards(page);
  }

  function onUserSearch(value: string) {
    setSearch(value);
    if (userSearchDebounce.current) clearTimeout(userSearchDebounce.current);
    if (value.trim().length < ANIME_MIN_QUERY) {
      setUsers([]);
      return;
    }
    const requestId = ++userSearchRequest.current;
    userSearchDebounce.current = setTimeout(() => {
      api
        .adminListUsers(1, 10, value.trim())
        .then((res) => {
          if (requestId === userSearchRequest.current) setUsers(res.data);
        })
        .catch((e) => {
          if (requestId !== userSearchRequest.current) return;
          setError(
            e instanceof ApiError ? e.message : "Erro ao buscar usuários.",
          );
        });
    }, SEARCH_DEBOUNCE_MS);
  }

  useEffect(() => {
    const requestId = ++animeSearchRequest.current;
    const query = animeQuery.trim();
    if (query.length < ANIME_MIN_QUERY) {
      setAnimeResults([]);
      setAnimeSearching(false);
      return;
    }
    setAnimeSearching(true);
    const timer = setTimeout(() => {
      api
        .adminListAnimes(1, ANIME_SUGGEST_LIMIT, query, false)
        .then((res) => {
          if (requestId !== animeSearchRequest.current) return;
          setAnimeResults(res.data);
        })
        .catch((e) => {
          if (requestId !== animeSearchRequest.current) return;
          setError(e instanceof ApiError ? e.message : "Erro ao buscar animes.");
        })
        .finally(() => {
          if (requestId === animeSearchRequest.current)
            setAnimeSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [animeQuery]);

  function selectAnime(id: string) {
    const anime = animeOptions.find((option) => option.id === id) ?? null;
    setSelectedAnime(anime);
    setForm((current) => ({
      ...current,
      animeId: id,
      image: current.image || anime?.coverImage || "",
    }));
    if (animeFilter && animeFilter !== id) onAnimeFilterChange("");
  }

  function clearAnime() {
    setSelectedAnime(null);
    setAnimeQuery("");
    setAnimeResults([]);
    setForm((current) => ({ ...current, animeId: "" }));
    if (animeFilter) onAnimeFilterChange("");
  }

  function startEdit(card: AdminGachaCard) {
    setEditing(card.id);
    setShowCreateForm(true);
    setError(null);
    setSelectedAnime(card.anime ?? null);
    setAnimeQuery("");
    setAnimeResults([]);
    setForm({
      name: card.name,
      image: card.image ?? "",
      imageHidden: card.imageHidden,
      rarity: card.rarity,
      animeId: card.animeId ?? "",
      reason: "",
    });
  }

  function duplicateCard(card: AdminGachaCard) {
    setEditing(null);
    setShowCreateForm(true);
    setError(null);
    setSelectedAnime(card.anime ?? null);
    setAnimeQuery("");
    setAnimeResults([]);
    setForm({
      name: `${card.name} (Cópia)`,
      image: card.image ?? "",
      imageHidden: card.imageHidden,
      rarity: card.rarity,
      animeId: card.animeId ?? "",
      reason: "",
    });
    toast(`Dados de "${card.name}" copiados para nova carta.`, "success");
  }

  function resetForm() {
    setForm({
      name: "",
      image: "",
      imageHidden: false,
      rarity: "COMUM",
      animeId: "",
      reason: "",
    });
    setEditing(null);
    setShowCreateForm(false);
    setSelectedAnime(null);
    setAnimeQuery("");
    if (animeFilter) onAnimeFilterChange("");
    setAnimeResults([]);
  }

  function cancelEdit() {
    resetForm();
    setError(null);
  }

  async function saveCard(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.animeId) {
      setError("Escolha o anime da carta antes de salvar.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      imageHidden: form.imageHidden,
      animeId: form.animeId,
      ...(form.image.trim() ? { image: form.image.trim() } : {}),
    };
    try {
      if (editing && editingCard) {
        const rarityChanged = editingCard.rarity !== form.rarity;
        const animeChanged = (editingCard.animeId ?? "") !== form.animeId;
        if (
          rarityChanged &&
          !window.confirm(
            "Alterar raridade recalculará todas as cópias sem override. Continuar?",
          )
        )
          return;
        if (rarityChanged || animeChanged) {
          if (form.reason.trim().length < REASON_MIN) {
            setError(
              `Motivo obrigatório (mínimo ${REASON_MIN} caracteres) para mudar anime ou raridade.`,
            );
            return;
          }
          await api.adminUpdateGachaCard(editing, {
            ...payload,
            rarity: form.rarity,
            reason: form.reason.trim(),
          });
        } else {
          await api.adminUpdateGachaCard(editing, payload);
        }
      } else {
        await api.adminCreateGachaCard({ ...payload, rarity: form.rarity });
      }
      const page = cardMeta.page;
      resetForm();
      toast("Carta salva com sucesso.", "success");
      await loadCards(page);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao salvar carta.");
    }
  }

  // --- SELEÇÃO MÚLTIPLA & AÇÕES EM CASCATA ---
  function toggleCardSelection(id: string) {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllCurrentPage() {
    if (isAllCurrentPageSelected) {
      setSelectedCardIds(new Set());
    } else {
      setSelectedCardIds(new Set(cards.map((c) => c.id)));
    }
  }

  function clearSelection() {
    setSelectedCardIds(new Set());
  }

  // Exclusão individual ou em lote
  function requestDeleteCard(card: AdminGachaCard) {
    setCardsToDelete([card]);
    setDeleteModalOpen(true);
  }

  function requestDeleteSelectedCards() {
    if (selectedCardsList.length === 0) return;
    setCardsToDelete(selectedCardsList);
    setDeleteModalOpen(true);
  }

  async function handleConfirmDelete(reason: string) {
    if (cardsToDelete.length === 0) return;
    setDeletingBusy(true);
    try {
      if (cardsToDelete.length === 1) {
        await api.adminDeleteGachaCard(cardsToDelete[0].id, reason);
        toast(`Carta "${cardsToDelete[0].name}" excluída.`, "success");
      } else {
        const res = await api.adminBulkDeleteGachaCards(
          cardsToDelete.map((c) => c.id),
          reason,
        );
        toast(`${res.deletedCount} cartas excluídas do pool.`, "success");
      }
      setDeleteModalOpen(false);
      setCardsToDelete([]);
      setSelectedCardIds(new Set());
      await loadCards(cardMeta.page);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao excluir cartas.");
    } finally {
      setDeletingBusy(false);
    }
  }

  // Ações em cascata
  async function handleBulkStatus(newStatus: "ACTIVE" | "ARCHIVED" | "DRAFT") {
    if (selectedCardIds.size === 0) return;
    setBulkBusy(true);
    try {
      const res = await api.adminBulkStatusGachaCards(
        Array.from(selectedCardIds),
        newStatus,
        `Status alterado em lote para ${newStatus}`,
      );
      toast(`${res.updatedCount} cartas atualizadas para ${newStatus}.`, "success");
      setSelectedCardIds(new Set());
      await loadCards(cardMeta.page);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao alterar status em lote.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleBulkRarity(newRarity: string, reason: string) {
    if (selectedCardIds.size === 0) return;
    setBulkBusy(true);
    try {
      const res = await api.adminBulkUpdateGachaCards(
        Array.from(selectedCardIds),
        { rarity: newRarity, reason },
      );
      toast(`Raridade de ${res.updatedCount} cartas alterada para ${newRarity}.`, "success");
      setSelectedCardIds(new Set());
      await loadCards(cardMeta.page);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao alterar raridade em lote.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleBulkMoveAnime(newAnimeId: string, reason: string) {
    if (selectedCardIds.size === 0) return;
    setBulkBusy(true);
    try {
      const res = await api.adminBulkUpdateGachaCards(
        Array.from(selectedCardIds),
        { animeId: newAnimeId, reason },
      );
      toast(`${res.updatedCount} cartas movidas para o novo anime.`, "success");
      setSelectedCardIds(new Set());
      await loadCards(cardMeta.page);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao mover cartas.");
    } finally {
      setBulkBusy(false);
    }
  }

  // JSON Import & Export
  function openSingleCardJson(card: AdminGachaCard) {
    setJsonModalState({
      open: true,
      mode: "single",
      targetCard: card,
    });
  }

  function openBatchJsonForSelected() {
    if (selectedCardsList.length === 0) return;
    setJsonModalState({
      open: true,
      mode: "batch-edit",
      targetCards: selectedCardsList,
    });
  }

  function openBatchJsonImport(defaultAnimeId = "", title = "") {
    setJsonModalState({
      open: true,
      mode: "batch-import",
      defaultAnimeId,
      animeTitle: title,
    });
  }

  function handleExportSelectedJson() {
    const list = selectedCardsList.length > 0 ? selectedCardsList : cards;
    const exportData = list.map((c) => ({
      name: c.name,
      rarity: c.rarity,
      image: c.image,
      imageHidden: c.imageHidden,
      animeId: c.animeId,
      animeTitle: c.anime?.title || c.animeTitle,
      variantName: c.variantName || undefined,
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cartas-gacha-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`${exportData.length} cartas exportadas como JSON.`, "success");
  }

  async function handleSaveSingleJson(
    id: string,
    data: Partial<JsonCardItem> & { reason?: string },
  ) {
    setJsonBusy(true);
    try {
      await api.adminUpdateGachaCard(id, data);
      toast("Carta atualizada via JSON.", "success");
      await loadCards(cardMeta.page);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao salvar JSON da carta.");
    } finally {
      setJsonBusy(false);
    }
  }

  async function handleSaveBatchJson(
    items: JsonCardItem[],
    mode: "import" | "edit",
  ) {
    setJsonBusy(true);
    try {
      if (mode === "import") {
        const res = await api.adminBulkCreateGachaCards(
          items.map((i) => ({
            name: i.name,
            image: i.image,
            imageHidden: i.imageHidden,
            rarity: i.rarity,
            animeId: i.animeId!,
            variantName: i.variantName,
          })),
        );
        toast(`${res.createdCount} novas cartas importadas com sucesso!`, "success");
      } else {
        let updatedCount = 0;
        for (const item of items) {
          if (item.id) {
            await api.adminUpdateGachaCard(item.id, {
              name: item.name,
              image: item.image,
              imageHidden: item.imageHidden,
              rarity: item.rarity,
              animeId: item.animeId,
              variantName: item.variantName,
            });
            updatedCount++;
          }
        }
        toast(`${updatedCount} cartas atualizadas via lote JSON!`, "success");
      }
      setSelectedCardIds(new Set());
      await loadCards(cardMeta.page);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao processar lote JSON.");
    } finally {
      setJsonBusy(false);
    }
  }

  // Usuários
  function loadUserCards(id: string, page = 1) {
    setUserCards([]);
    setUserCardsMeta({ page, totalPages: 1, total: 0 });
    setSelectedUser(id);
    setUserPage(page);
    setUserCardsVersion((v) => v + 1);
  }

  useEffect(() => {
    if (!selectedUser) return;
    let cancelled = false;
    setError(null);
    api
      .adminListUserCards(selectedUser, userPage)
      .then((res) => {
        if (cancelled) return;
        setUserCards(res.data);
        setUserCardsMeta({
          page: res.meta.page,
          totalPages: res.meta.totalPages,
          total: res.meta.total,
        });
      })
      .catch((e) => {
        if (!cancelled)
          setError(
            e instanceof ApiError ? e.message : "Erro ao carregar cartas.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [selectedUser, userPage, userCardsVersion]);

  async function removeCard(id: string) {
    if (!window.confirm("Excluir carta do usuário?")) return;
    try {
      await api.adminDeleteUserCard(id);
      setUserCardsVersion((v) => v + 1);
      toast("Carta removida do usuário.", "success");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao excluir carta.");
    }
  }

  async function resetRoll() {
    if (!selectedUser || !window.confirm("Resetar roll de hoje?")) return;
    try {
      await api.adminResetGachaRoll(selectedUser);
      toast("Roll diário resetado.", "success");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao resetar roll.");
    }
  }

  async function grantCard(cardId: string) {
    if (!selectedUser) return;
    try {
      await api.adminGrantUserCard(selectedUser, cardId);
      setUserCardsVersion((v) => v + 1);
      toast("Carta concedida ao usuário.", "success");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao conceder carta.");
    }
  }

  async function setCardValue(card: GachaPull, restore = false) {
    const raw = restore
      ? null
      : window.prompt(
          "Novo valor inteiro entre 0 e 1000000",
          String(card.value),
        );
    if (!restore && raw === null) return;
    const reasonPrompt = window.prompt("Motivo da alteração (mínimo 10 caracteres)");
    if (!reasonPrompt) return;
    try {
      await api.adminSetUserCardValue(card.id, {
        value: restore ? null : Number(raw),
        reason: reasonPrompt,
      });
      setUserCardsVersion((v) => v + 1);
      toast("Valor da carta ajustado.", "success");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao ajustar valor.");
    }
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Cabeçalho Superior */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-display-xl text-snow">Gacha Admin</h1>
          <p className="mt-1 text-body-sm text-mist">
            Gerenciamento central de cartas, conjuntos, lotes JSON e economia do Gacha.
          </p>
        </div>
        <GachaAdminTabs current="/admin/gacha" />
      </div>

      {error && (
        <div
          role="alert"
          className="border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal flex items-center justify-between gap-2"
        >
          <span>{error}</span>
          <button
            type="button"
            className="text-caption underline"
            onClick={() => setError(null)}
          >
            Fechar
          </button>
        </div>
      )}

      {/* Navegação entre Espaços de Trabalho */}
      <nav aria-label="Espaços de trabalho do Gacha" className="border-b border-hairline flex flex-wrap gap-2">
        <button
          type="button"
          className={`px-4 py-2.5 font-display text-body-sm font-medium border-b-2 transition-colors ${
            workspace === "cards"
              ? "border-ice text-ice bg-ice/5"
              : "border-transparent text-mist hover:text-snow hover:bg-white/5"
          }`}
          onClick={() => setWorkspace("cards")}
        >
          🗂️ Cartas do Pool ({cardMeta.total})
        </button>
        <button
          type="button"
          className={`px-4 py-2.5 font-display text-body-sm font-medium border-b-2 transition-colors ${
            workspace === "sets"
              ? "border-ice text-ice bg-ice/5"
              : "border-transparent text-mist hover:text-snow hover:bg-white/5"
          }`}
          onClick={() => setWorkspace("sets")}
        >
          📦 Gerenciador de Conjuntos (Sets)
        </button>
        <button
          type="button"
          className={`px-4 py-2.5 font-display text-body-sm font-medium border-b-2 transition-colors ${
            workspace === "users"
              ? "border-ice text-ice bg-ice/5"
              : "border-transparent text-mist hover:text-snow hover:bg-white/5"
          }`}
          onClick={() => setWorkspace("users")}
        >
          👤 Usuários & Concessões
        </button>
      </nav>

      {/* PILOTO DE DESTAQUE (se ativo) */}
      {pilot && (
        <section
          aria-labelledby="pilot-title"
          className="border border-hairline bg-panel p-4"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2
                id="pilot-title"
                className="font-display text-display-lg text-snow"
              >
                Piloto de destaque
              </h2>
              <p className="mt-1 max-w-2xl text-body-sm text-mist">
                Destaque, coleção e medalhas saem para parte da base. Grupo de{" "}
                <strong className="text-snow">
                  {pilot.config.percent}% da base
                </strong>{" "}
                desde {new Date(pilot.config.startedAt).toLocaleDateString("pt-BR")}.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label
                className="grid gap-1 text-caption text-mist"
                htmlFor="pilot-percent"
              >
                Percentual da base
                <input
                  id="pilot-percent"
                  className="field w-28"
                  type="number"
                  min={0}
                  max={100}
                  value={pilotPercent}
                  onChange={(e) => setPilotPercent(Number(e.target.value))}
                />
              </label>
              {isSuperAdmin && (
                <button
                  type="button"
                  className="admin-tab min-h-11"
                  disabled={
                    savingPilot || pilotPercent < 0 || pilotPercent > 100
                  }
                  onClick={() => void savePilot()}
                >
                  {savingPilot ? "Salvando…" : "Aplicar"}
                </button>
              )}
            </div>
          </div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border border-hairline p-3">
              <dt className="font-mono text-caption text-mist">
                Contas no piloto
              </dt>
              <dd className="mt-1 text-title text-snow">
                {pilot.cohort.assigned}/{pilot.cohort.totalUsers}
              </dd>
            </div>
            <div className="border border-hairline p-3">
              <dt className="font-mono text-caption text-mist">
                Cristais emitidos / gastos
              </dt>
              <dd className="mt-1 text-title text-snow">
                {pilot.economy.emitted} / {pilot.economy.sinks}
              </dd>
            </div>
            <div className="border border-hairline p-3">
              <dt className="font-mono text-caption text-mist">
                Retorno só por recompensa
              </dt>
              <dd className="mt-1 text-title text-snow">
                {(pilot.behavior.rewardOnlyRate * 100).toFixed(1)}%
              </dd>
            </div>
            <div className="border border-hairline p-3">
              <dt className="font-mono text-caption text-mist">
                Cartas com 3+ donos
              </dt>
              <dd className="mt-1 text-title text-snow">
                {pilot.behavior.sharedCards}
              </dd>
            </div>
          </dl>
          {pilotAlerts.length > 0 && (
            <p
              role="status"
              className="mt-4 border border-signal/40 p-3 text-body-sm text-signal"
            >
              Não expanda ainda: {pilotAlerts.join(" ")}
            </p>
          )}
          {pilotMessage && (
            <p
              role="status"
              aria-atomic="true"
              className="mt-2 text-body-sm text-ice"
            >
              {pilotMessage}
            </p>
          )}
        </section>
      )}

      {/* ======================================================== */}
      {/* ABA 1: CARTAS DO POOL                                    */}
      {/* ======================================================== */}
      {workspace === "cards" && (
        <section aria-labelledby="cards-pool-heading" className="space-y-6">
          {/* Barra de Ações Rápidas do Pool */}
          <div className="flex flex-wrap items-center justify-between gap-3 border border-hairline bg-panel p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={`admin-tab ${showCreateForm ? "border-ice text-ice bg-ice/10" : ""}`}
                onClick={() => {
                  if (showCreateForm && !editing) {
                    setShowCreateForm(false);
                  } else {
                    resetForm();
                    setShowCreateForm(true);
                  }
                }}
              >
                {showCreateForm && !editing ? "Fechar Formulário" : "+ Criar Carta"}
              </button>
              <button
                type="button"
                className="admin-tab"
                onClick={() => openBatchJsonImport(animeFilter, animeFilterTitle)}
                title="Criar várias cartas colando JSON"
              >
                ⚡ Importar em Lote (JSON)
              </button>
              <button
                type="button"
                className="admin-tab"
                onClick={handleExportSelectedJson}
                title="Exportar cartas filtradas ou selecionadas como JSON"
              >
                Exportar JSON
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-caption text-mist">Modo de Exibição:</span>
              <button
                type="button"
                className={`px-2.5 py-1 text-caption border transition-colors ${
                  viewMode === "grid"
                    ? "border-ice text-ice bg-ice/10"
                    : "border-hairline text-mist hover:text-snow"
                }`}
                onClick={() => setViewMode("grid")}
                title="Visualização em grade com arte"
              >
                Grade Visual
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 text-caption border transition-colors ${
                  viewMode === "list"
                    ? "border-ice text-ice bg-ice/10"
                    : "border-hairline text-mist hover:text-snow"
                }`}
                onClick={() => setViewMode("list")}
                title="Visualização em lista compacta"
              >
                Lista Compacta
              </button>
            </div>
          </div>

          {/* Formulário de Criação / Edição Individual */}
          {showCreateForm && (
            <div className="border border-hairline bg-panel p-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-hairline pb-3">
                <h3 className="font-display text-display-md text-snow">
                  {editing
                    ? `Editando Carta: ${editingCard?.name ?? ""}`
                    : "Criar Nova Carta"}
                </h3>
                <div className="flex items-center gap-2">
                  {editingCard && (
                    <button
                      type="button"
                      className="admin-tab text-caption"
                      onClick={() => openSingleCardJson(editingCard)}
                    >
                      {"{ }"} Editar via JSON
                    </button>
                  )}
                  <button
                    type="button"
                    className="admin-tab text-caption"
                    onClick={cancelEdit}
                  >
                    Fechar
                  </button>
                </div>
              </div>

              <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={saveCard}>
                <div className="space-y-3">
                  <label className="grid gap-1" htmlFor="card-name">
                    <span className="text-caption text-mist">Nome do Personagem</span>
                    <input
                      id="card-name"
                      className="field"
                      required
                      placeholder="Ex.: Naruto Uzumaki, Satoru Gojo"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </label>

                  <label className="grid gap-1" htmlFor="card-image">
                    <span className="text-caption text-mist">Imagem HTTPS</span>
                    <input
                      id="card-image"
                      className="field"
                      required={!editing}
                      type="url"
                      placeholder="https://…"
                      value={form.image}
                      onChange={(e) => setForm({ ...form, image: e.target.value })}
                    />
                  </label>

                  <label className="flex items-center gap-2 text-body-sm text-mist">
                    <input
                      type="checkbox"
                      checked={form.imageHidden}
                      onChange={(e) =>
                        setForm({ ...form, imageHidden: e.target.checked })
                      }
                    />
                    Ocultar arte como ??? (carta secreta)
                  </label>

                  <label className="grid gap-1" htmlFor="card-rarity">
                    <span className="text-caption text-mist">Raridade</span>
                    <select
                      id="card-rarity"
                      className="field"
                      value={form.rarity}
                      onChange={(e) => setForm({ ...form, rarity: e.target.value })}
                    >
                      {TIERS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="grid gap-1">
                    <label className="text-caption text-mist" htmlFor="card-anime-search">
                      Buscar Anime no Catálogo
                    </label>
                    <SearchField
                      id="card-anime-search"
                      autoComplete="off"
                      placeholder="Título, título japonês ou ID do MAL"
                      value={animeQuery}
                      onChange={(e) => setAnimeQuery(e.target.value)}
                      containerClassName="w-full"
                    />
                    <p className="text-caption text-mist-soft" role="status">
                      {animeQuery.trim().length < ANIME_MIN_QUERY
                        ? `Digite ao menos ${ANIME_MIN_QUERY} caracteres para pesquisar.`
                        : animeSearching
                          ? "Buscando animes…"
                          : `${animeOptions.length} resultado(s) disponível(is).`}
                    </p>
                  </div>

                  <label className="grid gap-1" htmlFor="card-anime-select">
                    <span className="text-caption text-mist">Anime Selecionado</span>
                    <select
                      id="card-anime-select"
                      className="field"
                      required
                      value={form.animeId}
                      onChange={(e) => selectAnime(e.target.value)}
                    >
                      <option value="">Selecione o anime</option>
                      {animeOptions.map((anime) => (
                        <option key={anime.id} value={anime.id}>
                          {animeLabel(anime)}
                        </option>
                      ))}
                    </select>
                  </label>

                  {detachedAnime && (
                    <p
                      role="status"
                      className="border border-signal/40 bg-signal/10 p-2 text-caption text-signal"
                    >
                      Esta carta guarda só o texto “{editingCard?.animeTitle}” sem vínculo. Escolha um anime para corrigir.
                    </p>
                  )}

                  {selectedAnime && (
                    <div className="flex items-center justify-between gap-2 border border-hairline bg-black/20 p-2">
                      <span className="truncate text-body-sm text-snow">
                        {animeLabel(selectedAnime)}
                      </span>
                      <button
                        type="button"
                        className="admin-tab text-caption"
                        onClick={clearAnime}
                      >
                        Trocar
                      </button>
                    </div>
                  )}

                  {editing && needsReason && (
                    <label className="grid gap-1" htmlFor="card-reason">
                      <span className="text-caption text-mist">
                        Motivo da alteração (obrigatório, mínimo {REASON_MIN} caracteres)
                      </span>
                      <input
                        id="card-reason"
                        className="field"
                        required
                        minLength={REASON_MIN}
                        placeholder="Mínimo 10 caracteres — registrado na auditoria"
                        value={form.reason}
                        onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      />
                    </label>
                  )}
                </div>

                <div className="md:col-span-2 flex flex-wrap gap-2 pt-2 border-t border-hairline">
                  <button className="btn-ice px-5 py-2 text-body-sm font-medium" type="submit">
                    {editing ? "Salvar Alterações" : "Criar Carta"}
                  </button>
                  <button
                    type="button"
                    className="admin-tab"
                    onClick={cancelEdit}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filtros e Busca */}
          <div className="border border-hairline bg-panel p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_10rem]">
              <SearchField
                placeholder="Buscar personagem por nome…"
                aria-label="Buscar personagem"
                value={cardSearch}
                onChange={(e) => onCardSearch(e.target.value)}
                containerClassName="w-full"
              />
              <select
                className="field"
                aria-label="Filtrar raridade"
                value={rarity}
                onChange={(e) => onRarityChange(e.target.value)}
              >
                <option value="">Todas as Raridades</option>
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                className="field"
                aria-label="Filtrar status"
                value={status}
                onChange={(e) => onStatusChange(e.target.value)}
              >
                <option value="">Todos os Status</option>
                <option value="DRAFT">Rascunho</option>
                <option value="REVIEW">Revisão</option>
                <option value="ACTIVE">Ativa</option>
                <option value="ARCHIVED">Arquivada</option>
              </select>
            </div>

            {/* Chips de filtro ativo & Selecionar todas */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-hairline/60">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={`admin-tab text-caption ${isAllCurrentPageSelected ? "border-ice text-ice bg-ice/10" : ""}`}
                  onClick={toggleSelectAllCurrentPage}
                >
                  {isAllCurrentPageSelected ? "Desmarcar Página" : "Selecionar Todas da Página"}
                </button>

                {form.animeId && (
                  <button
                    type="button"
                    className={`admin-tab text-caption ${animeFilter === form.animeId ? "border-ice text-ice" : ""}`}
                    onClick={toggleAnimeFilter}
                  >
                    Só cartas deste anime ({selectedAnime?.title || "Atual"})
                  </button>
                )}

                {animeFilter && (
                  <div className="flex items-center gap-1.5 bg-ice/15 border border-ice/30 px-2.5 py-1 rounded text-caption text-ice">
                    <span>Filtro de anime: {animeFilterTitle || animeFilter}</span>
                    <button
                      type="button"
                      className="hover:text-snow ml-1 font-bold"
                      onClick={() => onAnimeFilterChange("")}
                      title="Remover filtro de anime"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <span className="font-mono text-caption text-mist">
                {cardMeta.total} cartas · página {cardMeta.page} de {cardMeta.totalPages}
              </span>
            </div>
          </div>

          {/* ==================================================== */}
          {/* GRADE VISUAL OU LISTA COMPACTA DE CARTAS             */}
          {/* ==================================================== */}
          {cards.length === 0 ? (
            <div className="border border-hairline bg-panel p-12 text-center text-mist">
              Nenhuma carta encontrada com os filtros selecionados.
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {cards.map((card) => {
                const isSelected = selectedCardIds.has(card.id);
                const rarityColor =
                  GACHA_RARITY_COLORS[card.rarity as keyof typeof GACHA_RARITY_COLORS] ||
                  "#38E8DA";

                return (
                  <div
                    key={card.id}
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-lg border transition-all ${
                      isSelected
                        ? "border-ice ring-2 ring-ice/40 bg-ice/5"
                        : "border-hairline bg-panel hover:border-hairline/80"
                    }`}
                  >
                    {/* Header do Card: Checkbox + Status */}
                    <div className="relative aspect-[3/4] w-full bg-black/60 overflow-hidden">
                      {card.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={card.image}
                          alt={card.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-mist text-caption">
                          Sem Imagem
                        </div>
                      )}

                      {/* Checkbox de seleção */}
                      <label
                        className="absolute top-2 left-2 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded bg-ink/80 backdrop-blur border border-hairline hover:border-ice"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleCardSelection(card.id)}
                          className="h-4 w-4 cursor-pointer accent-ice"
                          aria-label={`Selecionar ${card.name}`}
                        />
                      </label>

                      {/* Badge de Raridade */}
                      <div className="absolute top-2 right-2 z-10">
                        <span
                          className="text-caption font-bold px-2 py-0.5 rounded border shadow-md font-mono"
                          style={{
                            borderColor: `${rarityColor}80`,
                            color: rarityColor,
                            backgroundColor: "rgba(10, 10, 15, 0.85)",
                          }}
                        >
                          {card.rarity}
                        </span>
                      </div>

                      {/* Badges de rodapé da imagem (Status + Oculta) */}
                      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center justify-between gap-1 z-10">
                        <span
                          className={`text-caption px-1.5 py-0.5 rounded font-mono text-[10px] uppercase font-semibold ${
                            card.status === "ACTIVE"
                              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                              : card.status === "DRAFT"
                                ? "bg-amber-950/80 text-amber-300 border border-amber-500/30"
                                : "bg-zinc-900/80 text-mist border border-hairline"
                          }`}
                        >
                          {card.status}
                        </span>

                        <span className="text-caption text-mist-soft bg-black/70 px-1.5 py-0.5 rounded font-mono text-[10px]">
                          {card._count?.owners ? `${card._count.owners} donos` : "0 donos"}
                        </span>
                      </div>
                    </div>

                    {/* Conteúdo textual */}
                    <div className="p-3 space-y-1">
                      <h4 className="truncate font-display text-body-sm font-semibold text-snow" title={card.name}>
                        {card.name}
                      </h4>
                      <p className="truncate text-caption text-mist-soft" title={card.anime?.title ?? card.animeTitle ?? ""}>
                        {card.anime?.title ?? card.animeTitle ?? (
                          <span className="text-signal">Sem vínculo</span>
                        )}
                      </p>
                    </div>

                    {/* Barra de Ações Rápidas da Carta */}
                    <div className="border-t border-hairline/60 bg-black/20 p-2 flex flex-wrap items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="admin-tab text-caption px-2 py-1"
                          onClick={() => startEdit(card)}
                          title="Editar carta no formulário"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="admin-tab text-caption px-1.5 py-1"
                          onClick={() => duplicateCard(card)}
                          title="Duplicar carta (criar variante ou cópia)"
                        >
                          Duplicar
                        </button>
                        <button
                          type="button"
                          className="admin-tab text-caption px-1.5 py-1"
                          onClick={() => openSingleCardJson(card)}
                          title="Editar como JSON"
                        >
                          {"{ }"}
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {isSuperAdmin && card.status !== "ACTIVE" && (
                          <button
                            type="button"
                            className="admin-tab text-caption text-ice border-ice/30 px-2 py-1"
                            onClick={() =>
                              void api
                                .adminPublishGachaCard(card.id)
                                .then(() => {
                                  toast("Carta publicada.", "success");
                                  return loadCards(cardMeta.page);
                                })
                            }
                            title="Publicar carta"
                          >
                            Ativar
                          </button>
                        )}
                        {isSuperAdmin && card.status === "ACTIVE" && (
                          <button
                            type="button"
                            className="admin-tab text-caption px-2 py-1"
                            onClick={() =>
                              void api
                                .adminArchiveGachaCard(card.id)
                                .then(() => {
                                  toast("Carta arquivada.", "success");
                                  return loadCards(cardMeta.page);
                                })
                            }
                            title="Arquivar carta"
                          >
                            Arquivar
                          </button>
                        )}
                        <button
                          type="button"
                          className="admin-tab text-caption text-signal hover:bg-signal/15 border-signal/30 px-2 py-1"
                          onClick={() => requestDeleteCard(card)}
                          title="Excluir carta do pool"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Visualização em Lista Compacta */
            <div className="border border-hairline bg-panel overflow-x-auto">
              <table className="w-full text-left text-body-sm">
                <thead className="border-b border-hairline bg-black/30 font-mono text-caption text-mist">
                  <tr>
                    <th className="p-3 w-10">
                      <input
                        type="checkbox"
                        checked={isAllCurrentPageSelected}
                        onChange={toggleSelectAllCurrentPage}
                        className="h-4 w-4 accent-ice"
                        aria-label="Selecionar todas"
                      />
                    </th>
                    <th className="p-3 w-14">Arte</th>
                    <th className="p-3">Personagem</th>
                    <th className="p-3">Anime</th>
                    <th className="p-3">Raridade</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Donos</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {cards.map((card) => {
                    const isSelected = selectedCardIds.has(card.id);
                    const rarityColor =
                      GACHA_RARITY_COLORS[card.rarity as keyof typeof GACHA_RARITY_COLORS] ||
                      "#38E8DA";

                    return (
                      <tr
                        key={card.id}
                        className={`hover:bg-white/5 transition-colors ${
                          isSelected ? "bg-ice/5" : ""
                        }`}
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCardSelection(card.id)}
                            className="h-4 w-4 accent-ice"
                            aria-label={`Selecionar ${card.name}`}
                          />
                        </td>
                        <td className="p-3">
                          {card.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={card.image}
                              alt=""
                              className="h-10 w-8 rounded object-cover border border-hairline bg-black/40"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-10 w-8 rounded border border-hairline bg-black/40 flex items-center justify-center text-[10px] text-mist">
                              ?
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-medium text-snow">
                          {card.name}
                          {card.imageHidden && (
                            <span className="ml-1.5 text-caption text-mist-soft bg-white/5 px-1 py-0.5 rounded">
                              ???
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-mist">
                          {card.anime?.title ?? card.animeTitle ?? (
                            <span className="text-signal">Sem vínculo</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className="text-caption font-bold px-2 py-0.5 rounded border font-mono"
                            style={{
                              borderColor: `${rarityColor}66`,
                              color: rarityColor,
                              backgroundColor: `${rarityColor}1A`,
                            }}
                          >
                            {card.rarity}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-caption px-2 py-0.5 rounded font-mono text-[10px] uppercase font-semibold ${
                              card.status === "ACTIVE"
                                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                                : card.status === "DRAFT"
                                  ? "bg-amber-950/80 text-amber-300 border border-amber-500/30"
                                  : "bg-zinc-900/80 text-mist border border-hairline"
                            }`}
                          >
                            {card.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-caption text-mist">
                          {card._count?.owners || 0}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              className="admin-tab text-caption"
                              onClick={() => startEdit(card)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="admin-tab text-caption"
                              onClick={() => duplicateCard(card)}
                              title="Duplicar carta"
                            >
                              Duplicar
                            </button>
                            <button
                              type="button"
                              className="admin-tab text-caption"
                              onClick={() => openSingleCardJson(card)}
                              title="Editar JSON"
                            >
                              {"{ }"}
                            </button>
                            {isSuperAdmin && card.status !== "ACTIVE" && (
                              <button
                                type="button"
                                className="admin-tab text-caption text-ice border-ice/30"
                                onClick={() =>
                                  void api
                                    .adminPublishGachaCard(card.id)
                                    .then(() => {
                                      toast("Carta publicada.", "success");
                                      return loadCards(cardMeta.page);
                                    })
                                }
                              >
                                Publicar
                              </button>
                            )}
                            {isSuperAdmin && card.status === "ACTIVE" && (
                              <button
                                type="button"
                                className="admin-tab text-caption"
                                onClick={() =>
                                  void api
                                    .adminArchiveGachaCard(card.id)
                                    .then(() => {
                                      toast("Carta arquivada.", "success");
                                      return loadCards(cardMeta.page);
                                    })
                                }
                              >
                                Arquivar
                              </button>
                            )}
                            <button
                              type="button"
                              className="admin-tab text-caption text-signal border-signal/30"
                              onClick={() => requestDeleteCard(card)}
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação */}
          <PaginationControls
            page={cardMeta.page}
            totalPages={cardMeta.totalPages}
            onPageChange={gotoCardPage}
            label="Paginação de cartas"
          />
        </section>
      )}

      {/* ======================================================== */}
      {/* ABA 2: GERENCIADOR DE CONJUNTOS (SETS)                   */}
      {/* ======================================================== */}
      {workspace === "sets" && (
        <GachaSetsManager
          isSuperAdmin={isSuperAdmin}
          onFilterBySet={(animeId, title) => {
            onAnimeFilterChange(animeId, title);
            setWorkspace("cards");
          }}
          onOpenBatchJsonForSet={(animeId, title) => {
            openBatchJsonImport(animeId, title);
          }}
          onRequestDeleteCards={(setCards) => {
            setCardsToDelete(setCards);
            setDeleteModalOpen(true);
          }}
          onNotify={(msg, type) => {
            if (type === "error") setError(msg);
            else toast(msg, "success");
          }}
        />
      )}

      {/* ======================================================== */}
      {/* ABA 3: USUÁRIOS & CONCESSÕES                             */}
      {/* ======================================================== */}
      {workspace === "users" && (
        <section aria-labelledby="users-heading" className="border border-hairline bg-panel p-5 space-y-4">
          <div className="border-b border-hairline pb-3">
            <h2 id="users-heading" className="font-display text-display-lg text-snow">
              Gestão de Usuários & Cartas
            </h2>
            <p className="mt-1 text-body-sm text-mist">
              Buscar usuário para inspecionar cartas ganhas, resetar roll diário, ajustar valores com override ou conceder cartas manualmente.
            </p>
          </div>

          <SearchField
            placeholder="Buscar usuário por nome, username ou e-mail…"
            aria-label="Buscar usuário"
            value={search}
            onChange={(e) => onUserSearch(e.target.value)}
            containerClassName="w-full max-w-xl"
          />

          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {users.map((userItem) => (
              <button
                key={userItem.id}
                type="button"
                className={`p-3 text-left border rounded transition-colors ${
                  selectedUser === userItem.id
                    ? "border-ice bg-ice/10 text-snow"
                    : "border-hairline text-mist hover:text-snow hover:bg-white/5"
                }`}
                onClick={() => void loadUserCards(userItem.id, 1)}
              >
                <div className="font-medium truncate">
                  {userItem.userName ?? userItem.name ?? "Sem nome"}
                </div>
                <div className="text-caption text-mist-soft truncate">{userItem.email}</div>
              </button>
            ))}
          </div>

          {selectedUser && (
            <div className="mt-6 border-t border-hairline pt-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="admin-tab"
                    onClick={() => void resetRoll()}
                  >
                    Resetar Roll Diário
                  </button>
                </div>

                <p className="font-mono text-caption text-mist">
                  {userCardsMeta.total} cartas · página {userCardsMeta.page} de {userCardsMeta.totalPages}
                </p>
              </div>

              <div className="space-y-2">
                {userCards.map((pull) => (
                  <div
                    key={pull.id}
                    className="flex flex-col gap-2 border border-hairline p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-snow font-medium">
                        {pull.card.name}
                      </span>
                      <span className="ml-2 text-caption text-mist">
                        {pull.card.rarity} · {pull.value} pts
                        {pull.valueOverride !== null && pull.valueOverride !== undefined
                          ? " · (override ativo)"
                          : ""}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 sm:flex-none">
                      {isSuperAdmin && (
                        <>
                          <button
                            type="button"
                            className="admin-tab text-caption"
                            onClick={() => void setCardValue(pull)}
                          >
                            Ajustar Valor
                          </button>
                          {pull.valueOverride !== null && pull.valueOverride !== undefined && (
                            <button
                              type="button"
                              className="admin-tab text-caption"
                              onClick={() => void setCardValue(pull, true)}
                            >
                              Restaurar
                            </button>
                          )}
                        </>
                      )}
                      <button
                        type="button"
                        className="admin-tab text-caption text-signal border-signal/30"
                        onClick={() => void removeCard(pull.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <PaginationControls
                page={userCardsMeta.page}
                totalPages={userCardsMeta.totalPages}
                onPageChange={(target) => void loadUserCards(selectedUser, target)}
                label="Paginação das cartas do usuário"
              />
            </div>
          )}
        </section>
      )}

      {/* ======================================================== */}
      {/* BARRA FLUTUANTE DE AÇÕES EM CASCATA                      */}
      {/* ======================================================== */}
      <GachaBulkActionsBar
        selectedCards={selectedCardsList}
        isSuperAdmin={isSuperAdmin}
        busy={bulkBusy}
        onClearSelection={clearSelection}
        onBulkStatus={handleBulkStatus}
        onBulkRarity={handleBulkRarity}
        onBulkMoveAnime={handleBulkMoveAnime}
        onOpenJsonEditor={openBatchJsonForSelected}
        onOpenDeleteDialog={requestDeleteSelectedCards}
        onExportJson={handleExportSelectedJson}
        animesList={animeOptions}
      />

      {/* ======================================================== */}
      {/* MODAL DE EXCLUSÃO DE CARTAS                              */}
      {/* ======================================================== */}
      <GachaDeleteCardDialog
        open={deleteModalOpen}
        cards={cardsToDelete}
        busy={deletingBusy}
        onClose={() => {
          setDeleteModalOpen(false);
          setCardsToDelete([]);
        }}
        onConfirm={handleConfirmDelete}
      />

      {/* ======================================================== */}
      {/* MODAL DE EDIÇÃO / IMPORTAÇÃO JSON                        */}
      {/* ======================================================== */}
      <GachaJsonEditorModal
        open={jsonModalState.open}
        mode={jsonModalState.mode}
        targetCard={jsonModalState.targetCard}
        targetCards={jsonModalState.targetCards}
        defaultAnimeId={jsonModalState.defaultAnimeId}
        animeTitle={jsonModalState.animeTitle}
        busy={jsonBusy}
        onClose={() => setJsonModalState({ open: false, mode: "single" })}
        onSaveSingle={handleSaveSingleJson}
        onSaveBatch={handleSaveBatchJson}
      />
    </div>
  );
}
