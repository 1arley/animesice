"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/common/Avatar";
import { displayName } from "@/lib/displayName";

function Glyph({ d, active }: { d: string; active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={d}
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function haptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(8);
  }
}

export function MobileTabBar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const tabs = [
    {
      href: "/",
      label: "Início",
      match: (p: string) => p === "/",
      icon: (active: boolean) => (
        <Glyph active={active} d="M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9" />
      ),
    },
    {
      href: "/buscar",
      label: "Buscar",
      match: (p: string) => p.startsWith("/buscar"),
      icon: (active: boolean) => (
        <Glyph active={active} d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4.35-4.35" />
      ),
    },
    {
      href: "/calendario",
      label: "Agenda",
      match: (p: string) => p.startsWith("/calendario"),
      icon: (active: boolean) => (
        <Glyph active={active} d="M4 8h16M6 4v3M18 4v3M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
      ),
    },
    {
      href: "/biblioteca",
      label: "Biblioteca",
      match: (p: string) => p.startsWith("/biblioteca"),
      icon: (active: boolean) => (
        <Glyph active={active} d="M5 4h4v16H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM11 4h4v16h-4zM17 4h1a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-1z" />
      ),
    },
  ];

  const profileHref = user ? "/settings" : "/login";
  const profileActive =
    pathname.startsWith("/settings") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/me");

  const allItems = [...tabs, { href: profileHref, label: user ? "Perfil" : "Entrar", match: () => profileActive, icon: null }];
  const activeIndex = allItems.findIndex((t) => t.match(pathname));

  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-ink/95 backdrop-blur-sm sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative grid grid-cols-5">
        {/* Active indicator bar */}
        {activeIndex >= 0 && (
          <div
            className="tab-active-bar"
            style={{
              left: `${(activeIndex / 5) * 100 + 3}%`,
              width: `${100 / 5 - 6}%`,
            }}
          />
        )}

        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              onClick={haptic}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5 font-mono text-[0.6rem] uppercase tracking-wider transition-colors active:scale-95 ${
                active ? "text-ice" : "text-mist"
              }`}
            >
              {tab.icon(active)}
              {tab.label}
            </Link>
          );
        })}

        <Link
          href={profileHref}
          aria-current={profileActive ? "page" : undefined}
          onClick={haptic}
          className={`flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5 font-mono text-[0.6rem] uppercase tracking-wider transition-colors active:scale-95 ${
            profileActive ? "text-ice" : "text-mist"
          }`}
        >
          {user ? (
            <Avatar name={displayName(user)} src={user.avatar} size={20} />
          ) : (
            <Glyph
              active={profileActive}
              d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20c1.5-3.5 4.7-5.5 8-5.5s6.5 2 8 5.5"
            />
          )}
          {user ? "Perfil" : "Entrar"}
        </Link>
      </div>
    </nav>
  );
}
