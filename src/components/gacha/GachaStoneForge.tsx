"use client";

import { useEffect, useRef, useState } from "react";
import type { GachaStoneItemKind } from "@/types";
import { resolveStoneForgeVariant } from "../../../forja/stone-forge-variants.mjs";

type StoneKind = GachaStoneItemKind;

const STONE_LABELS: Record<StoneKind, string> = {
  TITANITA: "Titanita",
  TITANITA_SOMBRIA: "Titanita Sombria",
  DRACONICA: "Magnetita",
  SOMBRIA_DRACONICA: "Magnetita Sombria",
};

function stoneLabel(kind: string) {
  return Object.prototype.hasOwnProperty.call(STONE_LABELS, kind)
    ? STONE_LABELS[kind as StoneKind]
    : "Pedra";
}

export function GachaStoneForge({
  result,
  canDismiss,
  onDismiss,
}: {
  result?: { kind: StoneKind; quantity: number };
  canDismiss?: boolean;
  onDismiss: () => void;
}) {
  const resultKind = result?.kind;
  const variant = resolveStoneForgeVariant(resultKind ?? "");
  const sceneRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [phase, setPhase] = useState("Aguardando confirmação da fabricação…");
  const [complete, setComplete] = useState(false);
  const [visualError, setVisualError] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    titleRef.current?.focus();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    if (!resultKind) return;
    const label = stoneLabel(resultKind);
    setPhase(`A energia reúne os fragmentos de ${label.toLowerCase()}…`);
    let cancelled = false;
    let forja: { tocar: () => Promise<void>; destruir: () => void } | undefined;
    const container = sceneRef.current;
    if (!container) return;

    import("../../../forja/forja.js")
      .then(({ criarForja }) =>
        cancelled
          ? null
          : criarForja(container, {
              tipo: resultKind,
              fundo: null,
              autoplay: false,
              aoImpactar: () => setPhase(`${label} toma forma…`),
            }),
      )
      .then((instance) => {
        if (!instance) return;
        if (cancelled) {
          instance.destruir();
          return;
        }
        forja = instance;
        return instance.tocar().then(() => setComplete(true));
      })
      .catch(() => {
        setVisualError(true);
        setComplete(true);
      });

    return () => {
      cancelled = true;
      forja?.destruir();
    };
  }, [resultKind]);

  const resultLabel = result ? stoneLabel(result.kind) : "Pedra";
  const statusMessage = !result
    ? "Aguardando confirmação da fabricação…"
    : complete
      ? `${result.quantity} ${resultLabel}${result.quantity === 1 ? " fabricada" : " fabricadas"}.${visualError ? " A cena da forja não pôde ser exibida." : ""}`
      : visualError
        ? "A cena da forja não pôde ser exibida."
        : phase;

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        if (result && complete && canDismiss) onDismiss();
      }}
      className="fixed inset-0 z-[100] m-0 grid max-h-none max-w-none place-items-center overflow-y-auto border-0 bg-[#050a0d]/95 p-0 text-snow backdrop:bg-transparent backdrop:backdrop-blur-sm"
      aria-labelledby="stone-forge-title"
      aria-describedby="stone-forge-status"
    >
      <section
        className="relative isolate flex min-h-[88dvh] w-full max-w-6xl flex-col items-center justify-end overflow-hidden border border-ice/30 px-5 pb-8 pt-12 shadow-[0_0_70px_rgba(46,242,173,0.12)] sm:min-h-[90dvh] sm:px-10"
        style={{ backgroundColor: variant.atmosphere }}
      >
        <div ref={sceneRef} className="absolute inset-0 -z-10" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
          style={{ backgroundImage: `linear-gradient(to top, ${variant.atmosphere}, ${variant.atmosphere}cc 55%, transparent)` }}
        />
        <h2
          id="stone-forge-title"
          ref={titleRef}
          tabIndex={-1}
          className="text-center font-display text-2xl text-snow sm:text-3xl"
          style={{ textShadow: `0 0 16px ${variant.energy}` }}
        >
          Forja de pedras
        </h2>
        <p
          id="stone-forge-status"
          className="mt-3 min-h-6 text-center text-sm text-mist"
          aria-live="polite"
        >
          {statusMessage}
        </p>
        {result && complete && canDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="btn-ice mt-5 min-h-11 min-w-36 px-5"
          >
            Continuar
          </button>
        )}
      </section>
    </dialog>
  );
}
