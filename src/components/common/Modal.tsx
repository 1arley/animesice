"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

const FOCUSABLE = "input:not([disabled]):not([type='hidden']), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])";

export function Modal({ open, onClose, title, children, footer, size = "default" }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; footer?: React.ReactNode; size?: "default" | "wide" }) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const timer = window.setTimeout(() => setMounted(false), 120);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const getFocusableElements = useCallback(() => {
    if (!dialogRef.current) return [];
    return Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusableElements();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, getFocusableElements]);

  useEffect(() => {
    if (!open || !mounted) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }, 20);
    return () => {
      window.clearTimeout(timer);
      previouslyFocused?.focus();
    };
  }, [open, mounted]);

  if (!open && !mounted) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center px-0 pt-8 sm:items-center sm:px-4 sm:py-6">
      <div
        className="absolute inset-0 bg-black/50"
        role="button"
        aria-label="Fechar"
        tabIndex={-1}
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClose();
          }
        }}
      />
      <div role="dialog" aria-modal="true" aria-label={title ?? "Diálogo"} ref={dialogRef} style={{ maxWidth: size === "wide" ? "64rem" : undefined, animation: open ? "fadeIn 160ms" : "fadeOut 120ms" }} className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain border border-hairline bg-panel p-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-opacity duration-200 sm:rounded sm:p-6">
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
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } } @keyframes fadeOut { from { opacity: 1; transform: translateY(0) } to { opacity: 0; transform: translateY(8px) } } @media (prefers-reduced-motion: reduce) { [role="dialog"] { animation: none !important; } }`}</style>
    </div>
  );
}
