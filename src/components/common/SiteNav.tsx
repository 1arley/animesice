"use client";

import { useEffect, useRef, useState } from "react";

export interface NavLink {
  href: string;
  title: string;
  target?: string;
}

export interface NavItem {
  title: string;
  links: NavLink[];
}

// Links internos. Rotas de gênero/temporada ainda não implementadas (#) —
// melhor que apontar para um domínio externo inexistente.
const navItems: NavItem[] = [
  {
    title: "Animes",
    links: [
      { href: "/", title: "Início" },
      { href: "/admin", title: "Painel admin" },
    ],
  },
  {
    title: "Conta",
    links: [
      { href: "/login", title: "Entrar" },
      { href: "/register", title: "Registrar" },
      {
        href: "https://myanimelist.net",
        title: "Calendário (MAL)",
        target: "_blank",
      },
    ],
  },
];

export function SiteNav() {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  // Fecha o dropdown ao clicar fora ou ao Esc — floor de qualidade.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenGroup(null);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <nav
      ref={navRef}
      className="border-b border-hairline bg-ink"
      aria-label="Navegação principal"
    >
      <div className="mx-auto flex max-w-shelf items-stretch gap-1 px-4">
        {navItems.map((item) => {
          const isOpen = openGroup === item.title;
          return (
            <div key={item.title} className="relative">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-haspopup="true"
                onClick={() => setOpenGroup(isOpen ? null : item.title)}
                className="flex items-center gap-1.5 px-3 py-3 text-body-sm font-medium text-mist transition-colors hover:text-ice data-[open=true]:text-ice"
                data-open={isOpen}
              >
                {item.title}
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  aria-hidden="true"
                  className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                >
                  <path
                    d="M2 3.5L5 6.5L8 3.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {isOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-full z-50 min-w-40 border border-hairline bg-panel py-1"
                >
                  {item.links.map((link) => (
                    <a
                      key={link.href + link.title}
                      href={link.href}
                      target={link.target || "_self"}
                      rel={link.target === "_blank" ? "noopener noreferrer" : undefined}
                      role="menuitem"
                      className="block px-4 py-2 text-body-sm text-mist transition-colors hover:bg-ink hover:text-ice"
                    >
                      {link.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
