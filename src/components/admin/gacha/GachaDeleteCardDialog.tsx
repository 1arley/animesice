"use client";

import { useState } from "react";
import { Modal } from "@/components/common/Modal";
import { GACHA_RARITY_COLORS } from "@/lib/gacha-rarity-colors";
import type { AdminGachaCard } from "@/types";

interface GachaDeleteCardDialogProps {
  open: boolean;
  cards: AdminGachaCard[];
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function GachaDeleteCardDialog({
  open,
  cards,
  busy,
  onClose,
  onConfirm,
}: GachaDeleteCardDialogProps) {
  const [reason, setReason] = useState("");

  if (!open || cards.length === 0) return null;

  const isMultiple = cards.length > 1;
  const totalOwners = cards.reduce(
    (acc, card) => acc + (card._count?.owners || 0),
    0,
  );

  async function handleConfirm() {
    await onConfirm(reason.trim() || (isMultiple ? `Exclusão em lote de ${cards.length} cartas` : "Exclusão administrativa"));
    setReason("");
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={isMultiple ? `Excluir ${cards.length} cartas` : `Excluir carta: ${cards[0].name}`}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            className="admin-tab"
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-signal px-4 py-2 text-body-sm font-medium transition-opacity disabled:opacity-50"
            disabled={busy}
            onClick={() => void handleConfirm()}
          >
            {busy ? "Excluindo…" : isMultiple ? `Excluir ${cards.length} cartas` : "Excluir definitivamente"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {totalOwners > 0 && (
          <div
            role="alert"
            className="border border-signal/50 bg-signal/15 p-3 text-body-sm text-signal"
          >
            <p className="font-semibold">⚠️ Impacto nos usuários:</p>
            <p className="mt-1">
              {totalOwners === 1
                ? "1 cópia desta carta já está em posse de um jogador."
                : `${totalOwners} cópias destas cartas estão em posse de jogadores.`}{" "}
              A exclusão removerá as cópias do inventário dos donos, cancelará trocas e ofertas no mercado.
            </p>
          </div>
        )}

        <p className="text-body-sm text-mist">
          {isMultiple
            ? `Você está prestes a excluir ${cards.length} cartas do pool do Gacha. Esta ação não pode ser desfeita.`
            : `Você está prestes a excluir "${cards[0].name}" do pool. Esta ação não pode ser desfeita.`}
        </p>

        <div className="max-h-48 overflow-y-auto space-y-2 border border-hairline bg-panel p-2">
          {cards.map((card) => {
            const rarityColor =
              GACHA_RARITY_COLORS[card.rarity as keyof typeof GACHA_RARITY_COLORS] ||
              "#38E8DA";
            return (
              <div
                key={card.id}
                className="flex items-center gap-3 border-b border-hairline/50 pb-2 last:border-b-0 last:pb-0"
              >
                {card.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={card.image}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded object-cover border border-hairline"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-body-sm font-medium text-snow">
                      {card.name}
                    </span>
                    <span
                      className="shrink-0 text-caption font-semibold px-1.5 py-0.5 rounded border"
                      style={{
                        borderColor: `${rarityColor}66`,
                        color: rarityColor,
                        backgroundColor: `${rarityColor}1A`,
                      }}
                    >
                      {card.rarity}
                    </span>
                  </div>
                  <p className="truncate text-caption text-mist-soft">
                    {card.anime?.title || card.animeTitle || "Sem anime vinculado"}
                    {card._count?.owners ? ` · ${card._count.owners} dono(s)` : " · 0 donos"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <label className="grid gap-1" htmlFor="delete-reason">
          <span className="text-caption text-mist">
            Motivo da exclusão (registrado no histórico de auditoria)
          </span>
          <input
            id="delete-reason"
            className="field"
            placeholder="Ex.: Carta duplicada, arte incorreta ou solicitação editorial"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
      </div>
    </Modal>
  );
}
