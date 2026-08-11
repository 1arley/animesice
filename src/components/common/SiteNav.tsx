"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { isPrivileged } from "@/lib/role";
import { displayName } from "@/lib/displayName";
import { Avatar } from "@/components/common/Avatar";

export interface NavLink {
  href: string;
  title: string;
  target?: string;
}

export interface NavItem {
  title: string;
  links: NavLink[];
}

export function SiteNav() {
  const { user } = useAuth();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  const contaLinks: NavLink[] = user
    ? [
        { href: "/settings", title: "Configurações" },
        { href: "/biblioteca", title: "Minha biblioteca" },
      ]
    : [
        { href: "/biblioteca", title: "Minha biblioteca" },
        { href: "/login", title: "Entrar" },
        { href: "/register", title: "Registrar" },
      ];

  const navItems: NavItem[] = [
    {
      title: "Animes",
      links: [
        { href: "/", title: "Início" },
        { href: "/top", title: "Top Animes" },
        { href: "/lancamentos", title: "Em lançamento" },
        { href: "/calendario", title: "Calendário" },
        { href: "/aleatorio", title: "Aleatório" },
        { href: "/buscar?format=MOVIE", title: "Filmes" },
        ...(isPrivileged(user)
          ? [{ href: "/admin", title: "Painel admin" }]
          : []),
      ],
    },
    {
      title: "Comunidade",
      links: [
        { href: "/pedidos", title: "Pedidos de anime" },
        { href: "/sugestoes", title: "Sugestões e bugs" },
        { href: "/regras", title: "Regras" },
      ],
    },
    {
      title: "Conta",
      links: contaLinks,
    },
  ];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
        setMobileOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenGroup(null);
        setMobileOpen(false);
      }
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
      {/* Desktop nav */}
      <div className="mx-auto hidden max-w-shelf items-stretch gap-1 px-4 sm:flex">
        {navItems.map((item) => {
          const isOpen = openGroup === item.title;
          return (
            <div key={item.title} className="relative">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-haspopup="true"
                onClick={() => setOpenGroup(isOpen ? null : item.title)}
                className="flex items-center gap-1.5 border-x border-transparent px-3 py-3 font-mono text-body-sm uppercase tracking-wider text-mist transition-colors hover:text-ice data-[open=true]:border-x-hairline data-[open=true]:bg-panel data-[open=true]:text-ice"
                data-open={isOpen}
              >
                {item.title}
                <svg
                  width="10" height="10" viewBox="0 0 10 10" fill="none"
                  aria-hidden="true"
                  className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                >
                  <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {isOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-full z-50 min-w-40 border border-hairline bg-panel py-1 shadow-lg shadow-black/40"
                >
                  {item.links.map((link) => (
                    <a
                      key={link.href + link.title}
                      href={link.href}
                      target={link.target || "_self"}
                      rel={link.target === "_blank" ? "noopener noreferrer" : undefined}
                      role="menuitem"
                      className="block border-l-2 border-transparent px-4 py-2 font-mono text-body-sm text-mist transition-colors hover:border-ice hover:bg-slate hover:text-ice"
                    >
                      {link.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {user && (
          <a
            href="/settings"
            className="ml-auto flex items-center gap-2 px-3 py-3 font-mono text-body-sm uppercase tracking-wider text-mist transition-colors hover:text-ice"
          >
            <Avatar name={displayName(user)} src={user.avatar} size={24} />
            <span className="max-w-40 truncate normal-case">
              {displayName(user)}
            </span>
          </a>
        )}
      </div>

      {/* Mobile nav toggle */}
      <div className="mx-auto flex max-w-shelf items-center px-4 sm:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center gap-2 py-3 font-mono text-body-sm uppercase tracking-wider text-mist transition-colors hover:text-ice"
          aria-expanded={mobileOpen}
          aria-label="Menu de navegação"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-mist">
            {mobileOpen ? (
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            ) : (
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            )}
          </svg>
          Navegação
        </button>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="border-t border-hairline px-4 py-3 sm:hidden">
          {user && (
            <a
              href="/settings"
              onClick={() => setMobileOpen(false)}
              className="mb-4 flex items-center gap-3 border-b border-hairline pb-4"
            >
              <Avatar name={displayName(user)} src={user.avatar} size={32} />
              <span className="font-sans text-body-sm font-medium text-ice">
                {displayName(user)}
              </span>
            </a>
          )}
          {navItems.map((item) => (
            <div key={item.title} className="mb-3">
              <h2 className="mb-1.5 font-mono text-caption uppercase tracking-wider text-mist">
                {item.title}
              </h2>
              <ul className="space-y-0.5">
                {item.links.map((link) => (
                  <li key={link.href + link.title}>
                    <a
                      href={link.href}
                      target={link.target || "_self"}
                      rel={link.target === "_blank" ? "noopener noreferrer" : undefined}
                      className="block py-1.5 font-mono text-body-sm text-mist transition-colors hover:text-ice"
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}
