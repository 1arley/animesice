"use client";

import React, { useEffect, useRef, useState } from "react";

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const handler = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("keydown", handler);
      // focus first input inside the modal
      setTimeout(() => {
        const el = dialogRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select, button");
        el?.focus();
      }, 20);
      return () => document.removeEventListener("keydown", handler);
    } else {
      setMounted(false);
    }
  }, [open, onClose]);

  if (!open && !mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        ref={dialogRef}
        className="relative z-10 w-full max-w-md bg-panel border border-hairline p-6 rounded transition-opacity duration-200"
        style={{ animation: open ? "fadeIn 160ms" : "fadeOut 120ms" }}
      >
        {title && <h3 className="font-display text-lg text-ice mb-3">{title}</h3>}
        <div>{children}</div>
        <div className="mt-4 flex justify-end gap-2">
          {footer ?? (
            <button onClick={onClose} className="btn-ghost">
              Fechar
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: translateY(0) } } @keyframes fadeOut { from { opacity: 1; transform: translateY(0) } to { opacity: 0; transform: translateY(-6px) } }`}</style>
    </div>
  );
}
