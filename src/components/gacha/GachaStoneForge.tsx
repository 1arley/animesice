"use client";

import { useEffect, useRef, useState } from "react";
import type { GachaItemKind } from "@/types";

type StoneKind = Exclude<GachaItemKind, "PROTECAO">;

const STONE_LABELS: Record<StoneKind, string> = {
  TITANITA: "Titanita",
  TITANITA_SOMBRIA: "Titanita Sombria",
  DRACONICA: "Magnetita",
  SOMBRIA_DRACONICA: "Magnetita Sombria",
};

export function GachaStoneForge({
  kind,
  result,
  error,
  canDismiss,
  onDismiss,
}: {
  kind: StoneKind;
  result?: { kind: StoneKind; quantity: number };
  error?: string;
  canDismiss?: boolean;
  onDismiss: () => void;
}) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [phase, setPhase] = useState("A energia reúne os fragmentos…");
  const [complete, setComplete] = useState(false);
  const [visualError, setVisualError] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
    titleRef.current?.focus();
    let cancelled = false;
    let forja: { tocar: () => Promise<void>; destruir: () => void } | undefined;
    const container = sceneRef.current;
    if (!container) return;

    import("../../../forja/forja.js")
      .then(({ criarForja }) =>
        cancelled
          ? null
          : criarForja(container, {
              imagem: "/forja/titanita.png",
              cor: {
                TITANITA: "#2ef2ad",
                TITANITA_SOMBRIA: "#a98bff",
                DRACONICA: "#8cd8ff",
                SOMBRIA_DRACONICA: "#e083ff",
              }[kind],
              fundo: null,
              autoplay: false,
              aoImpactar: () => setPhase("A pedra toma forma…"),
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
      if (dialogRef.current?.open) dialogRef.current.close();
    };
  }, [kind]);

  const settled = complete && (result || error);

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        if (settled && canDismiss) onDismiss();
      }}
      className="fixed inset-0 z-[100] m-0 grid max-h-none max-w-none place-items-center overflow-y-auto border-0 bg-[#050a0d]/95 p-3 text-snow backdrop:bg-transparent backdrop:backdrop-blur-sm sm:p-6"
      aria-labelledby="stone-forge-title"
      aria-describedby="stone-forge-status"
    >
      <section className="relative isolate flex min-h-[min(82dvh,42rem)] w-full max-w-3xl flex-col items-center justify-end overflow-hidden border border-ice/30 bg-[#070b0e] px-5 pb-8 pt-12 shadow-[0_0_70px_rgba(46,242,173,0.12)] sm:px-10">
        <div ref={sceneRef} className="absolute inset-0 -z-10" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#070b0e] via-[#070b0e]/75 to-transparent" />
        <h2
          id="stone-forge-title"
          ref={titleRef}
          tabIndex={-1}
          className="text-center font-display text-2xl text-snow drop-shadow-[0_0_16px_rgba(46,242,173,0.65)] sm:text-3xl"
        >
          Forja de pedras
        </h2>
        <p
          id="stone-forge-status"
          className="mt-3 min-h-6 text-center text-sm text-mist"
          aria-live="polite"
        >
          {settled && result
            ? `${result.quantity} ${STONE_LABELS[result.kind]}${result.quantity === 1 ? " fabricada" : " fabricadas"}.`
            : settled && error
              ? `Não foi possível confirmar a fabricação: ${error}`
              : visualError
                ? "A animação não pôde ser carregada. A fabricação continua em segurança."
                : complete
                  ? "Aguardando confirmação da fabricação…"
                  : phase}
        </p>
        {settled && canDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="btn-ice mt-5 min-h-11 min-w-36 px-5"
          >
            {error ? "Fechar" : "Continuar"}
          </button>
        )}
      </section>
    </dialog>
  );
}
