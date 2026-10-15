"use client";

import { useState } from "react";
import type { AdminGachaCard } from "@/types";

const TIERS = [
  "COMUM",
  "INCOMUM",
  "RARA",
  "EPICA",
  "LENDARIA",
  "MITICA",
  "GALACTICA",
] as const;

interface GachaBulkActionsBarProps {
  selectedCards: AdminGachaCard[];
  isSuperAdmin: boolean;
  busy: boolean;
  onClearSelection: () => void;
  onBulkStatus: (status: "ACTIVE" | "ARCHIVED" | "DRAFT") => Promise<void>;
  onBulkRarity: (rarity: string, reason: string) => Promise<void>;
  onBulkMoveAnime: (animeId: string, reason: string) => Promise<void>;
  onOpenJsonEditor: () => void;
  onOpenDeleteDialog: () => void;
  onExportJson: () => void;
  animesList?: { id: string; title: string }[];
}

export function GachaBulkActionsBar({
  selectedCards,
  isSuperAdmin,
  busy,
  onClearSelection,
  onBulkStatus,
  onBulkRarity,
  onBulkMoveAnime,
  onOpenJsonEditor,
  onOpenDeleteDialog,
  onExportJson,
  animesList = [],
}: GachaBulkActionsBarProps) {
  const [showRarityMenu, setShowRarityMenu] = useState(false);
  const [showAnimeMenu, setShowAnimeMenu] = useState(false);
  const [selectedRarity, setSelectedRarity] = useState("");
  const [selectedAnimeId, setSelectedAnimeId] = useState("");
  const [reason, setReason] = useState("");

  if (selectedCards.length === 0) return null;

  async function handleApplyRarity() {
    if (!selectedRarity) return;
    if (reason.trim().length < 10) {
      alert("Motivo obrigatório de no mínimo 10 caracteres.");
      return;
    }
    await onBulkRarity(selectedRarity, reason.trim());
    setShowRarityMenu(false);
    setSelectedRarity("");
    setReason("");
  }

  async function handleApplyAnime() {
    if (!selectedAnimeId) return;
    if (reason.trim().length < 10) {
      alert("Motivo obrigatório de no mínimo 10 caracteres.");
      return;
    }
    await onBulkMoveAnime(selectedAnimeId, reason.trim());
    setShowAnimeMenu(false);
    setSelectedAnimeId("");
    setReason("");
  }

  return (
    <aside
      aria-label="Ações em lote"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-5xl rounded-lg border border-ice/40 bg-ink/95 backdrop-blur-md p-3 shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center rounded-full bg-ice/20 border border-ice/40 px-3 py-1 text-caption font-semibold text-ice">
            {selectedCards.length} selecionada(s)
          </span>
          <button
            type="button"
            className="text-caption text-mist hover:text-snow underline px-1"
            onClick={onClearSelection}
            disabled={busy}
          >
            Desmarcar todas
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status em lote */}
          {isSuperAdmin && (
            <>
              <button
                type="button"
                className="admin-tab text-caption"
                disabled={busy}
                onClick={() => void onBulkStatus("ACTIVE")}
                title="Publicar todas as selecionadas"
              >
                Publicar
              </button>
              <button
                type="button"
                className="admin-tab text-caption"
                disabled={busy}
                onClick={() => void onBulkStatus("ARCHIVED")}
                title="Arquivar todas as selecionadas"
              >
                Arquivar
              </button>
            </>
          )}

          {/* Alterar raridade em lote */}
          <button
            type="button"
            className={`admin-tab text-caption ${showRarityMenu ? "border-ice text-ice" : ""}`}
            disabled={busy}
            onClick={() => {
              setShowRarityMenu((v) => !v);
              setShowAnimeMenu(false);
            }}
          >
            Raridade ▾
          </button>

          {/* Mover conjunto / anime */}
          {animesList.length > 0 && (
            <button
              type="button"
              className={`admin-tab text-caption ${showAnimeMenu ? "border-ice text-ice" : ""}`}
              disabled={busy}
              onClick={() => {
                setShowAnimeMenu((v) => !v);
                setShowRarityMenu(false);
              }}
            >
              Mover Anime ▾
            </button>
          )}

          {/* Editar JSON */}
          <button
            type="button"
            className="admin-tab text-caption"
            disabled={busy}
            onClick={onOpenJsonEditor}
            title="Editar estas cartas em formato JSON"
          >
            {"{ }"} Editar JSON
          </button>

          {/* Exportar JSON */}
          <button
            type="button"
            className="admin-tab text-caption"
            disabled={busy}
            onClick={onExportJson}
            title="Copiar / exportar dados destas cartas"
          >
            Exportar JSON
          </button>

          {/* Excluir em lote */}
          <button
            type="button"
            className="btn-signal px-3 py-1.5 text-caption font-semibold transition-opacity disabled:opacity-50"
            disabled={busy}
            onClick={onOpenDeleteDialog}
          >
            Excluir ({selectedCards.length})
          </button>
        </div>
      </div>

      {/* Sub-menu: Alterar raridade */}
      {showRarityMenu && (
        <div className="mt-3 border-t border-hairline pt-3 flex flex-wrap items-center gap-2">
          <label htmlFor="bulk-rarity-select" className="text-caption text-mist">
            Nova raridade:
          </label>
          <select
            id="bulk-rarity-select"
            className="field text-caption py-1"
            value={selectedRarity}
            onChange={(e) => setSelectedRarity(e.target.value)}
          >
            <option value="">Selecione...</option>
            {TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
          <input
            className="field text-caption py-1 flex-1 min-w-[200px]"
            placeholder="Motivo obrigatório (mínimo 10 caracteres)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            type="button"
            className="btn-ice px-3 py-1 text-caption font-medium disabled:opacity-50"
            disabled={busy || !selectedRarity || reason.trim().length < 10}
            onClick={() => void handleApplyRarity()}
          >
            Aplicar
          </button>
          <button
            type="button"
            className="admin-tab text-caption"
            onClick={() => setShowRarityMenu(false)}
          >
            Fechar
          </button>
        </div>
      )}

      {/* Sub-menu: Mover para outro anime */}
      {showAnimeMenu && (
        <div className="mt-3 border-t border-hairline pt-3 flex flex-wrap items-center gap-2">
          <label htmlFor="bulk-anime-select" className="text-caption text-mist">
            Novo anime:
          </label>
          <select
            id="bulk-anime-select"
            className="field text-caption py-1 max-w-xs"
            value={selectedAnimeId}
            onChange={(e) => setSelectedAnimeId(e.target.value)}
          >
            <option value="">Selecione o anime destino...</option>
            {animesList.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
          <input
            className="field text-caption py-1 flex-1 min-w-[200px]"
            placeholder="Motivo obrigatório (mínimo 10 caracteres)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            type="button"
            className="btn-ice px-3 py-1 text-caption font-medium disabled:opacity-50"
            disabled={busy || !selectedAnimeId || reason.trim().length < 10}
            onClick={() => void handleApplyAnime()}
          >
            Mover
          </button>
          <button
            type="button"
            className="admin-tab text-caption"
            onClick={() => setShowAnimeMenu(false)}
          >
            Fechar
          </button>
        </div>
      )}
    </aside>
  );
}
