"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/common/Wordmark";
import { AuthButtons } from "@/components/common/AuthButtons";

/**
 * Cabeçalho da prateleira: wordmark à esquerda, busca ao centro, auth à direita.
 */
export function Header() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    router.push(`/buscar?q=${encodeURIComponent(term)}`);
  }

  return (
    <header className="border-b border-hairline bg-ink">
      <div className="mx-auto flex max-w-shelf items-center justify-between gap-4 px-4 py-3">
        <Wordmark className="text-xl" />

        <form onSubmit={onSubmit} role="search" className="flex-1 max-w-md">
          <label htmlFor="header-search" className="sr-only">
            Buscar animes
          </label>
          <input
            id="header-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar título..."
            className="field"
            aria-label="Buscar animes"
          />
        </form>

        <AuthButtons />
      </div>
    </header>
  );
}
