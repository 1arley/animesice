"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { isPrivileged } from "@/lib/role";
import { displayName } from "@/lib/displayName";
import { Avatar } from "@/components/common/Avatar";

export interface NavLink {
  href: string;
  title: string;
  target?: string;
  icon: string;
}

export interface NavItem {
  title: string;
  links: NavLink[];
}

const GHOST_WINDOW_MS = 350;

function NavIcon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICONS: Record<string, string> = {
  home: "M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9",
  top: "M5 16V5M5 5l2.5 2.5M5 5 2.5 7.5M12 19V9M12 9l2.5 2.5M12 9l-2.5 2.5M19 16V5M19 5l2.5 2.5M19 5l-2.5 2.5",
  lancamentos: "M4 4v16M4 4h12l-3 5 3 6H4M8 2v3M16 2v3",
  calendario: "M4 8h16M6 4v3M18 4v3M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z",
  aleatorio: "M7 4v3M7 17v3M4 7h3M4 17h3M17 4v3M17 17v3M14 7h3M14 17h3M9 10h.01M15 10h.01M9 14c1 1 5 1 6 0",
  filmes: "M3 5h18v14H3zM3 9h4v2H3zM3 12h4v2H3zM17 9h4v2h-4zM17 12h4v2h-4zM3 14h18M3 7h18",
  admin: "M12 3 4 7v6c0 4 3 7 8 8 5-1 8-4 8-8V7l-8-4ZM9 12l2 2 4-4",
  feed: "M4 6h16M4 12h16M4 18h10M16 18h4M18 16v4",
  usuarios: "M9 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c1-3 3.5-4.5 7-4.5s6 1.5 7 4.5M16 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM15 14c2.5.5 4.5 2.5 5 6",
  pedidos: "M4 6h12v12H4zM16 10h3l1 2v6h-4M7 10h6M7 14h4",
  sugestoes: "M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6L12 2z",
  regras: "M4 6h16M4 12h16M4 18h10M5 3h6v4H5zM13 3h6v4h-6zM5 15h6v4H5zM13 15h2v4h-2z",
  config: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19",
  biblioteca: "M5 4h4v16H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM11 4h4v16h-4zM17 4h1a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-1z",
  login: "M15 12H3M11 8l-4 4 4 4M11 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6",
  register: "M12 5v14M5 12h14M9 12a6 6 0 1 0 12 0 6 6 0 0 0-12 0z",
};

