"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/common/ToastProvider";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { SearchField } from "@/components/ui/SearchField";
import { GachaAdminTabs } from "@/components/admin/GachaAdminTabs";
import { GACHA_FOILS, GACHA_TIERS } from "@/components/gacha/GachaCard";
import type { AdminGachaCard, GachaPull } from "@/types";

/** Extraído do antigo workspace "users" do monolito /admin/gacha. */
export default function AdminGachaJogadoresPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = user?.role === "SUPERADMIN";

  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<
    {
      id: string;
      email: string;
      name: string | null;
      userName: string | null;
    }[]
  >([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [userCards, setUserCards] = useState<GachaPull[]>([]);
  const [userCardsMeta, setUserCardsMeta] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [userPage, setUserPage] = useState(1);
  const [userCardsVersion, setUserCardsVersion] = useState(0);
  const [grantSearch, setGrantSearch] = useState("");
  const [grantCards, setGrantCards] = useState<AdminGachaCard[]>([]);
  // Qualidade (raridade) e foil escolhidos pelo admin; vazio = aleatório.
  const [grantMode, setGrantMode] = useState<"card" | "random">("card");
  const [grantRarity, setGrantRarity] = useState("");
  const [grantFoil, setGrantFoil] = useState("");
  const [granting, setGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const SEARCH_DEBOUNCE_MS = 250;
  const userSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userSearchRequest = useRef(0);
  const grantSearchRequest = useRef(0);

  /** A qualidade escolhida filtra a busca da carta específica. */
  const visibleGrantCards = grantRarity
    ? grantCards.filter((card) => card.rarity === grantRarity)
    : grantCards;

  function loadUserCards(id: string, page = 1) {
    setUserCards([]);
    setUserCardsMeta({ page, totalPages: 1, total: 0 });
    setSelectedUser(id);
    setUserPage(page);
    setUserCardsVersion((v) => v + 1);
  }

  function onUserSearch(value: string) {
    setUserSearch(value);
    if (userSearchDebounce.current) clearTimeout(userSearchDebounce.current);
    if (value.trim().length < 2) {
      setUserResults([]);
      return;
    }
    const requestId = ++userSearchRequest.current;
    userSearchDebounce.current = setTimeout(() => {
      api
        .adminListUsers(1, 10, value.trim())
        .then((res) => {
          if (requestId === userSearchRequest.current) setUserResults(res.data);
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

  useEffect(() => {
    const query = grantSearch.trim();
    const requestId = ++grantSearchRequest.current;
    if (query.length < 2) {
      setGrantCards([]);
      return;
    }
    setGrantCards([]);
    const timer = setTimeout(() => {
      void api.adminListGachaCards(1, 20, query, undefined, undefined, "ACTIVE")
        .then((res) => {
          if (requestId === grantSearchRequest.current) setGrantCards(res.data);
        })
        .catch((e) => {
          if (requestId === grantSearchRequest.current)
            setError(e instanceof ApiError ? e.message : "Erro ao buscar cartas.");
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [grantSearch]);

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
    if (!selectedUser || granting) return;
    const card = grantCards.find((item) => item.id === cardId);
    if (!card) return;
    if (!window.confirm(`Conceder “${card.name}” a este usuário?`)) return;
    setGranting(true);
    try {
      const pull = await api.adminGrantUserCard(selectedUser, {
        cardId,
        foil: grantFoil || undefined,
      });
      setUserCardsVersion((v) => v + 1);
      toast(
        `Carta “${pull.card.name}” (${pull.card.rarity} · ${pull.foil}) concedida.`,
        "success",
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao conceder carta.");
    } finally {
      setGranting(false);
    }
  }

  /** Sorteio: o backend puxa uma carta ativa do pool (respeitando a qualidade). */
  async function grantRandomCard() {
    if (!selectedUser || granting) return;
    const quality = grantRarity ? ` da qualidade ${grantRarity}` : "";
    if (!window.confirm(`Sortear e conceder uma carta${quality}?`)) return;
    setGranting(true);
    try {
      const pull = await api.adminGrantUserCard(selectedUser, {
        random: true,
        rarity: grantRarity || undefined,
        foil: grantFoil || undefined,
      });
      setUserCardsVersion((v) => v + 1);
      toast(
        `Sorteada “${pull.card.name}” (${pull.card.rarity} · ${pull.foil}).`,
        "success",
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao conceder carta.");
    } finally {
      setGranting(false);
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-display-xl text-snow">Jogadores do Gacha</h1>
          <p className="mt-1 text-body-sm text-mist">
            Inspecionar coleção, conceder cartas, resetar roll e ajustar valores com override.
          </p>
        </div>
        <GachaAdminTabs current="/admin/gacha/jogadores" />
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
          value={userSearch}
          onChange={(e) => onUserSearch(e.target.value)}
          containerClassName="w-full max-w-xl"
        />

        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {userResults.map((userItem) => (
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
          <div className="border-t border-hairline pt-4 space-y-3">
            <h3 className="font-display text-snow">Conceder carta</h3>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-caption text-mist" htmlFor="grant-mode">
                Origem
                <select
                  id="grant-mode"
                  className="field"
                  value={grantMode}
                  onChange={(e) => setGrantMode(e.target.value as "card" | "random")}
                >
                  <option value="card">Carta específica</option>
                  <option value="random">Sortear carta do pool</option>
                </select>
              </label>

              <label className="grid gap-1 text-caption text-mist" htmlFor="grant-rarity">
                Qualidade (raridade)
                <select
                  id="grant-rarity"
                  className="field"
                  value={grantRarity}
                  onChange={(e) => setGrantRarity(e.target.value)}
                >
                  <option value="">Aleatória</option>
                  {GACHA_TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-caption text-mist" htmlFor="grant-foil">
                Foil
                <select
                  id="grant-foil"
                  className="field"
                  value={grantFoil}
                  onChange={(e) => setGrantFoil(e.target.value)}
                >
                  <option value="">Aleatório (pesos da config)</option>
                  {GACHA_FOILS.map((foil) => (
                    <option key={foil} value={foil}>
                      {foil}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {grantMode === "random" ? (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="admin-tab min-h-11 text-ice border-ice/30"
                  disabled={granting}
                  onClick={() => void grantRandomCard()}
                >
                  {granting ? "Concedendo…" : "Sortear e conceder"}
                </button>
                <p className="text-caption text-mist">
                  A carta vem aleatória do pool
                  {grantRarity ? ` (apenas ${grantRarity})` : ""}; o foil{" "}
                  {grantFoil ? `saque ${grantFoil}` : "é sorteado pelos pesos da config"}.
                </p>
              </div>
            ) : (
              <>
                <SearchField
                  placeholder="Buscar carta ativa por nome…"
                  aria-label="Buscar carta para conceder"
                  value={grantSearch}
                  onChange={(e) => setGrantSearch(e.target.value)}
                  containerClassName="w-full max-w-xl"
                />
                {grantSearch.trim().length < 2 ? (
                  <p className="text-caption text-mist">Digite pelo menos 2 caracteres.</p>
                ) : visibleGrantCards.length ? (
                  <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleGrantCards.map((card) => (
                      <li key={card.id} className="flex items-center justify-between gap-3 border border-hairline p-3">
                        <span className="min-w-0 truncate text-body-sm text-snow">
                          {card.name} <span className="text-mist">· {card.rarity}</span>
                        </span>
                        <button
                          type="button"
                          className="admin-tab min-h-11 shrink-0 text-caption text-ice border-ice/30"
                          disabled={granting}
                          onClick={() => void grantCard(card.id)}
                        >
                          Conceder
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-caption text-mist">
                    Nenhuma carta ativa encontrada
                    {grantRarity ? ` com qualidade ${grantRarity}` : ""}.
                  </p>
                )}
                {grantRarity && (
                  <p className="text-caption text-mist">
                    A qualidade escolhida filtra a busca; a carta concedida
                    mantém a própria qualidade.
                  </p>
                )}
              </>
            )}
          </div>
        )}

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
    </div>
  );
}
