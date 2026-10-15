"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/common/Modal";
import { GACHA_RARITY_COLORS } from "@/lib/gacha-rarity-colors";
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

export type JsonEditorMode = "single" | "batch-import" | "batch-edit";

export interface JsonCardItem {
  id?: string;
  name: string;
  rarity: string;
  image: string;
  imageHidden?: boolean;
  animeId?: string;
  variantName?: string;
}

interface GachaJsonEditorModalProps {
  open: boolean;
  mode: JsonEditorMode;
  targetCard?: AdminGachaCard | null;
  targetCards?: AdminGachaCard[];
  defaultAnimeId?: string;
  animeTitle?: string;
  busy: boolean;
  onClose: () => void;
  onSaveSingle?: (id: string, card: Partial<JsonCardItem> & { reason?: string }) => Promise<void>;
  onSaveBatch?: (cards: JsonCardItem[], mode: "import" | "edit") => Promise<void>;
}

export function GachaJsonEditorModal({
  open,
  mode,
  targetCard,
  targetCards = [],
  defaultAnimeId = "",
  animeTitle = "",
  busy,
  onClose,
  onSaveSingle,
  onSaveBatch,
}: GachaJsonEditorModalProps) {
  const [jsonText, setJsonText] = useState("");
  const [syntaxError, setSyntaxError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const [fallbackAnimeId, setFallbackAnimeId] = useState(defaultAnimeId);

  useEffect(() => {
    setFallbackAnimeId(defaultAnimeId);
  }, [defaultAnimeId]);

  useEffect(() => {
    if (!open) return;
    setSyntaxError(null);
    setActiveTab("editor");

    if (mode === "single" && targetCard) {
      const payload = {
        name: targetCard.name,
        rarity: targetCard.rarity,
        image: targetCard.image || "",
        imageHidden: targetCard.imageHidden,
        animeId: targetCard.animeId || defaultAnimeId || "",
        variantName: targetCard.variantName || "",
      };
      setJsonText(JSON.stringify(payload, null, 2));
    } else if (mode === "batch-edit" && targetCards.length > 0) {
      const payload: JsonCardItem[] = targetCards.map((c) => ({
        id: c.id,
        name: c.name,
        rarity: c.rarity,
        image: c.image || "",
        imageHidden: c.imageHidden,
        animeId: c.animeId || defaultAnimeId || "",
        variantName: c.variantName || "",
      }));
      setJsonText(JSON.stringify(payload, null, 2));
    } else {
      // batch-import
      const example: JsonCardItem[] = [
        {
          name: "Personagem Exemplo 1",
          rarity: "RARA",
          image: "https://exemplo.com/arte1.webp",
          imageHidden: false,
          animeId: defaultAnimeId || "",
        },
        {
          name: "Personagem Exemplo 2",
          rarity: "EPICA",
          image: "https://exemplo.com/arte2.webp",
          imageHidden: false,
          animeId: defaultAnimeId || "",
        },
      ];
      setJsonText(JSON.stringify(example, null, 2));
    }
  }, [open, mode, targetCard, targetCards, defaultAnimeId]);

  // Validar e parsear JSON em tempo real
  const parsedData = useMemo(() => {
    if (!jsonText.trim()) {
      return { valid: false, items: [], error: "O JSON está vazio." };
    }
    try {
      const parsed = JSON.parse(jsonText);
      if (mode === "single") {
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          return { valid: false, items: [], error: "O JSON da carta deve ser um objeto {...}." };
        }
        return { valid: true, items: [parsed as JsonCardItem], error: null };
      } else {
        if (!Array.isArray(parsed)) {
          return { valid: false, items: [], error: "Para lote, o JSON deve ser uma lista de cartas: [{...}, {...}]." };
        }
        return { valid: true, items: parsed as JsonCardItem[], error: null };
      }
    } catch (e) {
      return {
        valid: false,
        items: [],
        error: e instanceof Error ? e.message : "Sintaxe JSON inválida.",
      };
    }
  }, [jsonText, mode]);

  // Checar erros semânticos nos itens parseados
  const validationIssues = useMemo(() => {
    if (!parsedData.valid) return [];
    const issues: { index: number; name: string; error: string }[] = [];

    parsedData.items.forEach((item, index) => {
      if (!item.name?.trim()) {
        issues.push({ index, name: item.name || `#${index + 1}`, error: "Nome é obrigatório." });
      }
      if (!item.image?.trim()) {
        issues.push({ index, name: item.name || `#${index + 1}`, error: "URL da imagem é obrigatória." });
      } else if (!/^https:\/\//i.test(item.image.trim())) {
        issues.push({ index, name: item.name || `#${index + 1}`, error: "A URL da imagem deve usar HTTPS." });
      }
      if (!TIERS.includes(item.rarity as (typeof TIERS)[number])) {
        issues.push({
          index,
          name: item.name || `#${index + 1}`,
          error: `Raridade "${item.rarity}" é inválida. Use: ${TIERS.join(", ")}`,
        });
      }
      const animeId = item.animeId || fallbackAnimeId;
      if (!animeId?.trim()) {
        issues.push({ index, name: item.name || `#${index + 1}`, error: "Anime ID não foi informado." });
      }
    });

    return issues;
  }, [parsedData, fallbackAnimeId]);

  function handleFormatJson() {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setSyntaxError(null);
    } catch (e) {
      setSyntaxError(e instanceof Error ? e.message : "JSON inválido.");
    }
  }

  function handleInsertExample() {
    const example: JsonCardItem[] = [
      {
        name: "Personagem 1",
        rarity: "COMUM",
        image: "https://images.animesice.app/cards/p1.webp",
        imageHidden: false,
        animeId: defaultAnimeId || "",
      },
      {
        name: "Personagem 2",
        rarity: "RARA",
        image: "https://images.animesice.app/cards/p2.webp",
        imageHidden: false,
        animeId: defaultAnimeId || "",
      },
    ];
    setJsonText(JSON.stringify(example, null, 2));
    setSyntaxError(null);
  }

  async function handleSave() {
    if (!parsedData.valid || validationIssues.length > 0) return;

    if (mode === "single" && targetCard && onSaveSingle) {
      const item = parsedData.items[0];
      await onSaveSingle(targetCard.id, {
        name: item.name.trim(),
        image: item.image.trim(),
        imageHidden: item.imageHidden ?? false,
        rarity: item.rarity,
        animeId: item.animeId || fallbackAnimeId,
        variantName: item.variantName?.trim() || undefined,
      });
      onClose();
    } else if (onSaveBatch) {
      const normalizedItems: JsonCardItem[] = parsedData.items.map((item) => ({
        ...item,
        name: item.name.trim(),
        image: item.image.trim(),
        imageHidden: item.imageHidden ?? false,
        animeId: item.animeId || fallbackAnimeId,
        variantName: item.variantName?.trim() || undefined,
      }));
      await onSaveBatch(normalizedItems, mode === "batch-edit" ? "edit" : "import");
      onClose();
    }
  }

  if (!open) return null;

  const title =
    mode === "single"
      ? `Editar Carta via JSON: ${targetCard?.name || ""}`
      : mode === "batch-edit"
        ? `Editar ${targetCards.length} Cartas em Lote via JSON`
        : `Importar Cartas em Lote via JSON${animeTitle ? ` (${animeTitle})` : ""}`;

  return (
    <Modal
      open={open}
      size="wide"
      onClose={() => {
        if (!busy) onClose();
      }}
      title={title}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2 text-caption">
            {parsedData.valid && validationIssues.length === 0 ? (
              <span className="text-ice">
                ✓ {parsedData.items.length} carta(s) pronta(s) para {mode === "batch-edit" || mode === "single" ? "salvar" : "importar"}
              </span>
            ) : (
              <span className="text-signal">
                {parsedData.error || `${validationIssues.length} pendência(s) encontrada(s)`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
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
              className="btn-ice px-4 py-2 text-body-sm font-medium disabled:opacity-50"
              disabled={busy || !parsedData.valid || validationIssues.length > 0}
              onClick={() => void handleSave()}
            >
              {busy
                ? "Processando…"
                : mode === "single"
                  ? "Salvar Carta"
                  : mode === "batch-edit"
                    ? `Aplicar em ${parsedData.items.length} cartas`
                    : `Importar ${parsedData.items.length} cartas`}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Sub-header de controles */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={`px-3 py-1 text-caption font-medium border transition-colors ${
                activeTab === "editor"
                  ? "border-ice text-ice bg-ice/10"
                  : "border-hairline text-mist hover:text-snow"
              }`}
              onClick={() => setActiveTab("editor")}
            >
              Editor JSON
            </button>
            <button
              type="button"
              className={`px-3 py-1 text-caption font-medium border transition-colors ${
                activeTab === "preview"
                  ? "border-ice text-ice bg-ice/10"
                  : "border-hairline text-mist hover:text-snow"
              }`}
              onClick={() => setActiveTab("preview")}
            >
              Pré-visualização ({parsedData.items.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="admin-tab text-caption"
              onClick={handleFormatJson}
            >
              Formatar JSON
            </button>
            {mode === "batch-import" && (
              <button
                type="button"
                className="admin-tab text-caption"
                onClick={handleInsertExample}
              >
                Inserir Exemplo
              </button>
            )}
          </div>
        </div>

        {defaultAnimeId && (
          <p className="text-caption text-mist">
            Conjunto padrão: <strong className="text-snow">{animeTitle || defaultAnimeId}</strong>{" "}
            (cartas sem <code className="text-ice">animeId</code> no JSON herdarão este ID automaticamente).
          </p>
        )}

        {syntaxError && (
          <div
            role="alert"
            className="border border-signal/40 bg-signal/10 p-2 text-caption text-signal"
          >
            {syntaxError}
          </div>
        )}

        {/* Tab 1: Editor de Texto */}
        {activeTab === "editor" ? (
          <div className="space-y-2">
            <label htmlFor="json-textarea" className="sr-only">
              Código JSON
            </label>
            <textarea
              id="json-textarea"
              rows={16}
              className="field font-mono text-body-sm w-full bg-black/40 text-snow leading-relaxed resize-y focus:border-ice"
              placeholder={
                mode === "single"
                  ? '{\n  "name": "...",\n  "rarity": "RARA",\n  "image": "https://..."\n}'
                  : '[\n  {\n    "name": "...",\n    "rarity": "RARA",\n    "image": "https://..."\n  }\n]'
              }
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setSyntaxError(null);
              }}
              spellCheck={false}
            />
            <div className="flex flex-wrap items-center justify-between text-caption text-mist-soft">
              <span>Raridades válidas: {TIERS.join(", ")}</span>
              <span>Use HTTPS para todas as imagens</span>
            </div>
          </div>
        ) : (
          /* Tab 2: Pré-visualização das cartas parseadas */
          <div className="space-y-3">
            {parsedData.error ? (
              <div className="border border-signal/40 bg-signal/10 p-4 text-center text-body-sm text-signal">
                Erro de sintaxe JSON: {parsedData.error}
              </div>
            ) : parsedData.items.length === 0 ? (
              <p className="text-center text-body-sm text-mist py-8">
                Nenhuma carta no JSON para pré-visualizar.
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2 border border-hairline bg-panel p-2">
                {parsedData.items.map((item, idx) => {
                  const issue = validationIssues.find((i) => i.index === idx);
                  const rarityColor =
                    GACHA_RARITY_COLORS[item.rarity as keyof typeof GACHA_RARITY_COLORS] ||
                    "#38E8DA";

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 border p-2 transition-colors ${
                        issue
                          ? "border-signal/50 bg-signal/10"
                          : "border-hairline bg-black/20"
                      }`}
                    >
                      <div className="h-12 w-12 shrink-0 bg-black/40 border border-hairline overflow-hidden rounded flex items-center justify-center text-mist">
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          "?"
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-body-sm font-medium text-snow">
                            {item.name || "(Sem nome)"}
                          </span>
                          <span
                            className="shrink-0 text-caption font-semibold px-1.5 py-0.5 rounded border"
                            style={{
                              borderColor: `${rarityColor}66`,
                              color: rarityColor,
                              backgroundColor: `${rarityColor}1A`,
                            }}
                          >
                            {item.rarity || "SEM RARIDADE"}
                          </span>
                          {item.imageHidden && (
                            <span className="text-caption text-mist-soft bg-white/5 px-1 rounded">
                              Oculta (???)
                            </span>
                          )}
                        </div>
                        <p className="truncate text-caption text-mist font-mono mt-0.5">
                          {item.image || "(Sem imagem)"}
                        </p>
                        {issue && (
                          <p className="text-caption text-signal font-medium mt-1">
                            ⚠️ {issue.error}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