export function SiteNav() {
  const { user } = useAuth();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const navRef = useRef<HTMLDivElement | null>(null);
  const openingAt = useRef(0);
  const pathname = usePathname();

  const contaLinks: NavLink[] = user
    ? [
        { href: "/settings", title: "Configurações", icon: "config" },
        { href: "/biblioteca", title: "Minha biblioteca", icon: "biblioteca" },
      ]
    : [
        { href: "/biblioteca", title: "Minha biblioteca", icon: "biblioteca" },
        { href: "/login", title: "Entrar", icon: "login" },
        { href: "/register", title: "Registrar", icon: "register" },
      ];

  const navItems: NavItem[] = [
    {
      title: "Animes",
      links: [
        { href: "/", title: "Início", icon: "home" },
        { href: "/top", title: "Top Animes", icon: "top" },
        { href: "/lancamentos", title: "Em lançamento", icon: "lancamentos" },
        { href: "/calendario", title: "Calendário", icon: "calendario" },
        { href: "/aleatorio", title: "Aleatório", icon: "aleatorio" },
        { href: "/buscar?format=MOVIE", title: "Filmes", icon: "filmes" },
        ...(isPrivileged(user)
          ? [{ href: "/admin", title: "Painel admin", icon: "admin" }]
          : []),
      ],
    },
    {
      title: "Comunidade",
      links: [
        { href: "/comunidade/feed", title: "Feed", icon: "feed" },
        { href: "/comunidade/usuarios", title: "Usuários", icon: "usuarios" },
        { href: "/blog", title: "Blog", icon: "feed" },
        { href: "/comunidade/pedidos", title: "Pedidos de anime", icon: "pedidos" },
        { href: "/comunidade/sugestoes", title: "Sugestões e bugs", icon: "sugestoes" },
        { href: "/comunidade/regras", title: "Regras", icon: "regras" },
      ],
    },
    {
      title: "Conta",
      links: contaLinks,
    },
  ];

  // Janela pós-abertura em que o iOS ainda pode entregar um clique sintético
  // (ghost click) do tap que abriu o drawer sobre o backdrop, fechando o menu
  // imediatamente. Ignora qualquer fechamento dentro desta janela.
  const closeMobile = useCallback((opts?: { force?: boolean }) => {
    // Ghost click do iOS: um tap que abre o drawer pode ainda sintetizar um
    // clique sobre o backdrop dentro de ~350ms, fechando o menu que acabou de
    // abrir. Ignora fechamento dentro da janela — exceto `force` (Escape e
    // troca de rota nunca são ghost clicks).
    if (!opts?.force && Date.now() - openingAt.current < GHOST_WINDOW_MS) return;
    setClosing(true);
    setTimeout(() => {
      setMobileOpen(false);
      setClosing(false);
    }, 200);
  }, []);

  function openMobile() {
    openingAt.current = Date.now();
    setMobileOpen(true);
  }

  // Wrapper para onClick (backdrop/links): closeMobile é chamado sem o evento
  // (o primeiro arg de closeMobile é o `opts`, não o MouseEvent do React).
  const handleClose = () => closeMobile();

  // Lock body scroll when sheet open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenGroup(null);
        if (mobileOpen) closeMobile({ force: true });
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen, closeMobile]);

  // Close drawer on route change — só quando o pathname muda de verdade.
  // Se `mobileOpen` entrasse nas deps, o efeito dispararia no próprio
  // momento de abrir o drawer (setMobileOpen(true)), fechando-o em seguida
  // e "piscando" o menu no mobile.
  const prevPathname = useRef(pathname);
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      if (mobileOpen) closeMobile({ force: true });
    }
  }, [pathname, mobileOpen, closeMobile]);

  return (
    <nav
      ref={navRef as React.Ref<HTMLElement>}
      className="border-b border-hairline bg-ink"
      aria-label="Navegação principal"
    >
      {/* ===== Desktop ===== */}
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

      {/* ===== Mobile: "Mais" button ===== */}
      <div className="mx-auto flex max-w-shelf items-center justify-end px-4 sm:hidden">
        <button
          type="button"
          onClick={openMobile}
          className="flex items-center gap-1.5 py-2 font-mono text-caption uppercase tracking-wider text-mist transition-colors hover:text-ice [touch-action:manipulation]"
          aria-label="Abrir menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-mist">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Mais
        </button>
      </div>

      {/* ===== Mobile: Bottom sheet drawer ===== */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[90] sm:hidden">
          {/* Backdrop */}
          <div
            className={`nav-backdrop absolute inset-0 bg-black/60 backdrop-blur-sm [touch-action:manipulation] ${closing ? "closing" : ""}`}
            onClick={handleClose}
          />
          {/* Sheet */}
          <div
            className={`nav-sheet absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto border-t border-hairline bg-ink [touch-action:pan-y] ${closing ? "closing" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-hairline" />
            </div>

            {/* User row */}
            {user ? (
              <Link
                href="/settings"
                onClick={handleClose}
                className="mx-4 mb-4 flex items-center gap-3 border-b border-hairline pb-4"
              >
                <Avatar name={displayName(user)} src={user.avatar} size={40} />
                <div className="min-w-0">
                  <p className="truncate font-display text-body-sm font-medium text-ice">
                    {displayName(user)}
                  </p>
                  <p className="font-mono text-caption text-mist">Ver perfil</p>
                </div>
              </Link>
            ) : (
              <div className="mx-4 mb-4 flex gap-2 border-b border-hairline pb-4">
                <Link href="/login" onClick={handleClose} className="btn-ghost flex-1">
                  Entrar
                </Link>
                <Link href="/register" onClick={handleClose} className="btn-ice flex-1">
                  Cadastrar
                </Link>
              </div>
            )}

            {/* Nav groups */}
            <div className="px-4 pb-6">
              {navItems.map((group) => (
                <div key={group.title} className="mb-5">
                  <h2 className="mb-2 font-mono text-caption uppercase tracking-wider text-mist">
                    {group.title}
                  </h2>
                  <div className="grid grid-cols-3 gap-2">
                    {group.links.map((link) => {
                      const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href.split("?")[0]);
                      return (
                        <Link
                          key={link.href + link.title}
                          href={link.href}
                          onClick={handleClose}
                          className={`flex flex-col items-center gap-1.5 rounded-md border p-3 transition-colors ${
                            isActive
                              ? "border-ice/40 bg-ice/5 text-ice"
                              : "border-hairline text-mist hover:border-ice/30 hover:text-ice"
                          }`}
                        >
                          <NavIcon d={ICONS[link.icon] || ""} />
                          <span className="font-mono text-[0.6rem] uppercase tracking-wider text-center leading-tight">
                            {link.title}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
