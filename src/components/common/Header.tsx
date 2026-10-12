"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/common/Wordmark";
import { AuthButtons } from "@/components/common/AuthButtons";
import { NotificationBell } from "@/components/common/NotificationBell";
import { SupportLink } from "@/components/common/SupportLink";
import { DiscordIcon, DISCORD_INVITE_URL } from "@/components/common/DiscordIcon";
import { SearchField } from "@/components/ui/SearchField";

/**
 * Cabeçalho da prateleira: wordmark à esquerda, busca ao centro,
 * auth à direita.
 */
export function Header() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Close mobile search drawer on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileSearchOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileSearchOpen]);

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
    <header className="relative z-50 border-b border-hairline bg-ink">
      <div className="mx-auto flex max-w-shelf items-center justify-between gap-1 px-4 py-3 sm:gap-4">
        <Wordmark className="text-xl" />

        {/* Desktop search */}
        <form
          onSubmit={onSubmit}
          role="search"
          className="hidden flex-1 max-w-md sm:block"
        >
          <label htmlFor="header-search" className="sr-only">
            Buscar animes
          </label>
          <SearchField
            id="header-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar título..."
            aria-label="Buscar animes"
          />
        </form>

        <div className="flex items-center gap-1 sm:gap-3">
          {/* Mobile search toggle */}
          <button
            type="button"
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="flex h-11 w-11 items-center justify-center sm:hidden"
            aria-label="Buscar"
            aria-expanded={mobileSearchOpen}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-mist transition-colors hover:text-ice">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M14 14l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Entrar no Discord AnimeSice (abre em uma nova aba)"
            title="Entrar no Discord AnimeSice (abre em uma nova aba)"
            className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-sm px-1.5 font-mono text-body-sm text-mist transition-colors duration-200 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
          >
            <DiscordIcon size={18} />
            <span className="hidden md:inline" translate="no">Discord</span>
          </a>
          {/* LivePix: só desktop no header — no mobile fica no footer */}
          <div className="hidden sm:block">
            <SupportLink variant="header" />
          </div>
          <NotificationBell />
          {/* Auth some da linha no mobile: fica no menu do SiteNav / tab bar */}
          <div className="hidden sm:contents">
            <AuthButtons />
          </div>
        </div>
      </div>

      {/* Mobile search drawer */}
      {mobileSearchOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[89] bg-black/40 opacity-50 transition-opacity duration-200"
            role="button"
            aria-label="Fechar busca"
            tabIndex={-1}
            onClick={() => setMobileSearchOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setMobileSearchOpen(false);
              }
            }}
          />
          <form
            onSubmit={onMobileSubmit}
            className="relative z-[90] border-t border-hairline bg-ink px-4 py-3 sm:hidden"
          >
            <label htmlFor="header-search-mobile" className="sr-only">
              Buscar animes
            </label>
            <SearchField
              id="header-search-mobile"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar título..."
              autoFocus
              aria-label="Buscar animes"
            />
          </form>
        </>
      )}
    </header>
  );
}
