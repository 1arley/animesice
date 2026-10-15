"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { SearchField } from "@/components/ui/SearchField";
import { GACHA_RARITY_COLORS } from "@/lib/gacha-rarity-colors";
import type { AdminGachaCard, AdminGachaCardSet } from "@/types";

interface GachaSetsManagerProps {
  isSuperAdmin: boolean;
  onFilterBySet: (animeId: string, title: string) => void;
  onOpenBatchJsonForSet: (animeId: string, title: string) => void;
  onRequestDeleteCards: (cards: AdminGachaCard[]) => void;
  onNotify: (message: string, type?: "success" | "error") => void;
}

export function GachaSetsManager({
  isSuperAdmin,
  onFilterBySet,
  onOpenBatchJsonForSet,
  onRequestDeleteCards,
  onNotify,
}: GachaSetsManagerProps) {
  const [sets, setSets] = useState<AdminGachaCardSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const loadSets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.adminListGachaCardSets();
      setSets(data);
    } catch (e) {
      onNotify(
        e instanceof ApiError ? e.message : "Erro ao carregar conjuntos.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    void loadSets();
  }, [loadSets]);

  const filteredSets = sets.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.slug.toLowerCase().includes(q) ||
      (s.malId && String(s.malId).includes(q))
    );
  });

  // Métricas globais dos conjuntos
  const totalSets = sets.length;
  const totalCards = sets.reduce((sum, s) => sum + s.totalCards, 0);
  const totalActive = sets.reduce((sum, s) => sum + s.activeCards, 0);
  const totalDraft = sets.reduce((sum, s) => sum + s.draftCards, 0);
  const totalOwners = sets.reduce((sum, s) => sum + s.totalOwners, 0);

  // Ação: Publicar todos os rascunhos de um conjunto
  async function handlePublishDraftsOfSet(set: AdminGachaCardSet) {
    if (!isSuperAdmin) return;
    setBusyAction(`publish-${set.id}`);
    try {
      // Buscar cartas do conjunto
      const res = await api.adminListGachaCards(1, 200, undefined, undefined, set.id);
      const draftCards = res.data.filter((c) => c.status === "DRAFT");
      if (draftCards.length === 0) {
        onNotify("Nenhum rascunho pendente neste conjunto.", "success");
        return;
      }
      await api.adminBulkStatusGachaCards(
        draftCards.map((c) => c.id),
        "ACTIVE",
        `Publicação em lote do conjunto ${set.title}`,
      );
      onNotify(`Publicadas ${draftCards.length} cartas de ${set.title}.`, "success");
      await loadSets();
    } catch (e) {
      onNotify(
        e instanceof ApiError ? e.message : "Erro ao publicar rascunhos.",
        "error",
      );
    } finally {
      setBusyAction(null);
    }
  }

  // Ação: Exportar todas as cartas do conjunto como arquivo JSON
  async function handleExportSetJson(set: AdminGachaCardSet) {
    setBusyAction(`export-${set.id}`);
    try {
      const res = await api.adminListGachaCards(1, 300, undefined, undefined, set.id);
      const exportData = res.data.map((c) => ({
        name: c.name,
        rarity: c.rarity,
        image: c.image,
        imageHidden: c.imageHidden,
        variantName: c.variantName || undefined,
        animeId: set.id,
        animeTitle: set.title,
      }));
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conjunto-${set.slug || set.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onNotify(`Exportadas ${exportData.length} cartas do conjunto.`, "success");
    } catch (e) {
      onNotify(
        e instanceof ApiError ? e.message : "Erro ao exportar conjunto.",
        "error",
      );
    } finally {
      setBusyAction(null);
    }
  }

  // Ação: Preparar exclusão em massa das cartas do conjunto
  async function handleDeleteAllCardsInSet(set: AdminGachaCardSet) {
    setBusyAction(`delete-${set.id}`);
    try {
      const res = await api.adminListGachaCards(1, 300, undefined, undefined, set.id);
      if (res.data.length === 0) {
        onNotify("Este conjunto não possui cartas cadastradas.", "error");
        return;
      }
      onRequestDeleteCards(res.data);
    } catch (e) {
      onNotify(
        e instanceof ApiError ? e.message : "Erro ao listar cartas para exclusão.",
        "error",
      );
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section aria-labelledby="sets-heading" className="space-y-6">
      {/* Cabeçalho do gerenciador de conjuntos */}
      <div className="flex flex-wrap items-center justify-between gap-4 border border-hairline bg-panel p-4">
        <div>
          <h2 id="sets-heading" className="font-display text-display-lg text-snow">
            Conjuntos de Cartas (Animes)
          </h2>
          <p className="mt-1 text-body-sm text-mist max-w-2xl">
            Visão panorâmica de todos os animes que possuem cartas no pool.
            Permite publicar em cascata, gerenciar por JSON ou excluir cartas em lote por conjunto.
          </p>
        </div>

        <button
          type="button"
          className="admin-tab"
          onClick={() => void loadSets()}
          disabled={loading}
        >
          {loading ? "Atualizando…" : "Recarregar Conjuntos"}
        </button>
      </div>

      {/* Métricas dos Conjuntos */}
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-hairline bg-panel p-3">
          <dt className="font-mono text-caption text-mist">Conjuntos no Pool</dt>
          <dd className="mt-1 text-title text-snow">{totalSets}</dd>
          <p className="mt-1 text-caption text-mist-soft">Animes com ao menos 1 carta</p>
        </div>
        <div className="border border-hairline bg-panel p-3">
          <dt className="font-mono text-caption text-mist">Total de Cartas</dt>
          <dd className="mt-1 text-title text-snow">{totalCards}</dd>
          <p className="mt-1 text-caption text-mist-soft">
            <span className="text-ice font-semibold">{totalActive} ativas</span> ·{" "}
            <span className="text-amber-400 font-semibold">{totalDraft} rascunhos</span>
          </p>
        </div>
        <div className="border border-hairline bg-panel p-3">
          <dt className="font-mono text-caption text-mist">Cópias em Posse</dt>
          <dd className="mt-1 text-title text-snow">{totalOwners}</dd>
          <p className="mt-1 text-caption text-mist-soft">Total de cópias nas contas de jogadores</p>
        </div>
        <div className="border border-hairline bg-panel p-3">
          <dt className="font-mono text-caption text-mist">Taxa de Conclusão</dt>
          <dd className="mt-1 text-title text-snow">
            {totalCards > 0 ? `${((totalActive / totalCards) * 100).toFixed(0)}%` : "0%"}
          </dd>
          <p className="mt-1 text-caption text-mist-soft">Porcentagem de cartas publicadas</p>
        </div>
      </dl>

      {/* Busca rápida de conjunto */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchField
          placeholder="Buscar conjunto por anime, título ou MAL ID…"
          aria-label="Buscar conjunto"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          containerClassName="flex-1 min-w-[280px]"
        />
        <span className="font-mono text-caption text-mist">
          {filteredSets.length} de {sets.length} conjuntos
        </span>
      </div>

      {/* Lista / Grid de Conjuntos */}
      {loading ? (
        <div className="border border-hairline bg-panel p-12 text-center text-mist">
          Carregando conjuntos do pool…
        </div>
      ) : filteredSets.length === 0 ? (
        <div className="border border-hairline bg-panel p-12 text-center text-mist">
          {search ? "Nenhum conjunto corresponde à busca." : "Nenhum conjunto encontrado no pool."}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredSets.map((set) => {
            const isBusy = busyAction?.includes(set.id);
            return (
              <div
                key={set.id}
                className="flex flex-col justify-between border border-hairline bg-panel p-4 transition-all hover:border-hairline/80"
              >
                <div>
                  <div className="flex gap-3 items-start">
                    {set.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={set.coverImage}
                        alt=""
                        className="h-16 w-12 shrink-0 rounded object-cover border border-hairline bg-black/40"
                      />
                    ) : (
                      <div className="h-16 w-12 shrink-0 rounded border border-hairline bg-black/40 flex items-center justify-center text-caption text-mist">
                        Arte
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-display text-body-lg text-snow font-semibold" title={set.title}>
                        {set.title}
                      </h3>
                      <p className="text-caption text-mist-soft">
                        {set.year ? `${set.year} · ` : ""}
                        {set.malId ? `MAL ${set.malId}` : "Manual"}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-caption">
                        <span className="bg-white/10 px-2 py-0.5 rounded text-snow font-medium">
                          {set.totalCards} cartas
                        </span>
                        {set.activeCards > 0 && (
                          <span className="bg-ice/15 border border-ice/30 text-ice px-2 py-0.5 rounded">
                            {set.activeCards} ativas
                          </span>
                        )}
                        {set.draftCards > 0 && (
                          <span className="bg-amber-500/15 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded">
                            {set.draftCards} rascunho
                          </span>
                        )}
                        {set.archivedCards > 0 && (
                          <span className="bg-mist/10 border border-mist/20 text-mist px-2 py-0.5 rounded">
                            {set.archivedCards} arquivadas
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detalhes de raridades no conjunto */}
                  <div className="mt-3 border-t border-hairline/60 pt-2">
                    <p className="text-caption text-mist font-mono">Distribuição de raridades:</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(set.rarityCounts).map(([rarity, count]) => {
                        const color =
                          GACHA_RARITY_COLORS[rarity as keyof typeof GACHA_RARITY_COLORS] ||
                          "#38E8DA";
                        return (
                          <span
                            key={rarity}
                            className="text-caption px-1.5 py-0.5 rounded border font-mono"
                            style={{
                              borderColor: `${color}40`,
                              color,
                              backgroundColor: `${color}10`,
                            }}
                          >
                            {rarity}: {count}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Ações do conjunto */}
                <div className="mt-4 border-t border-hairline pt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      className="admin-tab text-caption"
                      onClick={() => onFilterBySet(set.id, set.title)}
                      title="Ver todas as cartas deste anime no Pool"
                    >
                      Ver Cartas
                    </button>
                    <button
                      type="button"
                      className="admin-tab text-caption"
                      onClick={() => onOpenBatchJsonForSet(set.id, set.title)}
                      title="Importar cartas via JSON neste conjunto"
                    >
                      + Lote JSON
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {isSuperAdmin && set.draftCards > 0 && (
                      <button
                        type="button"
                        className="admin-tab text-caption text-ice border-ice/30 hover:bg-ice/10"
                        disabled={isBusy}
                        onClick={() => void handlePublishDraftsOfSet(set)}
                        title="Publicar todos os rascunhos deste conjunto"
                      >
                        Publicar ({set.draftCards})
                      </button>
                    )}
                    <button
                      type="button"
                      className="admin-tab text-caption"
                      disabled={isBusy}
                      onClick={() => void handleExportSetJson(set)}
                      title="Baixar JSON das cartas deste conjunto"
                    >
                      Exportar
                    </button>
                    <button
                      type="button"
                      className="admin-tab text-caption text-signal hover:bg-signal/10 border-signal/30"
                      disabled={isBusy}
                      onClick={() => void handleDeleteAllCardsInSet(set)}
                      title="Excluir todas as cartas deste conjunto"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
