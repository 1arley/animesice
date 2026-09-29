"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/common/ToastProvider";
import type {
  AdminGachaCard,
  Anime,
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

/** Rótulo legível da opção: título + ano + id externo (títulos duplicam no catálogo). */
function animeLabel(anime: Anime) {
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
  const [animeQuery, setAnimeQuery] = useState("");
  const [animeResults, setAnimeResults] = useState<Anime[]>([]);
  const [animeSearching, setAnimeSearching] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [animeSearch, setAnimeSearch] = useState("");
  const [searchingAnimes, setSearchingAnimes] = useState(false);
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
  const [pilot, setPilot] = useState<GachaEngagementPilotDashboard | null>(
    null,
  );
  const [pilotPercent, setPilotPercent] = useState(10);
  const [savingPilot, setSavingPilot] = useState(false);
  const [pilotMessage, setPilotMessage] = useState("");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardsRequest = useRef(0);
  const animeSearchRequest = useRef(0);
  const userSearchRequest = useRef(0);

  const editingCard = useMemo(
    () =>
      editing ? (cards.find((card) => card.id === editing) ?? null) : null,
    [editing, cards],
  );
  /** O anime escolhido nunca sai das opções — evita o select voltar a vazio. */
  const animeOptions = useMemo(
    () =>
      selectedAnime &&
      !animeResults.some((anime) => anime.id === selectedAnime.id)
        ? [selectedAnime, ...animeResults]
        : animeResults,
    [animeResults, selectedAnime],
  );
  /** Backend exige motivo ≥10 caracteres quando anime ou raridade mudam. */
  const needsReason = Boolean(
    editingCard &&
      (editingCard.rarity !== form.rarity ||
        (editingCard.animeId ?? "") !== form.animeId),
  );
  /** Carta com animeTitle mas sem vínculo: o select não tem onde casar. */
  const detachedAnime = Boolean(
    editingCard && !editingCard.animeId && editingCard.animeTitle,
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
    api
      .adminListGachaCards(1, PAGE_SIZE)
      .then((res) => {
        setCards(res.data);
        setCardMeta({
          page: res.meta.page,
          totalPages: res.meta.totalPages,
          total: res.meta.total,
        });
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Erro ao carregar pool."),
      );
  }, []);

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

  async function savePilot() {
    if (savingPilot) return;
    setSavingPilot(true);
    setPilotMessage("");
    try {
      setPilot(await api.adminUpdateGachaEngagementPilot(pilotPercent));
      setPilotMessage(`Piloto atualizado para ${pilotPercent}% da base.`);
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

  function onAnimeFilterChange(value: string) {
    setAnimeFilter(value);
    void loadCards(1, cardSearch, rarity, value, status);
  }

  function gotoCardPage(page: number) {
    void loadCards(page);
  }

  function onUserSearch(value: string) {
    setSearch(value);
    if (userSearchDebounce.current)
      clearTimeout(userSearchDebounce.current);
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

  /**
   * Autocomplete de anime com debounce e guarda de sequência: sem isso, uma
   * resposta lenta de um prefixo antigo sobrescrevia a lista e o anime correto
   * "desaparecia" da busca.
   */
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
  }

  function clearAnime() {
    setSelectedAnime(null);
    setAnimeQuery("");
    setAnimeResults([]);
    setForm((current) => ({ ...current, animeId: "" }));
  }

  function startEdit(card: AdminGachaCard) {
    setEditing(card.id);
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
    setSelectedAnime(null);
    setAnimeQuery("");
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
      toast("Carta salva.", "success");
      await loadCards(page);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao salvar carta.");
    }
  }

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
    if (!window.confirm("Excluir carta?")) return;
    try {
      await api.adminDeleteUserCard(id);
      setUserCardsVersion((v) => v + 1);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao excluir carta.");
    }
  }

  async function resetRoll() {
    if (!selectedUser || !window.confirm("Resetar roll de hoje?")) return;
    try {
      await api.adminResetGachaRoll(selectedUser);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao resetar roll.");
    }
  }

  async function grantCard(cardId: string) {
    if (!selectedUser) return;
    try {
      await api.adminGrantUserCard(selectedUser, cardId);
      setUserCardsVersion((v) => v + 1);
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
    const reason = window.prompt("Motivo da alteração (mínimo 10 caracteres)");
    if (!reason) return;
    try {
      await api.adminSetUserCardValue(card.id, {
        value: restore ? null : Number(raw),
        reason,
      });
      setUserCardsVersion((v) => v + 1);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao ajustar valor.");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-display-xl text-snow">Gacha</h1>
        <div className="flex gap-2">
          <Link href="/admin/gacha/config" className="admin-tab">
            Configuração
          </Link>
          <Link href="/admin/gacha/codigos" className="admin-tab">
            Códigos
          </Link>
          <Link href="/admin/gacha/capas" className="admin-tab">
            Editar capas
          </Link>
        </div>
      </div>
      {error && (
        <div
          role="alert"
          className="mt-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal"
        >
          {error}
        </div>
      )}
      {pilot && (
        <section
          aria-labelledby="pilot-title"
          className="mt-6 border border-hairline bg-panel p-4"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2
                id="pilot-title"
                className="font-display text-display-lg text-snow"
              >
                Piloto de destaque
              </h2>
              <p className="mt-1 text-body-sm text-mist">
                Coorte estável desde{" "}
                {new Date(pilot.config.startedAt).toLocaleDateString("pt-BR")}.
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
              {user?.role === "SUPERADMIN" && (
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
              <dt className="font-mono text-caption text-mist">Coorte</dt>
              <dd className="mt-1 text-title text-snow">
                {pilot.cohort.assigned}/{pilot.cohort.totalUsers}
              </dd>
            </div>
            <div className="border border-hairline p-3">
              <dt className="font-mono text-caption text-mist">
                Emissão / gasto
              </dt>
              <dd className="mt-1 text-title text-snow">
                {pilot.economy.emitted} / {pilot.economy.sinks}
              </dd>
            </div>
            <div className="border border-hairline p-3">
              <dt className="font-mono text-caption text-mist">
                Uso só por recompensa
              </dt>
              <dd className="mt-1 text-title text-snow">
                {(pilot.behavior.rewardOnlyRate * 100).toFixed(1)}%
              </dd>
            </div>
            <div className="border border-hairline p-3">
              <dt className="font-mono text-caption text-mist">
                Cartas muito circuladas
              </dt>
              <dd className="mt-1 text-title text-snow">
                {pilot.behavior.sharedCards}
              </dd>
            </div>
          </dl>
          <p
            role="status"
            className={`mt-4 border p-3 text-body-sm ${
              pilot.economy.pause || pilot.behavior.pause
                ? "border-signal/40 text-signal"
                : "border-ice/30 text-ice"
            }`}
          >
            {pilot.economy.pause || pilot.behavior.pause
              ? "Pausar expansão: um limite econômico ou comportamental foi excedido."
              : pilot.satisfaction.measured
                ? "Limites técnicos saudáveis; confira satisfação antes de expandir."
                : "Limites técnicos saudáveis, mas satisfação ainda não foi medida: não expandir."}
          </p>
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
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="border border-hairline bg-panel p-4">
          <h2 className="font-display text-display-lg text-snow">Pool</h2>
          <form className="mt-4 grid gap-3" onSubmit={saveCard}>
            <input
              className="field"
              required
              placeholder="Personagem"
              aria-label="Personagem"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="field"
              required
              type="url"
              placeholder="Imagem HTTPS"
              aria-label="Imagem HTTPS"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
            />
            <label className="flex items-center gap-2 text-body-sm text-mist">
              <input
                type="checkbox"
                checked={form.imageHidden}
                onChange={(e) =>
                  setForm({ ...form, imageHidden: e.target.checked })
                }
              />
              Ocultar arte como ???
            </label>
            <input
              className="field"
              placeholder="Buscar anime"
              aria-label="Buscar anime"
              value={animeSearch}
              onChange={(e) => void searchAnimes(e.target.value)}
            />
            <p
              className="-mt-2 text-caption text-mist-soft"
              role="status"
              aria-live="polite"
            >
              {searchingAnimes
                ? "Buscando animes…"
                : animeSearch.trim().length >= 2 &&
                    animes.every((anime) => anime.id === form.animeId)
                  ? "Nenhum outro anime encontrado. Tente o título alternativo ou japonês."
                  : "Busque pelo título, título alternativo, título japonês ou slug."}
            </p>
            <select
              className="field"
              required
              aria-label="Anime da carta"
              value={form.animeId}
              onChange={(e) => {
                const a = animes.find((x) => x.id === e.target.value);
                setForm({
                  ...form,
                  animeId: e.target.value,
                  image: form.image || a?.coverImage || "",
                });
              }}
            >
              <option value="">Selecione anime</option>
              {animes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
            <select
              className="field"
              aria-label="Raridade"
              value={form.rarity}
              onChange={(e) => setForm({ ...form, rarity: e.target.value })}
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {editing && (
              <input
                className="field"
                placeholder="Motivo (obrigatório ao mudar anime ou raridade)"
                aria-label="Motivo da alteração"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            )}
            <button className="admin-tab w-fit" type="submit">
              {editing ? "Salvar" : "Criar"}
            </button>
          </form>
          <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_9rem]">
            <input
              className="field flex-1"
              placeholder="Buscar personagem"
              aria-label="Buscar personagem"
              value={cardSearch}
              onChange={(e) => onCardSearch(e.target.value)}
            />
            <select
              className="field"
              aria-label="Filtrar raridade"
              value={rarity}
              onChange={(e) => onRarityChange(e.target.value)}
            >
              <option value="">Todas</option>
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
              onChange={(e) => {
                setStatus(e.target.value);
                void loadCards(1, cardSearch, rarity, animeId, e.target.value);
              }}
            >
              <option value="">Status</option>
              <option value="DRAFT">Rascunho</option>
              <option value="REVIEW">Revisão</option>
              <option value="ACTIVE">Ativa</option>
              <option value="ARCHIVED">Arquivada</option>
            </select>
          </div>
          <p className="mt-2 font-mono text-caption text-mist-soft">
            {cardMeta.total} cartas · página {cardMeta.page}/
            {cardMeta.totalPages}
          </p>
          <div className="mt-2 space-y-2">
            {cards.map((card) => (
              <div
                className="flex flex-col gap-2 border-b border-hairline py-3 sm:flex-row sm:items-center sm:justify-between"
                key={card.id}
              >
                <span className="min-w-0 truncate text-mist">
                  {card.name}{" "}
                  <small>
                    {card.rarity} · {card.status}
                    {card.imageHidden ? " · ???" : ""}
                  </small>
                  {(card.anime?.title ?? card.animeTitle) && (
                    <small className="block text-mist-soft">
                      {card.anime?.title ?? card.animeTitle}
                      {card.anime?.malId ? ` · MAL ${card.anime.malId}` : ""}
                    </small>
                  )}
                </span>
                <span className="flex flex-wrap gap-1 sm:flex-none">
                  <button
                    className="admin-tab"
                    onClick={() => {
                      setEditing(card.id);
                      if (
                        card.anime &&
                        !animes.some((a) => a.id === card.anime!.id)
                      )
                        setAnimes((current) => [
                          ...current,
                          card.anime as Anime,
                        ]);
                      setForm({
                        name: card.name,
                        image: card.image ?? "",
                        imageHidden: card.imageHidden,
                        rarity: card.rarity,
                        animeId: card.animeId ?? "",
                        reason: "",
                      });
                      setAnimeSearch(
                        card.anime?.title ?? card.animeTitle ?? "",
                      );
                    }}
                  >
                    Editar
                  </button>
                  {user?.role === "SUPERADMIN" && card.status !== "ACTIVE" && (
                    <button
                      className="admin-tab"
                      onClick={() =>
                        void api
                          .adminPublishGachaCard(card.id)
                          .then(() => loadCards())
                          .catch((e) =>
                            setError(
                              e instanceof ApiError
                                ? e.message
                                : "Erro ao publicar carta.",
                            ),
                          )
                      }
                    >
                      Publicar
                    </button>
                  )}
                  {user?.role === "SUPERADMIN" && card.status === "ACTIVE" && (
                    <button
                      className="admin-tab"
                      onClick={() =>
                        void api
                          .adminArchiveGachaCard(card.id)
                          .then(() => loadCards())
                          .catch((e) =>
                            setError(
                              e instanceof ApiError
                                ? e.message
                                : "Erro ao arquivar carta.",
                            ),
                          )
                      }
                    >
                      Arquivar
                    </button>
                  )}
                  {selectedUser && (
                    <button
                      className="admin-tab"
                      onClick={() => void grantCard(card.id)}
                    >
                      Conceder
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
          {cardMeta.totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <button
                className="admin-tab"
                disabled={cardMeta.page <= 1}
                onClick={() => gotoCardPage(cardMeta.page - 1)}
              >
                Anterior
              </button>
              <button
                className="admin-tab"
                disabled={cardMeta.page >= cardMeta.totalPages}
                onClick={() => gotoCardPage(cardMeta.page + 1)}
              >
                Próxima
              </button>
            </div>
          )}
        </div>
        <div className="border border-hairline bg-panel p-4">
          <h2 className="font-display text-display-lg text-snow">Usuário</h2>
          <input
            className="field mt-4"
            placeholder="Buscar usuário"
            aria-label="Buscar usuário"
            value={search}
            onChange={(e) => void searchUsers(e.target.value)}
          />
          <div className="mt-2 space-y-1">
            {users.map((user) => (
              <button
                className="block w-full p-2 text-left text-mist hover:bg-white/5"
                key={user.id}
                onClick={() => void loadUserCards(user.id, 1)}
              >
                {user.userName ?? user.name ?? user.email}
              </button>
            ))}
          </div>
          {selectedUser && (
            <>
              <div className="mt-4">
                <button className="admin-tab" onClick={() => void resetRoll()}>
                  Reset roll
                </button>
              </div>
              <p className="mt-3 font-mono text-caption text-mist-soft">
                {userCardsMeta.total} cartas · página {userCardsMeta.page}/
                {userCardsMeta.totalPages}
              </p>
              <div className="mt-2 space-y-2">
                {userCards.map((card) => (
                  <div
                    className="flex flex-col gap-2 border-b border-hairline py-3 sm:flex-row sm:items-center sm:justify-between"
                    key={card.id}
                  >
                    <span className="min-w-0 truncate text-mist">
                      {card.card.name} · {card.card.rarity} · {card.value} pts
                      {card.valueOverride !== null &&
                      card.valueOverride !== undefined
                        ? " · override"
                        : ""}
                    </span>
                    <span className="flex flex-wrap gap-1 sm:flex-none">
                      {user?.role === "SUPERADMIN" && (
                        <>
                          <button
                            className="admin-tab"
                            onClick={() => void setCardValue(card)}
                          >
                            Valor
                          </button>
                          {card.valueOverride !== null &&
                            card.valueOverride !== undefined && (
                              <button
                                className="admin-tab"
                                onClick={() => void setCardValue(card, true)}
                              >
                                Restaurar
                              </button>
                            )}
                        </>
                      )}
                      <button
                        className="admin-tab"
                        onClick={() => void removeCard(card.id)}
                      >
                        Excluir
                      </button>
                    </span>
                  </div>
                ))}
              </div>
              {userCardsMeta.totalPages > 1 && (
                <div className="mt-3 flex items-center justify-between">
                  <button
                    className="admin-tab"
                    disabled={userCardsMeta.page <= 1}
                    onClick={() =>
                      void loadUserCards(selectedUser, userCardsMeta.page - 1)
                    }
                  >
                    Anterior
                  </button>
                  <button
                    className="admin-tab"
                    disabled={userCardsMeta.page >= userCardsMeta.totalPages}
                    onClick={() =>
                      void loadUserCards(selectedUser, userCardsMeta.page + 1)
                    }
                  >
                    Próxima
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
