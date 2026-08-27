"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "animesice:service-notice:2026-08-21";

export function ServiceNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "dismissed") setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "dismissed");
    } catch {
      // The notice can still be dismissed for the current render.
    }
  };

  return (
    <aside
      role="status"
      aria-label="Aviso sobre a estabilidade do site"
      className="relative z-[80] border-b border-ice/25 bg-ice/10 text-snow"
    >
      <div className="mx-auto flex max-w-shelf items-start gap-3 px-4 py-2.5 sm:items-center sm:py-2">
        <span
          aria-hidden="true"
          className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-ice shadow-[0_0_10px_rgba(125,211,252,0.8)] sm:mt-0"
        />
        <p className="min-w-0 flex-1 font-sans text-caption leading-relaxed text-mist sm:text-body-sm">
          <strong className="mr-2 font-mono text-caption uppercase tracking-[0.14em] text-ice">
            Aviso de serviço
          </strong>
          Pedimos desculpas pela instabilidade temporária. O sinal foi
          estabilizado e seguimos monitorando o site.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-mist transition-colors hover:text-snow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ice"
          aria-label="Fechar aviso"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 3l10 10M13 3 3 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </aside>
  );
}
