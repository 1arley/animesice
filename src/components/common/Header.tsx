"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/common/Wordmark";
import { AuthButtons } from "@/components/common/AuthButtons";
import { NotificationBell } from "@/components/common/NotificationBell";

/**
 * Cabeçalho da prateleira: wordmark à esquerda, busca ao centro, auth à direita.
 */
export function Header() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    router.push(`/buscar?q=${encodeURIComponent(term)}`);
  }

  function onMobileSubmit(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    router.push(`/buscar?q=${encodeURIComponent(term)}`);
    setMobileSearchOpen(false);
    setQ("");
  }

  return (
    <header className="border-b border-hairline bg-ink">
      <div className="mx-auto flex max-w-shelf items-center justify-between gap-4 px-4 py-3">
        <Wordmark className="text-xl" />

        {/* Desktop search */}
        <form onSubmit={onSubmit} role="search" className="hidden flex-1 max-w-md sm:block">
          <label htmlFor="header-search" className="sr-only">
            Buscar animes
          </label>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist"
              width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
            >
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              id="header-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar título..."
              className="field pl-9"
              aria-label="Buscar animes"
            />
          </div>
        </form>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile search toggle */}
          <button
            type="button"
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="sm:hidden"
            aria-label="Buscar"
            aria-expanded={mobileSearchOpen}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-mist transition-colors hover:text-ice">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M14 14l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <NotificationBell />
          <AuthButtons />
        </div>
      </div>

      {/* Mobile search drawer */}
      {mobileSearchOpen && (
        <form onSubmit={onMobileSubmit} className="border-t border-hairline px-4 py-3 sm:hidden">
          <label htmlFor="header-search-mobile" className="sr-only">
            Buscar animes
          </label>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist"
              width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
            >
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              id="header-search-mobile"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar título..."
              className="field pl-9"
              autoFocus
              aria-label="Buscar animes"
            />
          </div>
        </form>
      )}
    </header>
  );
}
